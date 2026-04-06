#include "app_state.h"

#include <stdlib.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "driver/gpio.h"

#include "esp_err.h"
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
#include "imu_lis3dsh.h"
#include "modem_gnss.h"
#include "modem_lte.h"
#include "mqtt_client.h"
#include "obd.h"
#include "offline_queue.h"
#include "pin_map.h"
#include "power_mgr.h"
#include "session_mgr.h"
#include "telemetry_counters.h"
#include "util.h"

/**
 * @file state_machine.c
 * @brief Main tracker runtime finite-state machine and subsystem orchestration.
 */

#define OBD_MODE_CURRENT_DATA 0x01
/* Current hardware revision has no IMU mounted; keep IMU path optional. */
#define TRACKER_ENABLE_IMU 0
#define TRACKER_BLE_RETRY_BACKOFF_MS 1000ULL
#define TRACKER_NETWORK_RETRY_MIN_BACKOFF_MS 30000ULL
#define TRACKER_NETWORK_RETRY_MAX_BACKOFF_MS 300000ULL
#define TRACKER_OBD_DEBUG_LOG_INTERVAL_MS 1000ULL
#define TRACKER_OBD_POLL_INTERVAL_MS 1000ULL
#define TRACKER_OBD_PID_TIMEOUT_MS 500U

/* RTC-retained context survives deep sleep and helps OTA/session continuity. */
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
static uint64_t s_last_obd_debug_log_ms = 0;
static uint64_t s_last_obd_poll_ms = 0;
static uint32_t s_session_id = 1;
static uint64_t s_ignition_off_started_ms = 0;
static bool s_status_running = false;
static bool s_mqtt_started = false;
static bool s_ota_confirm_checked = false;
static bool s_imu_available = false;
static uint64_t s_ble_retry_not_before_ms = 0;
static uint32_t s_ble_retry_attempts = 0;
static uint64_t s_network_retry_not_before_ms = 0;
static uint32_t s_network_retry_attempts = 0;
static char s_current_version[TRACKER_TARGET_VERSION_MAX_LEN] = CONFIG_APP_PROJECT_VER;

/**
 * @brief Convert OBD RPM payload bytes to integer RPM.
 */
int obd_convert_rpm(int32_t *value, const uint8_t *data, size_t len) {
    if (value == NULL || data == NULL || len < 2) {
        return -1;
    }
    *value = ((data[0] << 8) | data[1]) / 4;
    return 0;
}

/**
 * @brief Convert OBD percentage payload byte to percentage.
 */
int obd_convert_percent(int32_t *value, const uint8_t *data, size_t len) {
    if (value == NULL || data == NULL || len < 1) {
        return -1;
    }
    *value = (data[0] * 100) / 255;
    return 0;
}

/**
 * @brief Convert OBD temperature payload byte to Celsius.
 */
int obd_convert_temperature(int32_t *value, const uint8_t *data, size_t len) {
    if (value == NULL || data == NULL || len < 1) {
        return -1;
    }
    *value = (int32_t)data[0] - 40;
    return 0;
}

/**
 * @brief Callback for parsed OBD responses.
 *
 * @param pid Requested PID.
 * @param data Response payload bytes.
 * @param len Payload length.
 * @param usr_ctx User context (unused).
 */
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

/**
 * @brief MQTT command callback forwarding payload to command parser.
 */
static void state_machine_command_callback(const char *topic, const char *payload) {
    (void)topic;
    command_handler_process(payload);
}

static void state_machine_puback_callback(int msg_id) {
    offline_queue_handle_publish_ack(msg_id);
}

/**
 * @brief Refresh telemetry snapshot from sensors/modem/OBD.
 *
 * @param read_gnss True to poll GNSS.
 * @param read_obd True to poll OBD PIDs.
 */
