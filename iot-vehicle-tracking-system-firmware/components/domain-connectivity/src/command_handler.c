#include "command_handler.h"

#include <ctype.h>
#include <errno.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>

#include "cJSON.h"

#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"

#include "esp_log.h"

#include "nvs_config.h"
#include "util.h"

/**
 * @file command_handler.c
 * @brief Parse command payloads from cloud and expose consumable runtime actions.
 */

static const char *TAG = "COMMAND_HANDLER";
static const TickType_t COMMAND_HANDLER_LOCK_TIMEOUT_TICKS = pdMS_TO_TICKS(250);
static const TickType_t COMMAND_HANDLER_QUEUE_SEND_TIMEOUT_TICKS = pdMS_TO_TICKS(100);

#define COMMAND_HANDLER_ACTION_QUEUE_LEN 16U
#define COMMAND_HANDLER_MAX_LOCATION_REQUESTS 255U
#define COMMAND_HANDLER_U16_RULE_COUNT 7U
#define COMMAND_HANDLER_BOOL_RULE_COUNT 2U

/* Mutable runtime config pointer shared with state machine. */
static config_t *s_config = NULL;
static SemaphoreHandle_t s_lock = NULL;
static QueueHandle_t s_action_queue = NULL;
/* Tracking enable flag set by `enable_tracking` command. */
static bool s_tracking_enabled = true;
/* Counts queued one-shot location requests so bursts are not collapsed into one bit. */
static uint8_t s_location_request_count = 0U;
/* Tracks command drops without expanding the cloud command contract. */
static uint32_t s_dropped_command_count = 0U;

/** @brief Canonical command names from cloud payload. */
static const char *const COMMAND_NAME_UPDATE_CONFIG = "update_config";
static const char *const COMMAND_NAME_REQUEST_LOCATION = "request_location";
static const char *const COMMAND_NAME_ENABLE_TRACKING = "enable_tracking";
static const char *const COMMAND_NAME_REBOOT = "reboot";
static const char *const COMMAND_NAME_OTA_UPDATE = "ota_update";
static const char *const COMMAND_NAME_MANUAL_ROLLBACK = "manual_rollback";
static const char *const COMMAND_NAME_OTA_ROLLBACK = "ota_rollback";

/**
 * @brief Numeric update rule mapping JSON key to bounded `config_t` uint16 field.
 */
typedef struct {
    const char *field_name;
    size_t field_offset;
    uint16_t min_value;
    uint16_t max_value;
} command_u16_update_rule_t;

/**
 * @brief Boolean update rule mapping JSON key to `config_t` bool field.
 */
typedef struct {
    const char *field_name;
    size_t field_offset;
} command_bool_update_rule_t;

typedef struct {
    /** Parsed bounded uint16 config values, indexed by `s_update_u16_rules`. */
    uint16_t u16_values[COMMAND_HANDLER_U16_RULE_COUNT];
    /** Bit mask that marks which uint16 fields were present and valid. */
    uint32_t u16_present_mask;
    /** Parsed boolean config values, indexed by `s_update_bool_rules`. */
    bool bool_values[COMMAND_HANDLER_BOOL_RULE_COUNT];
    /** Bit mask that marks which bool fields were present and valid. */
    uint32_t bool_present_mask;
} command_config_update_t;

typedef struct {
    /** Runtime action consumed by the FSM task. */
    command_action_t action;
    /** OTA payload captured at MQTT callback time and later consumed by FSM. */
    ota_command_t ota_command;
    /** Config delta captured without mutating runtime config on the MQTT callback path. */
    command_config_update_t config_update;
} command_action_item_t;

/* Payload associated with the action most recently popped from s_action_queue. */
static ota_command_t s_consumed_ota_command = {0};
static bool s_consumed_ota_command_valid = false;
static command_config_update_t s_consumed_config_update = {0};
static bool s_consumed_config_update_valid = false;

