#include "command_handler.h"

#include <ctype.h>
#include <errno.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>

#include "cJSON.h"

#include "esp_log.h"

#include "nvs_config.h"
#include "util.h"

/**
 * @file command_handler.c
 * @brief Parse command payloads from cloud and expose consumable runtime actions.
 */

static const char *TAG = "COMMAND_HANDLER";

/* Mutable runtime config pointer shared with state machine. */
static config_t *s_config = NULL;
/* Tracking enable flag set by `enable_tracking` command. */
static bool s_tracking_enabled = true;
/* One-shot location request flag set by `request_location`. */
static bool s_location_requested = false;
/* Reboot command latch consumed by state machine loop. */
static bool s_reboot_pending = false;
/* Pending OTA action consumed by state machine loop. */
static bool s_ota_action_pending = false;
static command_action_t s_ota_action = COMMAND_ACTION_NONE;
/* Last parsed OTA command payload. */
static ota_command_t s_ota_command = {0};

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
 * @brief Apply one bounded integer `update_config` rule.
 *
 * @param config Mutable runtime config.
 * @param params Raw JSON params object.
 * @param rule Rule definition describing destination field and bounds.
 *
 * @return true when field value was modified.
 */
static bool command_apply_u16_update_rule(config_t *config,
                                          const cJSON *params,
                                          const command_u16_update_rule_t *rule) {
    if (config == NULL || params == NULL || rule == NULL) {
        return false;
    }

    const cJSON *field_value = cJSON_GetObjectItemCaseSensitive(params, rule->field_name);
    uint32_t parsed = 0U;
    if (!command_parse_u32_positive(field_value, &parsed)) {
        return false;
    }

    uint16_t clamped = (uint16_t)util_clamp_int((int)parsed, (int)rule->min_value, (int)rule->max_value);
    uint16_t *target = (uint16_t *)((uint8_t *)config + rule->field_offset);
    if (*target == clamped) {
        return false;
    }

    *target = clamped;
    return true;
}

/**
 * @brief Apply one boolean `update_config` rule.
 *
 * @param config Mutable runtime config.
 * @param params Raw JSON params object.
 * @param rule Rule definition describing destination field.
 *
 * @return true when field value was modified.
 */
static bool command_apply_bool_update_rule(config_t *config,
                                           const cJSON *params,
                                           const command_bool_update_rule_t *rule) {
    if (config == NULL || params == NULL || rule == NULL) {
        return false;
    }

    const cJSON *field_value = cJSON_GetObjectItemCaseSensitive(params, rule->field_name);
    if (!cJSON_IsBool(field_value)) {
        return false;
    }

    bool parsed = cJSON_IsTrue(field_value);
    bool *target = (bool *)((uint8_t *)config + rule->field_offset);
    if (*target == parsed) {
        return false;
    }

    *target = parsed;
    return true;
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
    s_config = config;
    s_tracking_enabled = true;
    s_location_requested = false;
    s_reboot_pending = false;
    s_ota_action_pending = false;
    s_ota_action = COMMAND_ACTION_NONE;
    memset(&s_ota_command, 0, sizeof(s_ota_command));
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
 * @brief Apply remote configuration updates and persist into NVS.
 *
 * @param params JSON params object.
 */
static void command_apply_update_config(const cJSON *params) {
    if (s_config == NULL || params == NULL) {
        return;
    }

    config_t before_update = *s_config;
    bool changed = false;

    const cJSON *field = NULL;
    cJSON_ArrayForEach(field, params) {
        if (!command_is_allowed_update_field(field->string)) {
            ESP_LOGW(TAG, "Rejected unsupported update_config field: %s", field->string);
        }
    }

    for (size_t i = 0; i < ARRAY_SIZE(s_update_u16_rules); ++i) {
        if (command_apply_u16_update_rule(s_config, params, &s_update_u16_rules[i])) {
            changed = true;
        }
    }

    for (size_t i = 0; i < ARRAY_SIZE(s_update_bool_rules); ++i) {
        if (command_apply_bool_update_rule(s_config, params, &s_update_bool_rules[i])) {
            changed = true;
        }
    }

    if (!changed) {
        return;
    }

    if (!app_config_is_valid(s_config)) {
        ESP_LOGW(TAG, "Rejected update_config because resulting config is invalid");
        *s_config = before_update;
        return;
    }

    if (nvs_config_save(s_config) != ESP_OK) {
        ESP_LOGW(TAG, "Failed to persist updated config");
    }
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
        if (cJSON_IsObject(params)) {
            command_apply_update_config(params);
        }
    } else if (strcmp(command->valuestring, COMMAND_NAME_REQUEST_LOCATION) == 0) {
        s_location_requested = true;
    } else if (strcmp(command->valuestring, COMMAND_NAME_ENABLE_TRACKING) == 0) {
        const cJSON *enabled = cJSON_GetObjectItemCaseSensitive(params, "enabled");
        if (cJSON_IsBool(enabled)) {
            s_tracking_enabled = cJSON_IsTrue(enabled);
        }
    } else if (strcmp(command->valuestring, COMMAND_NAME_REBOOT) == 0) {
        s_reboot_pending = true;
    } else if (strcmp(command->valuestring, COMMAND_NAME_OTA_UPDATE) == 0) {
        ota_command_t parsed = {0};
        if (command_parse_ota_update(params, &parsed)) {
            ESP_LOGI(TAG,
                     "ota_update accepted job=%s size=%u url=%s",
                     parsed.job_id,
                     (unsigned)parsed.size,
                     parsed.url);
            s_ota_command = parsed;
            s_ota_action_pending = true;
            s_ota_action = COMMAND_ACTION_OTA_UPDATE;
        } else {
            ESP_LOGW(TAG, "Invalid ota_update params");
        }
    } else if (strcmp(command->valuestring, COMMAND_NAME_MANUAL_ROLLBACK) == 0 ||
               strcmp(command->valuestring, COMMAND_NAME_OTA_ROLLBACK) == 0) {
        /* Create synthetic rollback request payload. */
        memset(&s_ota_command, 0, sizeof(s_ota_command));
        s_ota_command.rollback_pending = true;
        s_ota_command.pending = false;
        s_ota_action_pending = true;
        s_ota_action = COMMAND_ACTION_OTA_ROLLBACK;
    }

    cJSON_Delete(root);
}

/**
 * @brief Consume one-shot location request flag.
 *
 * @return true when a request existed.
 */
bool command_handler_consume_location_request(void) {
    bool current = s_location_requested;
    s_location_requested = false;
    return current;
}

/**
 * @brief Read current tracking enabled state.
 *
 * @return true when tracking is enabled.
 */
bool command_handler_is_tracking_enabled(void) {
    return s_tracking_enabled;
}

/**
 * @brief Consume current pending high-level action.
 *
 * @return Action value (or NONE).
 */
command_action_t command_handler_consume_action(void) {
    if (s_reboot_pending) {
        s_reboot_pending = false;
        return COMMAND_ACTION_REBOOT;
    }

    if (s_ota_action_pending) {
        command_action_t action = s_ota_action;
        s_ota_action_pending = false;
        s_ota_action = COMMAND_ACTION_NONE;
        return action;
    }

    return COMMAND_ACTION_NONE;
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

    if (!s_ota_command.pending && !s_ota_command.rollback_pending) {
        return false;
    }

    *out_cmd = s_ota_command;
    memset(&s_ota_command, 0, sizeof(s_ota_command));
    return true;
}
