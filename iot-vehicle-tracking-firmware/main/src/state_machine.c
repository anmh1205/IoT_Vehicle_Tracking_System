#include "app_state.h"

#include <stdlib.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "driver/gpio.h"

#include "esp_log.h"
#include "esp_ota_ops.h"
#include "esp_sleep.h"
#include "esp_system.h"

#include "cJSON.h"

#include "adc_reader.h"
#include "ble_init.h"
#include "ble_obd.h"
#include "command_handler.h"
#include "data_formatter.h"
#include "imu_lis3dh.h"
#include "modem_gnss.h"
#include "modem_lte.h"
#include "mqtt_client.h"
#include "obd.h"
#include "pin_map.h"
#include "power_mgr.h"
#include "util.h"

#define OBD_MODE_CURRENT_DATA 0x01

RTC_DATA_ATTR rtc_context_t g_rtc_context = {
    .last_state = APP_STATE_INIT,
    .boot_count = 0,
    .last_heartbeat_ts = 0,
    .ble_mac = {0},
    .ign_last_known = false,
    .last_battery_v = 0.0f,
};

static const char *TAG = "STATE_MACHINE";

#ifndef CONFIG_APP_PROJECT_VER
#define CONFIG_APP_PROJECT_VER "unknown"
#endif

static config_t s_config;
static telemetry_t s_telemetry;
static ble_obd_ctx_t *s_ble_ctx = NULL;
static uint64_t s_last_raw_publish_ms = 0;
static uint64_t s_alarm_enter_ms = 0;
static uint32_t s_session_id = 1;
static bool s_status_running = false;
static bool s_mqtt_started = false;
static bool s_ota_confirm_checked = false;
static char s_current_version[TRACKER_TARGET_VERSION_MAX_LEN] = CONFIG_APP_PROJECT_VER;

int obd_convert_rpm(int32_t *value, const uint8_t *data, size_t len) {
    if (value == NULL || data == NULL || len < 2) {
        return -1;
    }
    *value = ((data[0] << 8) | data[1]) / 4;
    return 0;
}

int obd_convert_percent(int32_t *value, const uint8_t *data, size_t len) {
    if (value == NULL || data == NULL || len < 1) {
        return -1;
    }
    *value = (data[0] * 100) / 255;
    return 0;
}

int obd_convert_temperature(int32_t *value, const uint8_t *data, size_t len) {
    if (value == NULL || data == NULL || len < 1) {
        return -1;
    }
    *value = (int32_t)data[0] - 40;
    return 0;
}

static void state_machine_obd_response_cb(int pid, const uint8_t *data, size_t len, void *usr_ctx) {
    (void)usr_ctx;

    int32_t converted = 0;
    if (pid < 0 || data == NULL || len == 0) {
        return;
    }

    switch ((uint8_t)pid) {
        case 0x0C:
            if (obd_convert_rpm(&converted, data, len) == 0) {
                s_telemetry.obd_rpm = converted;
            }
            break;
        case 0x0D:
            if (len >= 1) {
                s_telemetry.obd_speed = data[0];
            }
            break;
        case 0x05:
            if (obd_convert_temperature(&converted, data, len) == 0) {
                s_telemetry.obd_coolant_temp = converted;
            }
            break;
        case 0x2F:
            if (obd_convert_percent(&converted, data, len) == 0) {
                s_telemetry.obd_fuel_level = converted;
            }
            break;
        case 0x04:
            if (obd_convert_percent(&converted, data, len) == 0) {
                s_telemetry.obd_engine_load = converted;
            }
            break;
        default:
            break;
    }
}

static void state_machine_command_callback(const char *topic, const char *payload) {
    (void)topic;
    command_handler_process(payload);
}

static void state_machine_refresh_telemetry(bool read_gnss, bool read_obd) {
    s_telemetry.battery_top = adc_read_battery_voltage();
    s_telemetry.battery_bot = 3.8f;
    s_telemetry.vibration = imu_get_vibration_composite();

    if (read_obd && s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx)) {
        ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x0C, 300);
        ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x0D, 300);
        ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x05, 300);
        ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x2F, 300);
        ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x04, 300);
    }

    if (read_gnss) {
        gnss_data_t gnss = {0};
        if (modem_gnss_get_location(&gnss) == ESP_OK) {
            s_telemetry.gnss = gnss;
        }
    }

    if (s_telemetry.gnss.timestamp_ms == 0) {
        s_telemetry.gnss.timestamp_ms = util_uptime_ms();
    }

    s_telemetry.ignition = s_telemetry.obd_rpm > 0 || s_telemetry.battery_top > 13.0f;
    s_telemetry.error_code = 0;
}