static const command_u16_update_rule_t s_update_u16_rules[] = {
    {
        .field_name = "tracking_interval_s",
        .field_offset = offsetof(config_t, tracking_interval_s),
        .min_value = TRACKER_CONFIG_MIN_TRACKING_INTERVAL_S,
        .max_value = TRACKER_CONFIG_MAX_TRACKING_INTERVAL_S,
    },
    {
        .field_name = "heartbeat_interval_s",
        .field_offset = offsetof(config_t, heartbeat_interval_s),
        .min_value = TRACKER_CONFIG_MIN_HEARTBEAT_INTERVAL_S,
        .max_value = TRACKER_CONFIG_MAX_HEARTBEAT_INTERVAL_S,
    },
    {
        .field_name = "alarm_interval_s",
        .field_offset = offsetof(config_t, alarm_interval_s),
        .min_value = TRACKER_CONFIG_MIN_ALARM_INTERVAL_S,
        .max_value = TRACKER_CONFIG_MAX_ALARM_INTERVAL_S,
    },
    {
        .field_name = "ignition_off_hold_ms",
        .field_offset = offsetof(config_t, ignition_off_hold_ms),
        .min_value = TRACKER_CONFIG_MIN_IGNITION_OFF_HOLD_MS,
        .max_value = TRACKER_CONFIG_MAX_IGNITION_OFF_HOLD_MS,
    },
    {
        .field_name = "alarm_timeout_s",
        .field_offset = offsetof(config_t, alarm_timeout_s),
        .min_value = TRACKER_CONFIG_MIN_ALARM_TIMEOUT_S,
        .max_value = TRACKER_CONFIG_MAX_ALARM_TIMEOUT_S,
    },
    {
        .field_name = "ota_min_battery_mv",
        .field_offset = offsetof(config_t, ota_min_battery_mv),
        .min_value = TRACKER_CONFIG_MIN_OTA_BATTERY_MV,
        .max_value = TRACKER_CONFIG_MAX_OTA_BATTERY_MV,
    },
    {
        .field_name = "ignition_adc_threshold_mv",
        .field_offset = offsetof(config_t, ignition_adc_threshold_mv),
        .min_value = TRACKER_CONFIG_MIN_IGNITION_ADC_THRESHOLD_MV,
        .max_value = TRACKER_CONFIG_MAX_IGNITION_ADC_THRESHOLD_MV,
    },
};

static const command_bool_update_rule_t s_update_bool_rules[] = {
    {
        .field_name = "sleep_enabled",
        .field_offset = offsetof(config_t, sleep_enabled),
    },
    {
        .field_name = "imu_wakeup_enabled",
        .field_offset = offsetof(config_t, imu_wakeup_enabled),
    },
};

static bool command_handler_take_lock(void) {
    return s_lock != NULL && xSemaphoreTake(s_lock, COMMAND_HANDLER_LOCK_TIMEOUT_TICKS) == pdTRUE;
}

/**
 * @brief Acquire the command mutex and log/drop on contention.
 *
 * Command callbacks run from the MQTT/URC path, while command consumers run from
 * the FSM task. A bounded wait prevents command parsing from blocking modem RX
 * indefinitely when another path is applying a command.
 */
static bool command_handler_take_lock_for(const char *operation) {
    if (command_handler_take_lock()) {
        return true;
    }

    s_dropped_command_count += 1U;
    ESP_LOGW(TAG,
             "Dropped command operation=%s because lock is busy dropped_count=%lu",
             operation != NULL ? operation : "unknown",
             (unsigned long)s_dropped_command_count);
    return false;
}

static void command_handler_give_lock(void) {
    if (s_lock != NULL) {
        xSemaphoreGive(s_lock);
    }
}

static bool command_is_hex_sha256(const char *value) {
    if (util_string_empty(value) || strlen(value) != 64) {
        return false;
    }

    for (size_t i = 0; i < 64; ++i) {
        if (!isxdigit((unsigned char)value[i])) {
            return false;
        }
    }
    return true;
}

static bool command_parse_u32_positive(const cJSON *value, uint32_t *out_value) {
    if (value == NULL || out_value == NULL) {
        return false;
    }

    if (cJSON_IsNumber(value)) {
        if (value->valuedouble <= 0.0 || value->valuedouble > (double)UINT32_MAX) {
            return false;
        }

        uint32_t parsed = (uint32_t)value->valuedouble;
        if ((double)parsed != value->valuedouble) {
            return false;
        }

        *out_value = parsed;
        return true;
    }

    if (cJSON_IsString(value) && !util_string_empty(value->valuestring)) {
        errno = 0;
        char *end_ptr = NULL;
        unsigned long parsed = strtoul(value->valuestring, &end_ptr, 10);
        if (end_ptr == value->valuestring || errno != 0) {
            return false;
        }

        while (end_ptr != NULL && (*end_ptr == ' ' || *end_ptr == '\t')) {
            ++end_ptr;
        }

        if (end_ptr == NULL || *end_ptr != '\0' || parsed == 0UL || parsed > (unsigned long)UINT32_MAX) {
            return false;
        }

        *out_value = (uint32_t)parsed;
        return true;
    }

    return false;
}