static void state_machine_refresh_telemetry(bool read_gnss, bool read_obd) {
    /* Always sample local board sensors first. */
    s_telemetry.battery_top = adc_read_battery_voltage();
    s_telemetry.battery_bot = 3.8f;
    s_telemetry.vibration = s_imu_available ? imu_get_vibration_composite() : 0;

    /* Pull selected OBD PIDs when BLE OBD session is connected. */
    if (read_obd && s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx)) {
        uint64_t now_ms = util_uptime_ms();

        if ((now_ms - s_last_obd_poll_ms) >= TRACKER_OBD_POLL_INTERVAL_MS) {
            ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x0C, TRACKER_OBD_PID_TIMEOUT_MS);
            ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x0D, TRACKER_OBD_PID_TIMEOUT_MS);
            ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x05, TRACKER_OBD_PID_TIMEOUT_MS);
            ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x2F, TRACKER_OBD_PID_TIMEOUT_MS);
            ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x04, TRACKER_OBD_PID_TIMEOUT_MS);
            s_last_obd_poll_ms = now_ms;
        }

        if ((now_ms - s_last_obd_debug_log_ms) >= TRACKER_OBD_DEBUG_LOG_INTERVAL_MS) {
            ESP_LOGI(TAG,
                     "OBD pid-values rpm=%ld speed=%ld coolant=%ld fuel=%ld load=%ld",
                     (long)s_telemetry.obd_rpm,
                     (long)s_telemetry.obd_speed,
                     (long)s_telemetry.obd_coolant_temp,
                     (long)s_telemetry.obd_fuel_level,
                     (long)s_telemetry.obd_engine_load);
            s_last_obd_debug_log_ms = now_ms;
        }
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

    /* Ignition heuristic: running engine or charging voltage detected. */
    s_telemetry.ignition = s_telemetry.obd_rpm > 0 || s_telemetry.battery_top > 13.0f;
    s_telemetry.error_code = 0;
}

/**
 * @brief Format and publish rawdata payload.
 */
static void state_machine_publish_rawdata(void) {
    char *payload = data_format_rawdata(&s_config, &s_telemetry, true);
    if (payload == NULL) {
        return;
    }

    (void)offline_queue_enqueue(OFFLINE_RECORD_RAWDATA,
                                payload,
                                s_telemetry.gnss.fix_valid,
                                tracker_mqtt_is_connected());
    cJSON_free(payload);
    s_last_raw_publish_ms = util_uptime_ms();
}

/**
 * @brief Format and publish status payload.
 *
 * @param status Status string.
 */
static void state_machine_publish_status(const char *status) {
    char *payload = data_format_status(&s_config, status, s_session_id, true);
    if (payload == NULL) {
        return;
    }

    (void)offline_queue_enqueue(OFFLINE_RECORD_STATUS,
                                payload,
                                s_telemetry.gnss.fix_valid,
                                tracker_mqtt_is_connected());
    cJSON_free(payload);
}

/**
 * @brief Format and publish event payload.
 */
static void state_machine_publish_event(const char *event_type, int code, const char *message) {
    char *payload = data_format_event(&s_config, event_type, code, message, true);
    if (payload == NULL) {
        return;
    }

    (void)offline_queue_enqueue(OFFLINE_RECORD_EVENT,
                                payload,
                                s_telemetry.gnss.fix_valid,
                                tracker_mqtt_is_connected());
    cJSON_free(payload);
}

/**
 * @brief Publish firmware payload object to firmware topic.
 *
 * @param firmware Firmware status object.
 */
static void state_machine_publish_firmware_payload(const firmware_status_t *firmware) {
    if (firmware == NULL) {
        return;
    }

    char *payload = data_format_firmware(&s_config, firmware, true);
    if (payload == NULL) {
        return;
    }

    (void)offline_queue_enqueue(OFFLINE_RECORD_FIRMWARE,
                                payload,
                                s_telemetry.gnss.fix_valid,
                                tracker_mqtt_is_connected());
    cJSON_free(payload);
}

/**
 * @brief Build firmware status payload fields then publish.
 */
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

/**
 * @brief Attempt BLE OBD connection with retry and ELM327 initialization.
 */
static void state_machine_schedule_ble_retry(uint64_t now_ms, const char *reason) {
    s_ble_retry_not_before_ms = now_ms + TRACKER_BLE_RETRY_BACKOFF_MS;
    s_ble_retry_attempts += 1;

    if ((s_ble_retry_attempts % 10U) == 1U) {
        ESP_LOGE(TAG,
                 "BLE/OBD unavailable (%s), retry in %lus (attempt=%lu)",
                 reason,
                 (unsigned long)(TRACKER_BLE_RETRY_BACKOFF_MS / 1000ULL),
                 (unsigned long)s_ble_retry_attempts);
    }
}

