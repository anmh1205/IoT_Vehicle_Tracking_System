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
 * @brief Parse cloud commands and expose deferred actions to the FSM task.
 *
 * ## Ownership split
 *    - MQTT callback path: parse JSON, validate payloads, stage immutable data
 *    - FSM task path: consume the staged action, apply side effects, persist state
 *
 * ## Why the split exists
 *    - The MQTT callback path should stay short and non-blocking.
 *    - Slow operations such as NVS writes or OTA state changes belong to the FSM.
 *    - Runtime policy stays single-writer even when commands arrive in bursts.
 *
 * ## Command flow
 *    1. MQTT receives payload on `v1/{device_id}/commands`.
 *    2. `command_handler_process()` parses `command` + `params`.
 *    3. Valid action data is staged in a queue item.
 *    4. FSM calls `command_handler_consume_action()`.
 *    5. FSM fetches the matching staged payload with a dedicated take/apply helper.
 *
 * ## Supported command families
 *    - `update_config`: staged as a config delta, validated again on the FSM task
 *    - `ota_update` / `ota_rollback`: staged as OTA command payload
 *    - `assign_session`: staged as canonical cloud session mapping
 *    - `request_location`, `enable_tracking`, `reboot`: reduced to small runtime flags/actions
 */

// File-local constants, retained state, and helper wiring stay private here so
// higher layers interact with this module through its exported contract.


static const char *TAG = "COMMAND_HANDLER";
/* Mutex lock timeout for command handler operations. */
static const TickType_t COMMAND_HANDLER_LOCK_TIMEOUT_TICKS = pdMS_TO_TICKS(250);
/* Queue send timeout for action enqueue operations. */
static const TickType_t COMMAND_HANDLER_QUEUE_SEND_TIMEOUT_TICKS = pdMS_TO_TICKS(100);

#define COMMAND_HANDLER_ACTION_QUEUE_LEN 16U
#define COMMAND_HANDLER_MAX_LOCATION_REQUESTS 255U
#define COMMAND_HANDLER_U16_RULE_COUNT 7U
#define COMMAND_HANDLER_BOOL_RULE_COUNT 2U

/* Mutable runtime config pointer shared with state machine. */
static config_t *s_config = NULL;
/* Mutex protecting command handler state. */
static SemaphoreHandle_t s_lock = NULL;
/* Queue for pending command actions. */
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
static const char *const COMMAND_NAME_ASSIGN_SESSION = "assign_session";

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
    /** Session assignment payload matched to the current firmware session. */
    command_session_assignment_t session_assignment;
} command_action_item_t;

/* Payload associated with the action most recently popped from s_action_queue. */
static ota_command_t s_consumed_ota_command = {0};
static bool s_consumed_ota_command_valid = false;
static command_config_update_t s_consumed_config_update = {0};
static bool s_consumed_config_update_valid = false;
static command_session_assignment_t s_consumed_session_assignment = {0};
static bool s_consumed_session_assignment_valid = false;

/**
 * @brief Clear every staged payload associated with the last consumed action.
 *
 * The action enum is popped from the queue first, then the caller fetches the
 * matching payload through a second helper. Resetting every staged payload here
 * guarantees that only one action payload is live at a time.
 */
static void command_handler_reset_consumed_payloads(void) {
    // Rehydrate handler reset consumed payloads here so later logic reads one coherent snapshot after reset or sleep.
    s_consumed_ota_command_valid = false;
    s_consumed_config_update_valid = false;
    s_consumed_session_assignment_valid = false;
    memset(&s_consumed_ota_command, 0, sizeof(s_consumed_ota_command));
    memset(&s_consumed_config_update, 0, sizeof(s_consumed_config_update));
    memset(&s_consumed_session_assignment, 0, sizeof(s_consumed_session_assignment));
}

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
        .min_value = TRACKER_CONFIG_EFFECTIVE_MIN_IGNITION_OFF_HOLD_MS,
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

/**
 * @brief Acquire the command mutex with the default bounded timeout.
 *
 * @return true when the command mutex was acquired.
 */