/**
 * @brief Parse optional OTA confirm-timeout and clamp to runtime-safe range.
 *
 * @param params OTA params object.
 *
 * @return Confirm timeout in seconds.
 */
static uint32_t command_parse_confirm_timeout_sec(const cJSON *params) {
    if (params == NULL || !cJSON_IsObject(params)) {
        return TRACKER_OTA_CONFIRM_TIMEOUT_DEFAULT_SEC;
    }

    uint32_t parsed_timeout = 0U;
    const cJSON *confirm_timeout = cJSON_GetObjectItemCaseSensitive(params, "confirmTimeoutSec");
    if (!command_parse_u32_positive(confirm_timeout, &parsed_timeout)) {
        return TRACKER_OTA_CONFIRM_TIMEOUT_DEFAULT_SEC;
    }

    return (uint32_t)util_clamp_int((int)parsed_timeout,
                                    (int)TRACKER_OTA_CONFIRM_TIMEOUT_MIN_SEC,
                                    (int)TRACKER_OTA_CONFIRM_TIMEOUT_MAX_SEC);
}

static bool command_is_allowed_update_field(const char *name) {
    if (util_string_empty(name)) {
        return false;
    }

    for (size_t i = 0; i < ARRAY_SIZE(s_update_u16_rules); ++i) {
        if (strcmp(name, s_update_u16_rules[i].field_name) == 0) {
            return true;
        }
    }

    for (size_t i = 0; i < ARRAY_SIZE(s_update_bool_rules); ++i) {
        if (strcmp(name, s_update_bool_rules[i].field_name) == 0) {
            return true;
        }
    }

    return false;
}

/**
 * @brief Parse one allowed uint16 `update_config` field into a deferred delta.
 *
 * The parser never writes `s_config` directly. It only records valid fields in
 * `command_config_update_t`; the FSM task later applies and persists the delta
 * after full config validation.
 */
static bool command_parse_u16_update_field(const cJSON *params,
                                           size_t rule_index,
                                           command_config_update_t *update) {
    if (params == NULL || update == NULL || rule_index >= ARRAY_SIZE(s_update_u16_rules)) {
        return false;
    }

    const command_u16_update_rule_t *rule = &s_update_u16_rules[rule_index];
    const cJSON *field_value = cJSON_GetObjectItemCaseSensitive(params, rule->field_name);
    if (field_value == NULL) {
        return false;
    }

    uint32_t parsed = 0U;
    if (!command_parse_u32_positive(field_value, &parsed)) {
        ESP_LOGW(TAG, "Rejected update_config field %s because value is invalid", rule->field_name);
        return false;
    }

    update->u16_values[rule_index] =
        (uint16_t)util_clamp_int((int)parsed, (int)rule->min_value, (int)rule->max_value);
    update->u16_present_mask |= (1UL << rule_index);
    return true;
}

/**
 * @brief Parse one allowed boolean `update_config` field into a deferred delta.
 */
static bool command_parse_bool_update_field(const cJSON *params,
                                            size_t rule_index,
                                            command_config_update_t *update) {
    if (params == NULL || update == NULL || rule_index >= ARRAY_SIZE(s_update_bool_rules)) {
        return false;
    }

    const command_bool_update_rule_t *rule = &s_update_bool_rules[rule_index];
    const cJSON *field_value = cJSON_GetObjectItemCaseSensitive(params, rule->field_name);
    if (field_value == NULL) {
        return false;
    }

    if (!cJSON_IsBool(field_value)) {
        ESP_LOGW(TAG, "Rejected update_config field %s because value is not boolean", rule->field_name);
        return false;
    }

    update->bool_values[rule_index] = cJSON_IsTrue(field_value);
    update->bool_present_mask |= (1UL << rule_index);
    return true;
}