static void state_machine_publish_rawdata(void) {
    char *payload = data_format_rawdata(&s_config, &s_telemetry);
    if (payload == NULL) {
        return;
    }
    tracker_mqtt_publish_rawdata(payload);
    cJSON_free(payload);
    s_last_raw_publish_ms = util_uptime_ms();
}

static void state_machine_publish_status(const char *status) {
    char *payload = data_format_status(&s_config, status, s_session_id);
    if (payload == NULL) {
        return;
    }
    tracker_mqtt_publish_status(payload);
    cJSON_free(payload);
}

static void state_machine_publish_event(const char *event_type, int code, const char *message) {
    char *payload = data_format_event(&s_config, event_type, code, message);
    if (payload == NULL) {
        return;
    }
    tracker_mqtt_publish_event(payload);
    cJSON_free(payload);
}

static void state_machine_publish_firmware_payload(const firmware_status_t *firmware) {
    if (firmware == NULL) {
        return;
    }

    char *payload = data_format_firmware(&s_config, firmware);
    if (payload == NULL) {
        return;
    }
    tracker_mqtt_publish_firmware(payload);
    cJSON_free(payload);
}

static void state_machine_publish_firmware_status(const char *status,
                                                  uint8_t progress,
                                                  const char *version,
                                                  const char *job_id,
                                                  const char *partition,
                                                  const char *error) {
    firmware_status_t firmware = {0};
    util_copy_string(firmware.status, sizeof(firmware.status), status);
    firmware.progress = progress;
    util_copy_string(firmware.job_id, sizeof(firmware.job_id), job_id);
    util_copy_string(firmware.target_version, sizeof(firmware.target_version), version);
    util_copy_string(firmware.current_version, sizeof(firmware.current_version), s_current_version);
    if (!util_string_empty(partition)) {
        util_copy_string(firmware.partition, sizeof(firmware.partition), partition);
    }
    if (!util_string_empty(error)) {
        util_copy_string(firmware.error, sizeof(firmware.error), error);
    }

    state_machine_publish_firmware_payload(&firmware);
}

static void state_machine_try_connect_ble(void) {
    if (s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx)) {
        return;
    }

    if (!util_string_empty(s_config.obd2_ble_address)) {
        ble_obd_set_preferred_address(s_config.obd2_ble_address);
    }

    ble_stack_init();
    for (int attempt = 0; attempt < 3; ++attempt) {
        s_ble_ctx = ble_obd_connect(state_machine_obd_response_cb, NULL);
        if (s_ble_ctx != NULL) {
            if (ble_obd_elm327_init(s_ble_ctx) == ESP_OK) {
                return;
            }
            ble_obd_disconnect(s_ble_ctx);
            s_ble_ctx = NULL;
        }
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}

static void state_machine_try_connect_network(void) {
    modem_lte_init();
    modem_lte_connect();
    modem_gnss_power_on();

    if (!s_mqtt_started) {
        tracker_mqtt_connect();
        s_mqtt_started = true;
    }

    if (s_config.command_subscribe_enabled) {
        tracker_mqtt_subscribe_commands();
    }
}

static void state_machine_try_confirm_running_firmware(void) {
    if (s_ota_confirm_checked) {
        return;
    }

    s_ota_confirm_checked = true;
    const esp_partition_t *running = esp_ota_get_running_partition();
    if (running != NULL && !util_string_empty(running->label)) {
        util_copy_string(g_rtc_context.ota_partition,
                         sizeof(g_rtc_context.ota_partition),
                         running->label);
    }

    if (!g_rtc_context.ota_pending_confirm) {
        return;
    }

    state_machine_publish_firmware_status("confirming",
                                          99,
                                          g_rtc_context.ota_target_version,
                                          g_rtc_context.ota_job_id,
                                          g_rtc_context.ota_partition,
                                          "");

    if (esp_ota_mark_app_valid_cancel_rollback() == ESP_OK) {
        g_rtc_context.ota_pending_confirm = false;
        util_copy_string(s_current_version, sizeof(s_current_version), g_rtc_context.ota_target_version);
        state_machine_publish_firmware_status("success",
                                              100,
                                              g_rtc_context.ota_target_version,
                                              g_rtc_context.ota_job_id,
                                              g_rtc_context.ota_partition,
                                              "");
    } else {
        state_machine_publish_firmware_status("failed",
                                              100,
                                              g_rtc_context.ota_target_version,
                                              g_rtc_context.ota_job_id,
                                              g_rtc_context.ota_partition,
                                              "confirm_failed");
    }
}