static bool command_handler_take_lock(void) {
    // Keep this public facade thin and forward the real work to the focused implementation below.
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
    // Keep the branchy handler take lock for flow centralized here so side effects remain easy to audit.
    if (command_handler_take_lock()) {
        return true;
    }

    s_dropped_command_count += 1U;
    ESP_LOGW(TAG,
             "event=command_dropped operation=%s reason=lock_busy dropped_count=%lu",
             operation != NULL ? operation : "unknown",
             (unsigned long)s_dropped_command_count);
    return false;
}

/**
 * @brief Release the command handler mutex lock.
 *
 * Called after command parsing completes to unblock other command consumers
 * (FSM task can now acquire lock for processing). Safe to call even if lock
 * was never acquired or was already given (null check protects against both).
 */
static void command_handler_give_lock(void) {
    // Keep the branchy handler give lock flow centralized here so side effects remain easy to audit.
    if (s_lock != NULL) {
        xSemaphoreGive(s_lock);
    }
}

/**
 * @brief Validate if string is a valid 64-character hex SHA256 hash.
 *
 * Used for validating OTA firmware hashes received from cloud commands.
 * Checks: exact length 64, all characters are hexadecimal digits [0-9a-fA-F].
 *
 * @param value String to validate (null/empty returns false).
 * @return true if valid hex string of SHA256 length, false otherwise.
 */
static bool command_is_hex_sha256(const char *value) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
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

/**
 * @brief Parse unsigned 32-bit positive integer from JSON value.
 *
 * Supports two JSON value types:
 * - Number: validates range (0 < value <= UINT32_MAX) and checks for truncation
 * - String: uses strtoul() for base-10 parsing with overflow/error checking
 *
 * Both paths reject non-positive values (0 or negative) to enforce positive-only
 * constraint for config parameters like intervals and timeouts.
 *
 * @param[in] value cJSON value to parse (must be non-null).
 * @param[out] out_value Parsed uint32 result (must be non-null).
 * @return true if valid positive uint32 parsed, false on invalid input/range.
 */