static bool command_config_update_has_changes(const command_config_update_t *update) {
    return update != NULL && (update->u16_present_mask != 0U || update->bool_present_mask != 0U);
}

/**
 * @brief Build a validated config delta from `update_config.params`.
 *
 * Unsupported fields are logged but ignored so the cloud can roll out extra
 * fields without bricking older firmware. Invalid values for supported fields
 * are also ignored, leaving the current runtime value unchanged.
 */
static bool command_parse_config_update(const cJSON *params, command_config_update_t *out_update) {
    if (params == NULL || out_update == NULL || !cJSON_IsObject(params)) {
        return false;
    }

    memset(out_update, 0, sizeof(*out_update));

    const cJSON *field = NULL;
    cJSON_ArrayForEach(field, params) {
        if (!command_is_allowed_update_field(field->string)) {
            ESP_LOGW(TAG, "Rejected unsupported update_config field: %s", field->string);
        }
    }

    for (size_t i = 0; i < ARRAY_SIZE(s_update_u16_rules); ++i) {
        (void)command_parse_u16_update_field(params, i, out_update);
    }

    for (size_t i = 0; i < ARRAY_SIZE(s_update_bool_rules); ++i) {
        (void)command_parse_bool_update_field(params, i, out_update);
    }

    return command_config_update_has_changes(out_update);
}

static const char *command_action_label(command_action_t action) {
    switch (action) {
        case COMMAND_ACTION_APPLY_CONFIG:
            return "apply_config";
        case COMMAND_ACTION_REBOOT:
            return "reboot";
        case COMMAND_ACTION_OTA_UPDATE:
            return "ota_update";
        case COMMAND_ACTION_OTA_ROLLBACK:
            return "ota_rollback";
        default:
            return "none";
    }
}

static esp_err_t command_handler_enqueue_action(const command_action_item_t *item) {
    if (item == NULL) {
        return ESP_ERR_INVALID_ARG;
    }
    if (s_action_queue == NULL) {
        return ESP_ERR_INVALID_STATE;
    }

    /*
     * FreeRTOS queues are already thread-safe. Do not hold s_lock while waiting
     * for a slot, otherwise the FSM consumer cannot acquire the same lock to
     * drain the queue under burst command traffic.
     */
    if (xQueueSendToBack(s_action_queue, item, COMMAND_HANDLER_QUEUE_SEND_TIMEOUT_TICKS) != pdTRUE) {
        s_dropped_command_count += 1U;
        ESP_LOGW(TAG,
                 "Dropped command action=%s because queue is full dropped_count=%lu",
                 command_action_label(item->action),
                 (unsigned long)s_dropped_command_count);
        return ESP_ERR_NO_MEM;
    }

    return ESP_OK;
}

/**
 * @brief Initialize command parser state.
 *
 * @param config Mutable config pointer for `update_config`.
 *
 * @return ESP_OK on success.
 */
esp_err_t command_handler_init(config_t *config) {
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");

    if (s_lock == NULL) {
        s_lock = xSemaphoreCreateMutex();
    }
    if (s_action_queue == NULL) {
        s_action_queue = xQueueCreate(COMMAND_HANDLER_ACTION_QUEUE_LEN, sizeof(command_action_item_t));
    }
    ESP_RETURN_ON_FALSE(s_lock != NULL, ESP_ERR_NO_MEM, TAG, "command lock init failed");
    ESP_RETURN_ON_FALSE(s_action_queue != NULL, ESP_ERR_NO_MEM, TAG, "command action queue init failed");
    ESP_RETURN_ON_FALSE(command_handler_take_lock(), ESP_ERR_TIMEOUT, TAG, "command lock busy during init");

    s_config = config;
    s_tracking_enabled = true;
    s_location_request_count = 0U;
    s_dropped_command_count = 0U;
    s_consumed_ota_command_valid = false;
    s_consumed_config_update_valid = false;
    memset(&s_consumed_ota_command, 0, sizeof(s_consumed_ota_command));
    memset(&s_consumed_config_update, 0, sizeof(s_consumed_config_update));
    xQueueReset(s_action_queue);

    command_handler_give_lock();
    return ESP_OK;
}

