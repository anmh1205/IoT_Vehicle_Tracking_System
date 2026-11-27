#include "cmd_handlers.h"
#include <stddef.h>
#include <string.h>
#include "app_priv.h"
#include "storage/storage.h"

typedef enum { CMD_CONFIG_U16, CMD_CONFIG_BOOL } cmd_config_kind_t;

static const struct {
    const char *key;
    cmd_config_kind_t kind;
    size_t offset;
} k_policy_fields[] = {
    { "tracking_interval_s",       CMD_CONFIG_U16,  offsetof(ivts_config_t, tracking_interval_s) },
    { "heartbeat_interval_s",      CMD_CONFIG_U16,  offsetof(ivts_config_t, heartbeat_interval_s) },
    { "alarm_interval_s",          CMD_CONFIG_U16,  offsetof(ivts_config_t, alarm_interval_s) },
    { "alarm_timeout_s",           CMD_CONFIG_U16,  offsetof(ivts_config_t, alarm_timeout_s) },
    { "ignition_off_hold_ms",       CMD_CONFIG_U16,  offsetof(ivts_config_t, ignition_off_hold_ms) },
    { "ota_min_battery_mv",        CMD_CONFIG_U16,  offsetof(ivts_config_t, ota_min_battery_mv) },
    { "ignition_adc_threshold_mv", CMD_CONFIG_U16,  offsetof(ivts_config_t, ignition_adc_threshold_mv) },
    { "sleep_enabled",            CMD_CONFIG_BOOL, offsetof(ivts_config_t, sleep_enabled) },
    { "imu_wakeup_enabled",       CMD_CONFIG_BOOL, offsetof(ivts_config_t, imu_wakeup_enabled) },
};

static bool apply_policy_field(const ivts_json_obj_t *params, const char *key,
                               cmd_config_kind_t kind, unsigned char *destination)
{
    if (kind == CMD_CONFIG_U16) {
        uint64_t parsed;
        if (!ivts_json_obj_get_u64(params, key, UINT16_MAX, &parsed)) { return false; }
        uint16_t value = (uint16_t)parsed;
        memcpy(destination, &value, sizeof value);
    } else {
        bool value;
        if (!ivts_json_obj_get_bool(params, key, &value)) { return false; }
        memcpy(destination, &value, sizeof value);
    }
    return true;
}

const char *cmd_config_handle(const cmd_envelope_t *command)
{
    ivts_config_t config = g_app.cfg;
    bool present = false;
    for (size_t i = 0; i < sizeof k_policy_fields / sizeof k_policy_fields[0]; i++) {
        const char *key = k_policy_fields[i].key;
        if (!ivts_json_obj_has(&command->params, key)) { continue; }
        if (!apply_policy_field(&command->params, key, k_policy_fields[i].kind,
                                (unsigned char *)&config + k_policy_fields[i].offset)) {
            return "invalid_config";
        }
        present = true;
    }
    if (!present || ivts_config_validate(&config, NULL, 0) != 0u) { return "invalid_config"; }
    if (storage_config_save(&config) != IVTS_OK) { return "persist_failed"; }
    g_app.cfg = config;
    app_apply_config();
    return NULL;
}
