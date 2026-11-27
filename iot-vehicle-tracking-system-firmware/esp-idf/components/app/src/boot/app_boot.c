/**
 * @file app_boot.c
 * @brief Ordered startup, recovery of persisted state and boot identity.
 *
 * Open the event queue before starting producers. Load NVS and resolve
 * provisioning before connecting the modem, then restore the OTA boot context.
 */
#include "persist/persist.h"
#include "boot/boot.h"
#include "motion_alarm.h"
#include "app_internal.h"
#include "board/board_power.h"
#include "command/command.h"
#include "device/device.h"
#include "esp_log.h"
#include "esp_random.h"
#include "esp_system.h"
#include "fw_update.h"
#include "ivts_core/base/str.h"
#include "runtime/runtime.h"
#include "sdkconfig.h"
#include "session_tracker.h"
#include "storage/storage.h"

static bool fill_deploy_defaults(ivts_config_t *c)
{
    const struct { char *dst; size_t size; const char *value; } fields[] = {
        { c->device_id, sizeof c->device_id, CONFIG_IVTS_DEFAULT_DEVICE_ID },
        { c->auth_token, sizeof c->auth_token, CONFIG_IVTS_DEFAULT_AUTH_TOKEN },
        { c->mqtt_host, sizeof c->mqtt_host, CONFIG_IVTS_MQTT_HOST },
        { c->apn, sizeof c->apn, CONFIG_IVTS_APN },
        { c->mqtt_username, sizeof c->mqtt_username, CONFIG_IVTS_MQTT_USER },
        { c->mqtt_password, sizeof c->mqtt_password, CONFIG_IVTS_MQTT_PASS },
    };
    bool ok = true;
    for (size_t i = 0; i < sizeof fields / sizeof fields[0]; i++) {
        if (fields[i].dst[0] == '\0' && ivts_str_copy(fields[i].dst, fields[i].size, fields[i].value) != IVTS_OK) {
            fields[i].dst[0] = '\0';
            ok = false;
        }
    }
    if (c->mqtt_port == 0u) { c->mqtt_port = (uint16_t)CONFIG_IVTS_MQTT_PORT; }
    return ok;
}

static bool init_event_queue(void)
{
    if (app_events_init()) { return true; }
    ESP_LOGE(APP_TAG, "queue");
    return false;
}

static void load_persisted_state(ivts_config_t *config)
{
    app_cmd_init();
    (void)storage_config_load(config);
    bool tracking_enabled = app_device_tracking_enabled();
    (void)app_records_tracking_load(&tracking_enabled);
    app_device_set_tracking_enabled(tracking_enabled);
    app_session_restore();
    app_alarm_restore();
}

static bool resolve_provisioning(ivts_config_t *config)
{
    bool defaults_ok = fill_deploy_defaults(config);
    ivts_cfg_issue_t config_issues[IVTS_CFG_F_COUNT];
    size_t config_issue_count = ivts_config_validate(config, config_issues, IVTS_CFG_F_COUNT);
    for (size_t i = 0; i < config_issue_count && i < IVTS_CFG_F_COUNT; i++) {
        ESP_LOGW(APP_TAG, "config field %u reason %u", config_issues[i].field, config_issues[i].reason);
    }
    return defaults_ok && config_issue_count == 0u;
}

static void restore_boot_identity(void)
{
    /*
     * Keep the boot ID on a deep-sleep wake with valid RTC context. For a cold
     * boot or invalid context, allocate a new boot ID from NVS.
     */
    uint32_t seq = 0;
    uint32_t boot_id = 0;
    if (esp_reset_reason() != ESP_RST_DEEPSLEEP || !app_rtc_ctx_load(&boot_id, &seq)) {
        if (storage_boot_id_next(&boot_id) != IVTS_OK) { boot_id = esp_random(); }
        app_rtc_ctx_save(boot_id, 0, 0);
    }
    app_device_set_boot_id(boot_id);
}

bool app_boot_init(void)
{
    if (!init_event_queue()) { return false; }
    ivts_sink_t sink = app_events_sink();
    if (!app_wiring_init_board(sink) || !app_wiring_init_storage(sink)) { return false; }

    ivts_config_t config = {0};
    load_persisted_state(&config);
    bool provisioned = resolve_provisioning(&config);
    /*
     * Disable automatic light sleep. The app sleep controller coordinates
     * modem and BLE shutdown before asking the board to sleep.
     */
    ivts_err_t e = board_set_auto_light_sleep(false);
    if (e != IVTS_OK) { ESP_LOGW(APP_TAG, "power management: %s", ivts_err_name(e)); }
    app_config_apply(&config);
    restore_boot_identity();
    if (!app_wiring_init_modem(sink, &config, provisioned)) { return false; }
    app_wiring_init_obd(sink, &config);
    if (!app_wiring_init_ota(sink)) { return false; }

    app_device_set_config(&config);
    app_device_bind_config_handler(app_config_apply);
    app_fw_update_restore_at_boot();
    app_wiring_register_acks();
    ESP_LOGI(APP_TAG, "init xong boot_id=%lu provisioned=%d sd=%d", (unsigned long)app_device_boot_id(),
             provisioned, storage_sd_ok());
    return true;
}