static void state_machine_try_connect_ble(void) {
    if (s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx)) {
        return;
    }

    uint64_t now_ms = util_uptime_ms();
    if (now_ms < s_ble_retry_not_before_ms) {
        return;
    }

    if (s_ble_ctx != NULL) {
        ble_obd_disconnect(s_ble_ctx);
        s_ble_ctx = NULL;
    }

    bool use_preferred_mac = !util_string_empty(s_config.obd2_ble_address) &&
                             ble_obd_set_preferred_address(s_config.obd2_ble_address) == ESP_OK;
    if (!use_preferred_mac) {
        ble_obd_set_preferred_address("");
        if ((s_ble_retry_attempts % 10U) == 0U) {
            ESP_LOGW(TAG, "BLE connect mode: auto-discover (preferred MAC missing/invalid)");
        }
    } else if ((s_ble_retry_attempts % 10U) == 0U) {
        ESP_LOGI(TAG, "BLE connect mode: preferred-mac (%s)", s_config.obd2_ble_address);
    }

    /* One connect attempt per retry window to avoid log storms. */
    s_ble_ctx = ble_obd_connect(state_machine_obd_response_cb, NULL);
    if (s_ble_ctx != NULL) {
        if (ble_obd_elm327_init(s_ble_ctx) == ESP_OK) {
            s_ble_retry_not_before_ms = 0;
            s_ble_retry_attempts = 0;
            return;
        }
        ble_obd_disconnect(s_ble_ctx);
        s_ble_ctx = NULL;
    }

    state_machine_schedule_ble_retry(now_ms, "connect_or_ble_stack_or_elm327_init_failed");
}

/**
 * @brief Bring up LTE/GNSS/MQTT network stack.
 */
static void state_machine_schedule_network_retry(uint64_t now_ms, const char *step, esp_err_t err) {
    uint64_t backoff_ms = TRACKER_NETWORK_RETRY_MIN_BACKOFF_MS;
    if (s_network_retry_attempts > 0) {
        uint32_t shift = s_network_retry_attempts > 4 ? 4 : s_network_retry_attempts;
        backoff_ms <<= shift;
        if (backoff_ms > TRACKER_NETWORK_RETRY_MAX_BACKOFF_MS) {
            backoff_ms = TRACKER_NETWORK_RETRY_MAX_BACKOFF_MS;
        }
    }

    s_network_retry_not_before_ms = now_ms + backoff_ms;
    s_network_retry_attempts += 1;

    ESP_LOGE(TAG,
             "%s failed: %s, retry in %lus (attempt=%lu)",
             step,
             esp_err_to_name(err),
             (unsigned long)(backoff_ms / 1000ULL),
             (unsigned long)s_network_retry_attempts);
}

static void state_machine_try_connect_network(void) {
    uint64_t now_ms = util_uptime_ms();
    if (now_ms < s_network_retry_not_before_ms) {
        return;
    }

    esp_err_t err = modem_lte_init();
    if (err != ESP_OK) {
        state_machine_schedule_network_retry(now_ms, "modem_lte_init", err);
        return;
    }

    err = modem_lte_connect();
    if (err != ESP_OK) {
        state_machine_schedule_network_retry(now_ms, "modem_lte_connect", err);
        return;
    }

    err = modem_gnss_power_on();
    if (err != ESP_OK) {
        state_machine_schedule_network_retry(now_ms, "modem_gnss_power_on", err);
        return;
    }

    if (!s_mqtt_started) {
        /* Start MQTT client only once. */
        err = tracker_mqtt_connect();
        if (err != ESP_OK) {
            state_machine_schedule_network_retry(now_ms, "tracker_mqtt_connect", err);
            return;
        }
        s_mqtt_started = true;
    }

    s_network_retry_attempts = 0;
    s_network_retry_not_before_ms = 0;

    if (s_config.command_subscribe_enabled) {
        err = tracker_mqtt_subscribe_commands();
        if (err != ESP_OK) {
            state_machine_schedule_network_retry(now_ms, "tracker_mqtt_subscribe_commands", err);
            return;
        }
    }

    s_network_retry_not_before_ms = 0;
}

/**
 * @brief Confirm newly booted OTA image if pending confirmation flag is set.
 */
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

    /* Mark image valid to prevent automatic rollback on next boot. */
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

/**
 * @brief Process OTA update/rollback actions consumed from command handler.
 *
 * @param action Pending command action.
 */