/**
 * @brief Validate and parse OTA command parameters.
 *
 * @param params `params` JSON object.
 * @param out_cmd Output OTA command.
 *
 * @return true when params are valid and parsed.
 */
static bool command_parse_ota_update(const cJSON *params, ota_command_t *out_cmd) {
    if (params == NULL || out_cmd == NULL || !cJSON_IsObject(params)) {
        ESP_LOGW(TAG, "ota_update params missing or not object");
        return false;
    }

    /* Required OTA fields. */
    const cJSON *job_id = cJSON_GetObjectItemCaseSensitive(params, "jobId");
    const cJSON *version = cJSON_GetObjectItemCaseSensitive(params, "version");
    const cJSON *url = cJSON_GetObjectItemCaseSensitive(params, "url");
    const cJSON *size = cJSON_GetObjectItemCaseSensitive(params, "size");
    const cJSON *sha256 = cJSON_GetObjectItemCaseSensitive(params, "sha256");

    if (!cJSON_IsString(job_id) || util_string_empty(job_id->valuestring)) {
        ESP_LOGW(TAG, "ota_update invalid jobId");
        return false;
    }
    if (!cJSON_IsString(version) || util_string_empty(version->valuestring)) {
        ESP_LOGW(TAG, "ota_update invalid version");
        return false;
    }
    if (!cJSON_IsString(url) || util_string_empty(url->valuestring)) {
        ESP_LOGW(TAG, "ota_update invalid url");
        return false;
    }
    if (!cJSON_IsString(sha256) || !command_is_hex_sha256(sha256->valuestring)) {
        ESP_LOGW(TAG, "ota_update invalid sha256");
        return false;
    }

    uint32_t parsed_size = 0U;
    if (!command_parse_u32_positive(size, &parsed_size)) {
        if (cJSON_IsString(size) && !util_string_empty(size->valuestring)) {
            ESP_LOGW(TAG, "ota_update invalid size value=%s", size->valuestring);
        } else {
            ESP_LOGW(TAG, "ota_update invalid size type");
        }
        return false;
    }

    if (strlen(job_id->valuestring) >= TRACKER_JOB_ID_MAX_LEN) {
        ESP_LOGW(TAG, "ota_update jobId too long");
        return false;
    }
    if (strlen(version->valuestring) >= TRACKER_TARGET_VERSION_MAX_LEN) {
        ESP_LOGW(TAG, "ota_update version too long");
        return false;
    }
    if (strlen(url->valuestring) >= TRACKER_OTA_URL_MAX_LEN) {
        ESP_LOGW(TAG, "ota_update url too long");
        return false;
    }

    /* OTA URL must stay on HTTPS transport. */
    if (strncmp(url->valuestring, "https://", strlen("https://")) != 0) {
        ESP_LOGW(TAG, "ota_update url must start with https://");
        return false;
    }

    memset(out_cmd, 0, sizeof(*out_cmd));
    out_cmd->pending = true;
    out_cmd->rollback_pending = false;
    out_cmd->size = parsed_size;

    /* Optional force flag. */
    const cJSON *force = cJSON_GetObjectItemCaseSensitive(params, "force");
    out_cmd->force = cJSON_IsBool(force) ? cJSON_IsTrue(force) : false;

    /* Optional confirm timeout with safe default. */
    out_cmd->confirm_timeout_sec = command_parse_confirm_timeout_sec(params);

    util_copy_string(out_cmd->job_id, sizeof(out_cmd->job_id), job_id->valuestring);
    util_copy_string(out_cmd->version, sizeof(out_cmd->version), version->valuestring);
    util_copy_string(out_cmd->url, sizeof(out_cmd->url), url->valuestring);
    util_copy_string(out_cmd->sha256, sizeof(out_cmd->sha256), sha256->valuestring);

    return true;
}

/**
 * @brief Parse incoming command JSON and update internal action flags.
 *
 * @param command_json Raw command JSON string.
 */