static void state_machine_process_ota_command(command_action_t action) {
    if (action != COMMAND_ACTION_OTA_UPDATE && action != COMMAND_ACTION_OTA_ROLLBACK) {
        return;
    }

    ota_command_t cmd = {0};
    if (!command_handler_take_ota_command(&cmd)) {
        return;
    }

    if (action == COMMAND_ACTION_OTA_ROLLBACK || cmd.rollback_pending) {
        firmware_status_t rollback = {0};
        util_copy_string(rollback.job_id, sizeof(rollback.job_id), g_rtc_context.ota_job_id);
        util_copy_string(rollback.target_version, sizeof(rollback.target_version), g_rtc_context.ota_previous_version);
        util_copy_string(rollback.current_version, sizeof(rollback.current_version), s_current_version);

        if (util_ota_trigger_manual_rollback(&rollback) == ESP_OK) {
            g_rtc_context.ota_pending_confirm = false;
            state_machine_publish_firmware_payload(&rollback);
            esp_restart();
        } else {
            state_machine_publish_firmware_status("failed",
                                                  100,
                                                  g_rtc_context.ota_previous_version,
                                                  g_rtc_context.ota_job_id,
                                                  g_rtc_context.ota_partition,
                                                  "manual_rollback_failed");
        }
        return;
    }

    firmware_status_t report = {0};
    util_copy_string(report.job_id, sizeof(report.job_id), cmd.job_id);
    util_copy_string(report.target_version, sizeof(report.target_version), cmd.version);
    util_copy_string(report.current_version, sizeof(report.current_version), s_current_version);

    state_machine_publish_firmware_status("assigned", 0, cmd.version, cmd.job_id, "", "");

    if (util_ota_apply_update(&s_config, s_current_version, &cmd, &report) == ESP_OK) {
        util_copy_string(g_rtc_context.ota_job_id, sizeof(g_rtc_context.ota_job_id), cmd.job_id);
        util_copy_string(g_rtc_context.ota_target_version,
                         sizeof(g_rtc_context.ota_target_version),
                         cmd.version);
        util_copy_string(g_rtc_context.ota_previous_version,
                         sizeof(g_rtc_context.ota_previous_version),
                         s_current_version);
        util_copy_string(g_rtc_context.ota_partition,
                         sizeof(g_rtc_context.ota_partition),
                         report.partition);
        g_rtc_context.ota_pending_confirm = true;
        g_rtc_context.ota_confirm_timeout_sec = cmd.confirm_timeout_sec;

        state_machine_publish_firmware_payload(&report);
        esp_restart();
    } else {
        state_machine_publish_firmware_payload(&report);
    }
}

static void state_machine_prepare_sleep(void) {
    g_rtc_context.last_state = APP_STATE_SLEEP;
    g_rtc_context.ign_last_known = s_telemetry.ignition;
    g_rtc_context.last_battery_v = s_telemetry.battery_top;
    g_rtc_context.last_heartbeat_ts = (uint32_t)(util_uptime_ms() / 1000ULL);

    if (s_ble_ctx != NULL) {
        ble_obd_disconnect(s_ble_ctx);
        s_ble_ctx = NULL;
    }
    ble_stack_deinit();

    modem_gnss_power_off();
    modem_lte_disconnect();
    modem_power_off();

    charger_disable();
    power_select_backup();

    gpio_set_level(PIN_MODEM_PWRKEY, 0);

    esp_sleep_enable_ext0_wakeup(PIN_LIS3DH_INT, 1);
    esp_sleep_enable_timer_wakeup((uint64_t)s_config.heartbeat_interval_s * 1000000ULL);
}