static bool command_parse_u32_positive(const cJSON *value, uint32_t *out_value) {
    // Decode raw parse u32 positive into the normalized form the rest of the module expects.
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
 * @brief Parse unsigned 64-bit positive integer from a JSON value.
 *
 * @param[in] value cJSON value to parse.
 * @param[out] out_value Parsed uint64 result.
 * @return true when a valid positive uint64 value was parsed.
 */
static bool command_parse_u64_positive(const cJSON *value, uint64_t *out_value) {
    // Decode raw parse u64 positive into the normalized form the rest of the module expects.
    if (value == NULL || out_value == NULL) {
        return false;
    }

    if (cJSON_IsNumber(value)) {
        if (value->valuedouble <= 0.0 || value->valuedouble > (double)UINT64_MAX) {
            return false;
        }

        uint64_t parsed = (uint64_t)value->valuedouble;
        if ((double)parsed != value->valuedouble) {
            return false;
        }

        *out_value = parsed;
        return true;
    }

    if (cJSON_IsString(value) && !util_string_empty(value->valuestring)) {
        errno = 0;
        char *end_ptr = NULL;
        unsigned long long parsed = strtoull(value->valuestring, &end_ptr, 10);
        if (end_ptr == value->valuestring || errno != 0) {
            return false;
        }

        while (end_ptr != NULL && (*end_ptr == ' ' || *end_ptr == '\t')) {
            ++end_ptr;
        }

        if (end_ptr == NULL || *end_ptr != '\0' || parsed == 0ULL) {
            return false;
        }

        *out_value = (uint64_t)parsed;
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
    // Decode raw parse confirm timeout sec into the normalized form the rest of the module expects.
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

/**
 * @brief Check if field name is in the allowed update_config whitelist.
 *
 * Scans both uint16 and bool rule arrays to validate that the incoming
 * field name is authorized for remote configuration updates. This prevents
 * arbitrary NVS key manipulation from cloud commands - only whitelisted
 * fields can be updated remotely.
 *
 * @param name Field name string to check (null/empty returns false).
 * @return true if field is in whitelist, false otherwise.
 */
static bool command_is_allowed_update_field(const char *name) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
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
    // Decode raw parse u16 update field into the normalized form the rest of the module expects.
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
        ESP_LOGW(TAG, "event=update_config_field_rejected field=%s reason=invalid_u32_value", rule->field_name);
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
    // Decode raw parse bool update field into the normalized form the rest of the module expects.
    if (params == NULL || update == NULL || rule_index >= ARRAY_SIZE(s_update_bool_rules)) {
        return false;
    }

    const command_bool_update_rule_t *rule = &s_update_bool_rules[rule_index];
    const cJSON *field_value = cJSON_GetObjectItemCaseSensitive(params, rule->field_name);
    if (field_value == NULL) {
        return false;
    }

    if (!cJSON_IsBool(field_value)) {
        ESP_LOGW(TAG, "event=update_config_field_rejected field=%s reason=not_boolean", rule->field_name);
        return false;
    }

    update->bool_values[rule_index] = cJSON_IsTrue(field_value);
    update->bool_present_mask |= (1UL << rule_index);
    return true;
}

/**
 * @brief Check whether a parsed config delta contains any staged fields.
 *
 * @param[in] update Parsed config delta.
 * @return true when at least one field was staged.
 */
static bool command_config_update_has_changes(const command_config_update_t *update) {
    // Keep this public facade thin and forward the real work to the focused implementation below.
    return update != NULL && (update->u16_present_mask != 0U || update->bool_present_mask != 0U);
}

/**
 * @brief Apply staged uint16 config fields into a writable config snapshot.
 *
 * @param next_config Mutable config snapshot owned by the FSM.
 * @param pending_update Parsed config delta staged by the MQTT callback path.
 *
 * @return true when at least one uint16 field changed.
 */
static bool command_apply_u16_updates(config_t *next_config, const command_config_update_t *pending_update) {
    // Apply the validated uint16 config deltas here so runtime policy changes from one controlled path.
    if (next_config == NULL || pending_update == NULL) {
        return false;
    }

    bool changed = false;
    for (size_t i = 0; i < ARRAY_SIZE(s_update_u16_rules); ++i) {
        if ((pending_update->u16_present_mask & (1UL << i)) == 0U) {
            continue;
        }

        const command_u16_update_rule_t *rule = &s_update_u16_rules[i];
        uint16_t *target = (uint16_t *)((uint8_t *)next_config + rule->field_offset);
        uint16_t next_value = pending_update->u16_values[i];
        if (*target != next_value) {
            *target = next_value;
            changed = true;
        }
    }

    return changed;
}

/**
 * @brief Apply staged boolean config fields into a writable config snapshot.
 *
 * @param next_config Mutable config snapshot owned by the FSM.
 * @param pending_update Parsed config delta staged by the MQTT callback path.
 *
 * @return true when at least one boolean field changed.
 */
static bool command_apply_bool_updates(config_t *next_config, const command_config_update_t *pending_update) {
    // Apply the validated boolean config deltas here so feature toggles stay synchronized with persisted config.
    if (next_config == NULL || pending_update == NULL) {
        return false;
    }

    bool changed = false;
    for (size_t i = 0; i < ARRAY_SIZE(s_update_bool_rules); ++i) {
        if ((pending_update->bool_present_mask & (1UL << i)) == 0U) {
            continue;
        }

        const command_bool_update_rule_t *rule = &s_update_bool_rules[i];
        bool *target = (bool *)((uint8_t *)next_config + rule->field_offset);
        bool next_value = pending_update->bool_values[i];
        if (*target != next_value) {
            *target = next_value;
            changed = true;
        }
    }

    return changed;
}

/**
 * @brief Build a validated config delta from `update_config.params`.
 *
 * Unsupported fields are logged but ignored so the cloud can roll out extra
 * fields without bricking older firmware. Invalid values for supported fields
 * are also ignored, leaving the current runtime value unchanged.
 */
static bool command_parse_config_update(const cJSON *params, command_config_update_t *out_update) {
    // Decode raw parse config update into the normalized form the rest of the module expects.
    if (params == NULL || out_update == NULL || !cJSON_IsObject(params)) {
        return false;
    }

    memset(out_update, 0, sizeof(*out_update));

    const cJSON *field = NULL;
    cJSON_ArrayForEach(field, params) {
        if (!command_is_allowed_update_field(field->string)) {
            ESP_LOGW(TAG, "event=update_config_field_ignored field=%s reason=unsupported", field->string);
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
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    switch (action) {
        case COMMAND_ACTION_APPLY_CONFIG:
            return "apply_config";
        case COMMAND_ACTION_REBOOT:
            return "reboot";
        case COMMAND_ACTION_OTA_UPDATE:
            return "ota_update";
        case COMMAND_ACTION_OTA_ROLLBACK:
            return "ota_rollback";
        case COMMAND_ACTION_ASSIGN_SESSION:
            return "assign_session";
        default:
            return "none";
    }
}

/**
 * @brief Stage the payload that matches the action just popped from the queue.
 *
 * Queue consumers always read the action enum first. Large payload structs stay
 * in side buffers so the caller can fetch only the payload type that belongs to
 * that action.
 */
static void command_handler_stage_consumed_action_payloads(const command_action_item_t *item) {
    // Rehydrate handler stage consumed action payloads here so later logic reads one coherent snapshot after reset or sleep.
    command_handler_reset_consumed_payloads();
    if (item == NULL) {
        return;
    }

    if (item->action == COMMAND_ACTION_OTA_UPDATE || item->action == COMMAND_ACTION_OTA_ROLLBACK) {
        s_consumed_ota_command = item->ota_command;
        s_consumed_ota_command_valid = true;
        return;
    }

    if (item->action == COMMAND_ACTION_APPLY_CONFIG) {
        s_consumed_config_update = item->config_update;
        s_consumed_config_update_valid = true;
        return;
    }

    if (item->action == COMMAND_ACTION_ASSIGN_SESSION) {
        s_consumed_session_assignment = item->session_assignment;
        s_consumed_session_assignment_valid = true;
    }
}

/**
 * @brief Copy one staged payload out while the command lock is already held.
 *
 * @param out_payload Destination object to fill.
 * @param payload_size Size in bytes for both source and destination payloads.
 * @param stored_payload Mutable staged payload buffer.
 * @param valid_flag Valid bit paired with the staged payload buffer.
 *
 * @return true when a staged payload was copied.
 */
static bool command_handler_take_consumed_payload_locked(void *out_payload,
                                                         size_t payload_size,
                                                         void *stored_payload,
                                                         bool *valid_flag) {
    // Rehydrate handler take consumed payload locked here so later logic reads one coherent snapshot after reset or sleep.
    if (out_payload == NULL || stored_payload == NULL || valid_flag == NULL || !(*valid_flag)) {
        return false;
    }

    memcpy(out_payload, stored_payload, payload_size);
    *valid_flag = false;
    memset(stored_payload, 0, payload_size);
    return true;
}

/**
 * @brief Enqueue one fully parsed command action for later FSM consumption.
 *
 * @param[in] item Parsed action item to enqueue.
 * @return ESP_OK on success, or an error when the queue is unavailable/full.
 */
static esp_err_t command_handler_enqueue_action(const command_action_item_t *item) {
    // Stage handler enqueue action durably here so transient link loss cannot drop the caller's payload.
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
                 "event=command_dropped action=%s reason=queue_full dropped_count=%lu",
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
    // Initialize module-local state and dependencies before later runtime paths rely on them.
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
    command_handler_reset_consumed_payloads();
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
    // Decode raw parse OTA update into the normalized form the rest of the module expects.
    if (params == NULL || out_cmd == NULL || !cJSON_IsObject(params)) {
        ESP_LOGW(TAG, "event=ota_update_rejected reason=params_missing_or_not_object");
        return false;
    }

    /* Required OTA fields. */
    const cJSON *job_id = cJSON_GetObjectItemCaseSensitive(params, "jobId");
    const cJSON *version = cJSON_GetObjectItemCaseSensitive(params, "version");
    const cJSON *url = cJSON_GetObjectItemCaseSensitive(params, "url");
    const cJSON *size = cJSON_GetObjectItemCaseSensitive(params, "size");
    const cJSON *sha256 = cJSON_GetObjectItemCaseSensitive(params, "sha256");

    // Validate each required field independently so field logs show which contract item the cloud payload violated.
    if (!cJSON_IsString(job_id) || util_string_empty(job_id->valuestring)) {
        ESP_LOGW(TAG, "event=ota_update_rejected reason=invalid_job_id");
        return false;
    }
    if (!cJSON_IsString(version) || util_string_empty(version->valuestring)) {
        ESP_LOGW(TAG, "event=ota_update_rejected reason=invalid_version");
        return false;
    }
    if (!cJSON_IsString(url) || util_string_empty(url->valuestring)) {
        ESP_LOGW(TAG, "event=ota_update_rejected reason=invalid_request_target");
        return false;
    }
    if (!cJSON_IsString(sha256) || !command_is_hex_sha256(sha256->valuestring)) {
        ESP_LOGW(TAG, "event=ota_update_rejected reason=invalid_sha256");
        return false;
    }

    uint32_t parsed_size = 0U;
    if (!command_parse_u32_positive(size, &parsed_size)) {
        // Size may arrive as number or decimal string, but it still has to decode into one positive u32 manifest length.
        if (cJSON_IsString(size) && !util_string_empty(size->valuestring)) {
            ESP_LOGW(TAG, "event=ota_update_rejected reason=invalid_size value_present=1");
        } else {
            ESP_LOGW(TAG, "event=ota_update_rejected reason=invalid_size_type");
        }
        return false;
    }

    if (strlen(job_id->valuestring) >= TRACKER_JOB_ID_MAX_LEN) {
        ESP_LOGW(TAG, "event=ota_update_rejected reason=job_id_too_long");
        return false;
    }
    if (strlen(version->valuestring) >= TRACKER_TARGET_VERSION_MAX_LEN) {
        ESP_LOGW(TAG, "event=ota_update_rejected reason=version_too_long");
        return false;
    }
    if (strlen(url->valuestring) >= TRACKER_OTA_URL_MAX_LEN) {
        ESP_LOGW(TAG, "event=ota_update_rejected reason=request_target_too_long");
        return false;
    }

    /* OTA URL must stay on HTTPS transport. */
    if (strncmp(url->valuestring, "https://", strlen("https://")) != 0) {
        ESP_LOGW(TAG, "event=ota_update_rejected reason=request_target_not_https");
        return false;
    }
    if (strstr(url->valuestring, "example.com") != NULL) {
        ESP_LOGW(TAG, "event=ota_update_rejected reason=request_target_placeholder_host");
        return false;
    }

    // Zero the output first so any omitted optional fields fall back to a predictable disabled state.
    memset(out_cmd, 0, sizeof(*out_cmd));
    out_cmd->pending = true;
    out_cmd->rollback_pending = false;
    out_cmd->size = parsed_size;

    /* Optional force flag. */
    const cJSON *force = cJSON_GetObjectItemCaseSensitive(params, "force");
    out_cmd->force = cJSON_IsBool(force) ? cJSON_IsTrue(force) : false;

    /* Optional confirm timeout with safe default. */
    out_cmd->confirm_timeout_sec = command_parse_confirm_timeout_sec(params);

    // Copy validated strings only after all structural checks pass, so callers never observe a half-filled OTA command.
    util_copy_string(out_cmd->job_id, sizeof(out_cmd->job_id), job_id->valuestring);
    util_copy_string(out_cmd->version, sizeof(out_cmd->version), version->valuestring);
    util_copy_string(out_cmd->url, sizeof(out_cmd->url), url->valuestring);
    util_copy_string(out_cmd->sha256, sizeof(out_cmd->sha256), sha256->valuestring);

    return true;
}

/**
 * @brief Parse the server-issued session assignment payload.
 *
 * @param[in] params `assign_session.params` object.
 * @param[out] out_assignment Parsed assignment result.
 * @return true when the payload is complete and valid.
 */
static bool command_parse_session_assignment(const cJSON *params,
                                             command_session_assignment_t *out_assignment) {
    // Decode raw parse session assignment into the normalized form the rest of the module expects.
    if (params == NULL || out_assignment == NULL || !cJSON_IsObject(params)) {
        return false;
    }

    const cJSON *local_session_key = cJSON_GetObjectItemCaseSensitive(params, "local_session_key");
    const cJSON *canonical_session_id = cJSON_GetObjectItemCaseSensitive(params, "canonical_session_id");
    const cJSON *boot_id = cJSON_GetObjectItemCaseSensitive(params, "boot_id");

    uint32_t parsed_local_session_key = 0U;
    uint64_t parsed_canonical_session_id = 0U;
    if (!command_parse_u32_positive(local_session_key, &parsed_local_session_key) ||
        !command_parse_u64_positive(canonical_session_id, &parsed_canonical_session_id) ||
        !cJSON_IsString(boot_id) ||
        util_string_empty(boot_id->valuestring)) {
        return false;
    }

    memset(out_assignment, 0, sizeof(*out_assignment));
    out_assignment->local_session_key = parsed_local_session_key;
    out_assignment->canonical_session_id = parsed_canonical_session_id;
    util_copy_string(out_assignment->boot_id, sizeof(out_assignment->boot_id), boot_id->valuestring);
    return true;
}

/**
 * @brief Parse incoming command JSON and update internal action flags.
 *
 * @param command_json Raw command JSON string.
 */
void command_handler_process(const char *command_json) {
    // Parse the cloud command once here, then fan out into the staged action path that the FSM consumes safely later.
    if (util_string_empty(command_json)) {
        return;
    }

    cJSON *root = cJSON_Parse(command_json);
    if (root == NULL) {
        ESP_LOGW(TAG, "event=command_json_invalid");
        return;
    }

    // Extract the command verb first; every later branch depends on it being a non-empty string.
    const cJSON *command = cJSON_GetObjectItemCaseSensitive(root, "command");
    const cJSON *params = cJSON_GetObjectItemCaseSensitive(root, "params");

    if (!cJSON_IsString(command) || util_string_empty(command->valuestring)) {
        cJSON_Delete(root);
        return;
    }

    ESP_LOGI(TAG, "event=command_received command=%s", command->valuestring);

    if (strcmp(command->valuestring, COMMAND_NAME_UPDATE_CONFIG) == 0) {
        // Config updates are parsed into a delta object first so the MQTT callback path never mutates runtime config directly.
        command_config_update_t update = {0};
        if (command_parse_config_update(params, &update)) {
            command_action_item_t item = {
                .action = COMMAND_ACTION_APPLY_CONFIG,
                .config_update = update,
            };
            (void)command_handler_enqueue_action(&item);
        }
    } else if (strcmp(command->valuestring, COMMAND_NAME_REQUEST_LOCATION) == 0) {
        // Location requests collapse into a bounded counter so bursts do not allocate unbounded queue state.
        if (command_handler_take_lock_for(COMMAND_NAME_REQUEST_LOCATION)) {
            if (s_location_request_count < COMMAND_HANDLER_MAX_LOCATION_REQUESTS) {
                s_location_request_count += 1U;
            } else {
                s_dropped_command_count += 1U;
                ESP_LOGW(TAG, "event=command_dropped operation=request_location reason=pending_counter_saturated");
            }
            command_handler_give_lock();
        }
    } else if (strcmp(command->valuestring, COMMAND_NAME_ENABLE_TRACKING) == 0) {
        // Tracking enable is a small runtime flag, so it can be updated under lock without staging a full queue item.
        const cJSON *enabled = cJSON_GetObjectItemCaseSensitive(params, "enabled");
        if (!cJSON_IsBool(enabled)) {
            ESP_LOGW(TAG, "event=enable_tracking_rejected reason=enabled_not_boolean");
        } else if (command_handler_take_lock_for(COMMAND_NAME_ENABLE_TRACKING)) {
            s_tracking_enabled = cJSON_IsTrue(enabled);
            command_handler_give_lock();
        }
    } else if (strcmp(command->valuestring, COMMAND_NAME_REBOOT) == 0) {
        // Reboot is intentionally deferred into the FSM thread so shutdown side effects stay single-writer.
        command_action_item_t item = {
            .action = COMMAND_ACTION_REBOOT,
        };
        (void)command_handler_enqueue_action(&item);
    } else if (strcmp(command->valuestring, COMMAND_NAME_OTA_UPDATE) == 0) {
        // OTA commands are fully validated and copied now because the original JSON buffer disappears after this callback.
        ota_command_t parsed = {0};
        if (command_parse_ota_update(params, &parsed)) {
            ESP_LOGI(TAG,
                     "event=ota_update_accepted job=%s size=%u url_len=%u",
                     parsed.job_id,
                     (unsigned)parsed.size,
                     (unsigned)strlen(parsed.url));
            command_action_item_t item = {
                .action = COMMAND_ACTION_OTA_UPDATE,
                .ota_command = parsed,
            };
            (void)command_handler_enqueue_action(&item);
        } else {
            ESP_LOGW(TAG, "event=ota_update_rejected reason=invalid_params");
        }
    } else if (strcmp(command->valuestring, COMMAND_NAME_MANUAL_ROLLBACK) == 0 ||
               strcmp(command->valuestring, COMMAND_NAME_OTA_ROLLBACK) == 0) {
        // Manual and explicit rollback commands converge into the same staged OTA rollback action.
        command_action_item_t item = {
            .action = COMMAND_ACTION_OTA_ROLLBACK,
        };
        item.ota_command.rollback_pending = true;
        (void)command_handler_enqueue_action(&item);
    } else if (strcmp(command->valuestring, COMMAND_NAME_ASSIGN_SESSION) == 0) {
        // Session assignments are staged so the FSM can atomically align local and canonical session identifiers.
        command_session_assignment_t assignment = {0};
        if (command_parse_session_assignment(params, &assignment)) {
            command_action_item_t item = {
                .action = COMMAND_ACTION_ASSIGN_SESSION,
                .session_assignment = assignment,
            };
            (void)command_handler_enqueue_action(&item);
        } else {
            ESP_LOGW(TAG, "event=assign_session_rejected reason=invalid_params");
        }
    }

    cJSON_Delete(root);
}

/**
 * @brief Consume one-shot location request flag.
 *
 * @return true when a request existed.
 */
bool command_handler_consume_location_request(void) {
    // Keep the branchy handler consume location request flow centralized here so side effects remain easy to audit.
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
    // Keep the branchy handler is tracking enabled flow centralized here so side effects remain easy to audit.
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
    // Keep the branchy handler consume action flow centralized here so side effects remain easy to audit.
    if (!command_handler_take_lock()) {
        return COMMAND_ACTION_NONE;
    }

    command_action_item_t item = {0};
    if (s_action_queue == NULL || xQueueReceive(s_action_queue, &item, 0) != pdTRUE) {
        command_handler_give_lock();
        return COMMAND_ACTION_NONE;
    }

    command_handler_stage_consumed_action_payloads(&item);

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
    // Keep the branchy handler apply pending config flow centralized here so side effects remain easy to audit.
    if (!command_handler_take_lock()) {
        ESP_LOGW(TAG, "event=apply_config_skipped reason=lock_busy");
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

    bool changed = command_apply_u16_updates(&next_config, &pending_update);
    if (command_apply_bool_updates(&next_config, &pending_update)) {
        changed = true;
    }

    if (!changed) {
        return ESP_OK;
    }

    if (!app_config_is_valid(&next_config)) {
        ESP_LOGW(TAG, "event=update_config_rejected reason=resulting_config_invalid");
        return ESP_ERR_INVALID_ARG;
    }

    esp_err_t save_err = nvs_config_save(&next_config);
    if (save_err != ESP_OK) {
        ESP_LOGW(TAG, "event=update_config_persist_failed err=%s", esp_err_to_name(save_err));
        return save_err;
    }

    *runtime_config = next_config;
    ESP_LOGI(TAG, "event=update_config_applied");
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
    // Keep the branchy handler take OTA command flow centralized here so side effects remain easy to audit.
    if (out_cmd == NULL) {
        return false;
    }

    if (!command_handler_take_lock()) {
        return false;
    }

    bool copied = command_handler_take_consumed_payload_locked(out_cmd,
                                                               sizeof(*out_cmd),
                                                               &s_consumed_ota_command,
                                                               &s_consumed_ota_command_valid);
    command_handler_give_lock();
    return copied;
}

/**
 * @brief Consume the latest staged canonical session assignment.
 *
 * @param out_assignment Output mapping payload from the cloud command.
 *
 * @return true if a pending assignment was copied.
 */
bool command_handler_take_session_assignment(command_session_assignment_t *out_assignment) {
    // Keep the branchy handler take session assignment flow centralized here so side effects remain easy to audit.
    if (out_assignment == NULL) {
        return false;
    }

    if (!command_handler_take_lock()) {
        return false;
    }

    bool copied = command_handler_take_consumed_payload_locked(out_assignment,
                                                               sizeof(*out_assignment),
                                                               &s_consumed_session_assignment,
                                                               &s_consumed_session_assignment_valid);
    command_handler_give_lock();
    return copied;
}