void command_handler_process(const char *command_json) {
    if (util_string_empty(command_json)) {
        return;
    }

    cJSON *root = cJSON_Parse(command_json);
    if (root == NULL) {
        ESP_LOGW(TAG, "Invalid command JSON");
        return;
    }

    const cJSON *command = cJSON_GetObjectItemCaseSensitive(root, "command");
    const cJSON *params = cJSON_GetObjectItemCaseSensitive(root, "params");

    if (!cJSON_IsString(command) || util_string_empty(command->valuestring)) {
        cJSON_Delete(root);
        return;
    }

    ESP_LOGI(TAG, "Command received: %s", command->valuestring);

    if (strcmp(command->valuestring, COMMAND_NAME_UPDATE_CONFIG) == 0) {
        command_config_update_t update = {0};
        if (command_parse_config_update(params, &update)) {
            command_action_item_t item = {
                .action = COMMAND_ACTION_APPLY_CONFIG,
                .config_update = update,
            };
            (void)command_handler_enqueue_action(&item);
        }
    } else if (strcmp(command->valuestring, COMMAND_NAME_REQUEST_LOCATION) == 0) {
        if (command_handler_take_lock_for(COMMAND_NAME_REQUEST_LOCATION)) {
            if (s_location_request_count < COMMAND_HANDLER_MAX_LOCATION_REQUESTS) {
                s_location_request_count += 1U;
            } else {
                s_dropped_command_count += 1U;
                ESP_LOGW(TAG, "Dropped request_location because pending counter is saturated");
            }
            command_handler_give_lock();
        }
    } else if (strcmp(command->valuestring, COMMAND_NAME_ENABLE_TRACKING) == 0) {
        const cJSON *enabled = cJSON_GetObjectItemCaseSensitive(params, "enabled");
        if (!cJSON_IsBool(enabled)) {
            ESP_LOGW(TAG, "Rejected enable_tracking because enabled is not boolean");
        } else if (command_handler_take_lock_for(COMMAND_NAME_ENABLE_TRACKING)) {
            s_tracking_enabled = cJSON_IsTrue(enabled);
            command_handler_give_lock();
        }
    } else if (strcmp(command->valuestring, COMMAND_NAME_REBOOT) == 0) {
        command_action_item_t item = {
            .action = COMMAND_ACTION_REBOOT,
        };
        (void)command_handler_enqueue_action(&item);
    } else if (strcmp(command->valuestring, COMMAND_NAME_OTA_UPDATE) == 0) {
        ota_command_t parsed = {0};
        if (command_parse_ota_update(params, &parsed)) {
            ESP_LOGI(TAG,
                     "ota_update accepted job=%s size=%u url_len=%u",
                     parsed.job_id,
                     (unsigned)parsed.size,
                     (unsigned)strlen(parsed.url));
            command_action_item_t item = {
                .action = COMMAND_ACTION_OTA_UPDATE,
                .ota_command = parsed,
            };
            (void)command_handler_enqueue_action(&item);
        } else {
            ESP_LOGW(TAG, "Invalid ota_update params");
        }
    } else if (strcmp(command->valuestring, COMMAND_NAME_MANUAL_ROLLBACK) == 0 ||
               strcmp(command->valuestring, COMMAND_NAME_OTA_ROLLBACK) == 0) {
        command_action_item_t item = {
            .action = COMMAND_ACTION_OTA_ROLLBACK,
        };
        item.ota_command.rollback_pending = true;
        (void)command_handler_enqueue_action(&item);
    }

    cJSON_Delete(root);
}

/**
 * @brief Consume one-shot location request flag.
 *
 * @return true when a request existed.
 */
bool command_handler_consume_location_request(void) {
    if (!command_handler_take_lock()) {
        return false;
    }

    bool current = s_location_request_count > 0U;
    if (current) {
        s_location_request_count -= 1U;
    }
    command_handler_give_lock();
    return current;
}

/**
 * @brief Read current tracking enabled state.
 *
 * @return true when tracking is enabled.
 */
bool command_handler_is_tracking_enabled(void) {
    if (!command_handler_take_lock()) {
        return true;
    }

    bool tracking_enabled = s_tracking_enabled;
    command_handler_give_lock();
    return tracking_enabled;
}

/**
 * @brief Consume current pending high-level action.
 *
 * @return Action value (or NONE).
 */