esp_err_t state_machine_init(const config_t *config) {
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");

    memset(&s_telemetry, 0, sizeof(s_telemetry));
    s_config = *config;

    if (!util_string_empty(CONFIG_APP_PROJECT_VER)) {
        util_copy_string(s_current_version, sizeof(s_current_version), CONFIG_APP_PROJECT_VER);
    }

    ESP_RETURN_ON_FALSE(adc_reader_init() == ESP_OK, ESP_FAIL, TAG, "adc_reader_init failed");
    ESP_RETURN_ON_FALSE(imu_init() == ESP_OK, ESP_FAIL, TAG, "imu_init failed");
    ESP_RETURN_ON_FALSE(power_mgr_init() == ESP_OK, ESP_FAIL, TAG, "power_mgr_init failed");
    ESP_RETURN_ON_FALSE(modem_lte_init() == ESP_OK, ESP_FAIL, TAG, "modem_lte_init failed");
    ESP_RETURN_ON_FALSE(tracker_mqtt_init(&s_config) == ESP_OK, ESP_FAIL, TAG, "tracker_mqtt_init failed");
    tracker_mqtt_set_command_callback(state_machine_command_callback);

    if (s_config.command_subscribe_enabled) {
        command_handler_init(&s_config);
    }

    state_machine_try_confirm_running_firmware();
    state_machine_publish_firmware_status("success", 100, s_current_version, "", "", "");
    return ESP_OK;
}

app_state_t state_machine_run(app_state_t current_state) {
    switch (current_state) {
        case APP_STATE_INIT:
            g_rtc_context.last_state = APP_STATE_INIT;
            return APP_STATE_CHECK_IGN;

        case APP_STATE_CHECK_IGN:
            state_machine_try_connect_ble();
            state_machine_refresh_telemetry(false, true);
            g_rtc_context.ign_last_known = s_telemetry.ignition;
            return s_telemetry.ignition ? APP_STATE_DRIVING : APP_STATE_PARKED;

        case APP_STATE_DRIVING: {
            state_machine_try_connect_network();
            state_machine_refresh_telemetry(true, true);

            if (!s_status_running) {
                state_machine_publish_status("running");
                s_status_running = true;
            }

            uint64_t now_ms = util_uptime_ms();
            if ((now_ms - s_last_raw_publish_ms) >= ((uint64_t)s_config.tracking_interval_s * 1000ULL) ||
                command_handler_consume_location_request()) {
                state_machine_publish_rawdata();
            }

            command_action_t action = command_handler_consume_action();
            if (action == COMMAND_ACTION_REBOOT) {
                esp_restart();
            }
            state_machine_process_ota_command(action);

            if (!s_telemetry.ignition || !command_handler_is_tracking_enabled()) {
                state_machine_publish_status("stopped");
                s_status_running = false;
                return APP_STATE_PARKED;
            }

            return APP_STATE_DRIVING;
        }

        case APP_STATE_PARKED:
            state_machine_publish_status("stopped");
            s_status_running = false;
            return APP_STATE_SLEEP;

        case APP_STATE_ALARM: {
            state_machine_try_connect_network();
            state_machine_refresh_telemetry(true, false);
            state_machine_process_ota_command(command_handler_consume_action());

            if (s_alarm_enter_ms == 0) {
                s_alarm_enter_ms = util_uptime_ms();
                state_machine_publish_event("warning", 1001, "motion_detected");
            }

            uint64_t now_ms = util_uptime_ms();
            if ((now_ms - s_last_raw_publish_ms) >= 5000ULL) {
                state_machine_publish_rawdata();
            }

            if (s_telemetry.ignition) {
                s_alarm_enter_ms = 0;
                return APP_STATE_DRIVING;
            }

            if (!imu_motion_detected() || (now_ms - s_alarm_enter_ms) >= 300000ULL) {
                s_alarm_enter_ms = 0;
                return APP_STATE_PARKED;
            }

            return APP_STATE_ALARM;
        }

        case APP_STATE_HEARTBEAT:
            state_machine_try_connect_network();
            state_machine_refresh_telemetry(true, false);
            state_machine_publish_rawdata();
            state_machine_process_ota_command(command_handler_consume_action());
            return APP_STATE_SLEEP;

        case APP_STATE_SLEEP:
            state_machine_prepare_sleep();
            esp_deep_sleep_start();
            return APP_STATE_SLEEP;

        default:
            return APP_STATE_INIT;
    }
}

telemetry_t state_machine_get_telemetry(void) {
    return s_telemetry;
}