static void state_machine_process_ota_command(command_action_t action) {
    if (action != COMMAND_ACTION_OTA_UPDATE && action != COMMAND_ACTION_OTA_ROLLBACK) {
        return;
    }

    ota_command_t cmd = {0};
    if (!command_handler_take_ota_command(&cmd)) {
        return;
    }

    if (action == COMMAND_ACTION_OTA_ROLLBACK || cmd.rollback_pending) {
        /* Manual rollback flow. */
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

    /* OTA update flow. */
    state_machine_publish_firmware_status("assigned", 0, cmd.version, cmd.job_id, "", "");

    if (util_ota_apply_update(&s_config, s_current_version, &cmd, &report) == ESP_OK) {
        /* Persist OTA context across reboot in RTC memory for post-boot confirm. */
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

/**
 * @brief Prepare peripherals and wakeup sources before deep sleep.
 */
static void state_machine_prepare_sleep(void) {
    /* Snapshot context into RTC memory before shutdown. */
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

    (void)modem_set_dtr(true);
    gpio_set_level(PIN_MODEM_PWRKEY, 0);

    /* Wake by motion interrupt only when IMU path is active. */
    if (s_imu_available) {
        esp_sleep_enable_ext0_wakeup(PIN_LIS3DSH_INT, 1);
    }
    esp_sleep_enable_timer_wakeup((uint64_t)s_config.heartbeat_interval_s * 1000000ULL);
}

/**
 * @brief Initialize subsystem stack used by state machine.
 *
 * @param config Runtime configuration.
 *
 * @return ESP_OK on success, otherwise error.
 */
esp_err_t state_machine_init(const config_t *config) {
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");

    memset(&s_telemetry, 0, sizeof(s_telemetry));
    s_config = *config;

    if (!util_string_empty(CONFIG_APP_PROJECT_VER)) {
        util_copy_string(s_current_version, sizeof(s_current_version), CONFIG_APP_PROJECT_VER);
    }

    /* Bring up local sensors, modem, and transport modules. */
    ESP_RETURN_ON_FALSE(adc_reader_init() == ESP_OK, ESP_FAIL, TAG, "adc_reader_init failed");
#if TRACKER_ENABLE_IMU
    if (imu_init() == ESP_OK) {
        s_imu_available = true;
        esp_err_t motion_cfg_err = imu_configure_motion_interrupt(120, 200);
        if (motion_cfg_err != ESP_OK) {
            ESP_LOGW(TAG, "imu_configure_motion_interrupt failed: %s", esp_err_to_name(motion_cfg_err));
        }
    } else {
        s_imu_available = false;
        ESP_LOGW(TAG, "IMU init failed, continuing without motion sensing");
    }
#else
    s_imu_available = false;
    ESP_LOGW(TAG, "IMU init skipped (TRACKER_ENABLE_IMU=0)");
#endif
    ESP_RETURN_ON_FALSE(power_mgr_init() == ESP_OK, ESP_FAIL, TAG, "power_mgr_init failed");
    esp_err_t modem_init_err = modem_lte_init();
    if (modem_init_err != ESP_OK) {
        s_network_retry_not_before_ms = util_uptime_ms() + TRACKER_NETWORK_RETRY_MIN_BACKOFF_MS;
        s_network_retry_attempts = 1;
        ESP_LOGE(TAG,
                 "modem_lte_init failed: %s (continuing without LTE, retry in %lus)",
                 esp_err_to_name(modem_init_err),
                 (unsigned long)(TRACKER_NETWORK_RETRY_MIN_BACKOFF_MS / 1000ULL));
    }
    ESP_RETURN_ON_FALSE(tracker_mqtt_init(&s_config) == ESP_OK, ESP_FAIL, TAG, "tracker_mqtt_init failed");
    ESP_RETURN_ON_FALSE(offline_queue_init() == ESP_OK, ESP_FAIL, TAG, "offline_queue_init failed");
    telemetry_counters_reset();
    session_mgr_init();
    tracker_mqtt_set_command_callback(state_machine_command_callback);
    tracker_mqtt_set_puback_callback(state_machine_puback_callback);

    if (s_config.command_subscribe_enabled) {
        command_handler_init(&s_config);
    }

    /* Handle post-OTA confirmation and publish initial firmware status on boot. */
    state_machine_try_confirm_running_firmware();
    state_machine_publish_firmware_status("success", 100, s_current_version, "", "", "");
    return ESP_OK;
}

/**
 * @brief Execute one finite-state-machine iteration.
 *
 * @param current_state Current state.
 *
 * @return Next state.
 */
app_state_t state_machine_run(app_state_t current_state) {
    switch (current_state) {
        case APP_STATE_INIT:
            g_rtc_context.last_state = APP_STATE_INIT;
            offline_queue_set_online(tracker_mqtt_is_connected());
            return APP_STATE_CHECK_IGN;

        case APP_STATE_CHECK_IGN: {
            /* Quickly probe ignition proxies and choose run/sleep branch. */
            state_machine_try_connect_ble();
            state_machine_refresh_telemetry(false, true);
            bool ble_connected = (s_ble_ctx != NULL) && ble_obd_is_connected(s_ble_ctx);
            session_mgr_on_ignition_sample(s_telemetry.ignition, util_uptime_ms());
            g_rtc_context.ign_last_known = s_telemetry.ignition;
            return (s_telemetry.ignition || ble_connected) ? APP_STATE_DRIVING : APP_STATE_PARKED;
        }

        case APP_STATE_DRIVING: {
            /* Full online mode with high-frequency telemetry and command handling. */
            state_machine_try_connect_ble();
            state_machine_try_connect_network();
            state_machine_refresh_telemetry(true, true);
            offline_queue_set_online(tracker_mqtt_is_connected());
            offline_queue_replay_tick();

            session_mgr_on_ignition_sample(s_telemetry.ignition, util_uptime_ms());
            if (session_mgr_should_start()) {
                session_mgr_mark_started(util_uptime_ms());
                s_session_id = session_mgr_current_session_id();
                offline_queue_set_session(s_session_id);
            }

            if (!s_status_running) {
                state_machine_publish_status("running");
                s_status_running = true;
            }

            uint64_t now_ms = util_uptime_ms();
            bool should_publish_raw = ((now_ms - s_last_raw_publish_ms) >= ((uint64_t)s_config.tracking_interval_s * 1000ULL)) ||
                                      command_handler_consume_location_request();
            if (should_publish_raw && !offline_queue_should_throttle_rawdata()) {
                state_machine_publish_rawdata();
            }

            command_action_t action = command_handler_consume_action();
            if (action == COMMAND_ACTION_REBOOT) {
                esp_restart();
            }
            state_machine_process_ota_command(action);

            bool tracking_enabled = command_handler_is_tracking_enabled();
            bool ble_connected = (s_ble_ctx != NULL) && ble_obd_is_connected(s_ble_ctx);

            if (!ble_connected && (!s_telemetry.ignition || !tracking_enabled) && s_ignition_off_started_ms == 0) {
                s_ignition_off_started_ms = now_ms;
                state_machine_publish_status("stopped");
                s_status_running = false;
            }

            if (ble_connected) {
                s_ignition_off_started_ms = 0;
            }

            if (!ble_connected && s_ignition_off_started_ms != 0 &&
                (now_ms - s_ignition_off_started_ms) >= session_mgr_drain_timeout_ms()) {
                offline_queue_stop_session(true);
                session_mgr_mark_stopped(now_ms);
                s_ignition_off_started_ms = 0;
                return APP_STATE_PARKED;
            }

            return APP_STATE_DRIVING;
        }

        case APP_STATE_PARKED:
            /* Transition stop status before sleeping. */
            state_machine_publish_status("stopped");
            s_status_running = false;
            return APP_STATE_SLEEP;

        case APP_STATE_ALARM: {
            /* Alarm mode after motion wakeup: publish event + periodic rawdata. */
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

            if (!s_imu_available || !imu_motion_detected() || (now_ms - s_alarm_enter_ms) >= 300000ULL) {
                s_alarm_enter_ms = 0;
                return APP_STATE_PARKED;
            }

            return APP_STATE_ALARM;
        }

        case APP_STATE_HEARTBEAT:
            /* Timer wake heartbeat path: one data publish then return to sleep. */
            state_machine_try_connect_network();
            state_machine_refresh_telemetry(true, false);
            state_machine_publish_rawdata();
            state_machine_process_ota_command(command_handler_consume_action());
            return APP_STATE_SLEEP;

        case APP_STATE_SLEEP:
            /* Sleep path never returns in practice (deep sleep reset follows). */
            state_machine_prepare_sleep();
            esp_deep_sleep_start();
            return APP_STATE_SLEEP;

        default:
            return APP_STATE_INIT;
    }
}

/**
 * @brief Return current telemetry snapshot copy.
 *
 * @return Telemetry structure.
 */
telemetry_t state_machine_get_telemetry(void) {
    return s_telemetry;
}