command_action_t command_handler_consume_action(void) {
    if (!command_handler_take_lock()) {
        return COMMAND_ACTION_NONE;
    }

    command_action_item_t item = {0};
    if (s_action_queue == NULL || xQueueReceive(s_action_queue, &item, 0) != pdTRUE) {
        command_handler_give_lock();
        return COMMAND_ACTION_NONE;
    }

    /*
     * Keep large command payloads out of the action enum. The caller first pops
     * the action, then fetches the payload with the matching take/apply helper.
     */
    s_consumed_ota_command_valid = false;
    s_consumed_config_update_valid = false;
    memset(&s_consumed_ota_command, 0, sizeof(s_consumed_ota_command));
    memset(&s_consumed_config_update, 0, sizeof(s_consumed_config_update));

    if (item.action == COMMAND_ACTION_OTA_UPDATE || item.action == COMMAND_ACTION_OTA_ROLLBACK) {
        s_consumed_ota_command = item.ota_command;
        s_consumed_ota_command_valid = true;
    } else if (item.action == COMMAND_ACTION_APPLY_CONFIG) {
        s_consumed_config_update = item.config_update;
        s_consumed_config_update_valid = true;
    }

    command_handler_give_lock();
    return item.action;
}

/**
 * @brief Apply the config delta associated with the last consumed action.
 *
 * NVS write can be slow, so the mutex is held only while copying the pending
 * delta and current config snapshot. The final in-memory swap is safe because
 * the FSM is the only writer for runtime config.
 */
esp_err_t command_handler_apply_pending_config(void) {
    if (!command_handler_take_lock()) {
        ESP_LOGW(TAG, "command lock busy while applying config");
        return ESP_ERR_TIMEOUT;
    }
    if (!s_consumed_config_update_valid) {
        command_handler_give_lock();
        return ESP_ERR_INVALID_STATE;
    }
    if (s_config == NULL) {
        command_handler_give_lock();
        return ESP_ERR_INVALID_STATE;
    }

    config_t *runtime_config = s_config;
    command_config_update_t pending_update = s_consumed_config_update;
    config_t next_config = *runtime_config;
    s_consumed_config_update_valid = false;
    memset(&s_consumed_config_update, 0, sizeof(s_consumed_config_update));
    command_handler_give_lock();

    bool changed = false;

    for (size_t i = 0; i < ARRAY_SIZE(s_update_u16_rules); ++i) {
        if ((pending_update.u16_present_mask & (1UL << i)) == 0U) {
            continue;
        }

        const command_u16_update_rule_t *rule = &s_update_u16_rules[i];
        uint16_t *target = (uint16_t *)((uint8_t *)&next_config + rule->field_offset);
        uint16_t next_value = pending_update.u16_values[i];
        if (*target != next_value) {
            *target = next_value;
            changed = true;
        }
    }

    for (size_t i = 0; i < ARRAY_SIZE(s_update_bool_rules); ++i) {
        if ((pending_update.bool_present_mask & (1UL << i)) == 0U) {
            continue;
        }

        const command_bool_update_rule_t *rule = &s_update_bool_rules[i];
        bool *target = (bool *)((uint8_t *)&next_config + rule->field_offset);
        bool next_value = pending_update.bool_values[i];
        if (*target != next_value) {
            *target = next_value;
            changed = true;
        }
    }

    if (!changed) {
        return ESP_OK;
    }

    if (!app_config_is_valid(&next_config)) {
        ESP_LOGW(TAG, "Rejected queued update_config because resulting config is invalid");
        return ESP_ERR_INVALID_ARG;
    }

    esp_err_t save_err = nvs_config_save(&next_config);
    if (save_err != ESP_OK) {
        ESP_LOGW(TAG, "Failed to persist updated config");
        return save_err;
    }

    *runtime_config = next_config;
    ESP_LOGI(TAG, "Applied queued update_config on FSM task");
    return ESP_OK;
}

/**
 * @brief Consume pending OTA command payload.
 *
 * @param out_cmd Output OTA command.
 *
 * @return true if OTA payload was copied.
 */
bool command_handler_take_ota_command(ota_command_t *out_cmd) {
    if (out_cmd == NULL) {
        return false;
    }

    if (!command_handler_take_lock()) {
        return false;
    }

    if (!s_consumed_ota_command_valid) {
        command_handler_give_lock();
        return false;
    }

    *out_cmd = s_consumed_ota_command;
    s_consumed_ota_command_valid = false;
    memset(&s_consumed_ota_command, 0, sizeof(s_consumed_ota_command));
    command_handler_give_lock();
    return true;
}
