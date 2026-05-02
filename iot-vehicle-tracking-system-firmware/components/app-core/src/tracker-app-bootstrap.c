#include "tracker-app-bootstrap.h"

#include "app_state.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"
#include "esp_ota_ops.h"
#include "esp_sleep.h"
#include "esp_task_wdt.h"
#include "sdkconfig.h"

#include "ble_obd.h"
#include "modem_lte.h"
#include "mqtt_client.h"
#include "nvs_config.h"
#include "offline_queue.h"
#include "ota_executor.h"
#include "power_mgr.h"
#include "retry_manager.h"
#include "rtc_ds3231m.h"
#include "tracker-runtime-ports.h"
#include "util.h"

/**
 * @file tracker-app-bootstrap.c
 * @brief Main firmware bootstrap and runtime loop with explicit port-registry validation.
 */

/* Logging tag for main application module. */
static const char *TAG = "TRACKER_MAIN";

/** Init retry state. */
static retry_state_t s_init_retry = {0};
/** Init retry policy. */
static const retry_policy_t s_init_retry_policy = {
    .mode = RETRY_MODE_FIXED,
    .base_delay_ms = 10000,
    .max_delay_ms = 10000,
    .max_attempts = 0,
    .jitter_ms = 0,
};

/**
 * @brief Port wrapper for offline queue enqueue.
 */
static esp_err_t tracker_storage_queue_enqueue_port(int record_type,
                                                    const char *payload,
                                                    bool gps_fix,
                                                    bool net_up,
                                                    bool time_trusted,
                                                    uint64_t timestamp_ms) {
    return offline_queue_enqueue((offline_record_type_t)record_type,
                                 payload,
                                 gps_fix,
                                 net_up,
                                 time_trusted,
                                 timestamp_ms);
}

static void tracker_mqtt_set_command_callback_port(tracker_command_message_callback_t cb) {
    tracker_mqtt_set_command_callback(cb);
}

static void *tracker_obd_connect_port(tracker_obd_response_callback_t response_cb,
                                      void *user_ctx,
                                      uint32_t connect_timeout_ms) {
    return ble_obd_connect((ble_obd_response_cb_t)response_cb, user_ctx, connect_timeout_ms);
}

static esp_err_t tracker_obd_disconnect_port(void *ctx) {
    return ble_obd_disconnect((ble_obd_ctx_t *)ctx);
}

static bool tracker_obd_is_connected_port(void *ctx) {
    return ble_obd_is_connected((ble_obd_ctx_t *)ctx);
}

static int tracker_obd_request_pid_port(void *ctx, uint8_t mode, uint8_t pid, uint32_t timeout_ms) {
    return ble_obd_rxtx((ble_obd_ctx_t *)ctx, mode, pid, timeout_ms);
}

static int tracker_obd_request_mode_port(void *ctx, uint8_t mode, uint32_t timeout_ms) {
    return ble_obd_request_mode((ble_obd_ctx_t *)ctx, mode, timeout_ms);
}

static esp_err_t tracker_obd_elm327_init_port(void *ctx) {
    return ble_obd_elm327_init((ble_obd_ctx_t *)ctx);
}

static const char *tracker_obd_get_ecu_state_label_port(void *ctx) {
    return ble_obd_get_last_ecu_state_label((ble_obd_ctx_t *)ctx);
}

static const modem_transport_port_t s_modem_transport_port = {
    .set_apn = modem_lte_set_apn,
    .request_connect = modem_lte_request_connect,
    .is_initialized = modem_lte_is_initialized,
    .is_connected = modem_lte_is_connected,
    .sleep = modem_lte_sleep,
    .wakeup = modem_lte_wakeup,
};

static const mqtt_transport_port_t s_mqtt_transport_port = {
    .init = tracker_mqtt_init,
    .connect = tracker_mqtt_connect,
    .disconnect = tracker_mqtt_disconnect,
    .is_connected = tracker_mqtt_is_connected,
    .publish = tracker_mqtt_publish,
    .publish_with_msg_id = tracker_mqtt_publish_with_msg_id,
    .subscribe_commands = tracker_mqtt_subscribe_commands,
    .set_command_callback = tracker_mqtt_set_command_callback_port,
};

static const storage_queue_port_t s_storage_queue_port = {
    .init = offline_queue_init,
    .enqueue = tracker_storage_queue_enqueue_port,
    .replay_tick = offline_queue_replay_tick,
};

static const ota_download_port_t s_ota_download_port = {
    .apply_update = util_ota_apply_update,
    .manual_rollback = util_ota_trigger_manual_rollback,
};

static const config_store_port_t s_config_store_port = {
    .init = nvs_config_init,
    .load = nvs_config_load,
    .save = nvs_config_save,
};

static const rtc_clock_port_t s_rtc_clock_port = {
    .init = rtc_ds3231m_init,
    .get_time_ms = rtc_ds3231m_get_time_ms,
    .set_time_ms = rtc_ds3231m_set_time_ms,
    .get_health = rtc_ds3231m_get_health,
};

static const obd_reader_port_t s_obd_reader_port = {
    .connect = tracker_obd_connect_port,
    .disconnect = tracker_obd_disconnect_port,
    .is_connected = tracker_obd_is_connected_port,
    .request_pid = tracker_obd_request_pid_port,
    .request_mode = tracker_obd_request_mode_port,
    .elm327_init = tracker_obd_elm327_init_port,
    .get_ecu_state_label = tracker_obd_get_ecu_state_label_port,
};

static const power_control_port_t s_power_control_port = {
    .init = power_mgr_init,
    .power_on = modem_power_on,
    .power_off = modem_power_off,
    .set_dtr = modem_set_dtr,
    .read_status = modem_read_status,
};

static const tracker_runtime_ports_t s_runtime_ports = {
    .modem = &s_modem_transport_port,
    .mqtt = &s_mqtt_transport_port,
    .storage_queue = &s_storage_queue_port,
    .ota_download = &s_ota_download_port,
    .config_store = &s_config_store_port,
    .rtc_clock = &s_rtc_clock_port,
    .obd_reader = &s_obd_reader_port,
    .power_control = &s_power_control_port,
};

#if CONFIG_TRACKER_FIELD_VALIDATION_MODE && CONFIG_ESP_TASK_WDT_EN
static void tracker_main_relax_task_wdt_for_field_validation(void) {
    const esp_task_wdt_config_t wdt_cfg = {
        .timeout_ms = 30000,
        .idle_core_mask = (1U << portNUM_PROCESSORS) - 1U,
        .trigger_panic = false,
    };

    esp_err_t err = esp_task_wdt_reconfigure(&wdt_cfg);
    if (err == ESP_OK) {
        ESP_LOGW(TAG, "Field validation override: task WDT timeout set to %ums", (unsigned)wdt_cfg.timeout_ms);
    } else {
        ESP_LOGW(TAG, "Field validation task WDT reconfigure failed: %s", esp_err_to_name(err));
    }
}
#endif

void app_core_bootstrap_run(void) {
    ESP_ERROR_CHECK(tracker_runtime_ports_validate(&s_runtime_ports));

    esp_log_level_set("*", ESP_LOG_INFO);
    esp_log_level_set("NimBLE", ESP_LOG_WARN);

    esp_err_t err = nvs_config_init();
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "nvs_config_init failed: %s (using in-memory defaults)", esp_err_to_name(err));
    }

    config_t config = {0};
    err = nvs_config_load(&config);
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "nvs_config_load failed: %s (using defaults)", esp_err_to_name(err));
        app_config_set_defaults(&config);
    }
#if CONFIG_TRACKER_FIELD_VALIDATION_MODE && CONFIG_TRACKER_FIELD_VALIDATION_FORCE_IMU_WAKE
    if (!config.imu_wakeup_enabled) {
        ESP_LOGW(TAG, "Field validation override: IMU wake enabled for hardware acceptance");
    }
    config.imu_wakeup_enabled = true;
#endif
#if CONFIG_TRACKER_FIELD_VALIDATION_MODE
    if (!util_string_empty(CONFIG_TRACKER_FIELD_VALIDATION_MQTT_HOST)) {
        util_copy_string(config.mqtt_host,
                         sizeof(config.mqtt_host),
                         CONFIG_TRACKER_FIELD_VALIDATION_MQTT_HOST);
        if (!util_string_empty(CONFIG_TRACKER_FIELD_VALIDATION_MQTT_USERNAME)) {
            util_copy_string(config.mqtt_username,
                             sizeof(config.mqtt_username),
                             CONFIG_TRACKER_FIELD_VALIDATION_MQTT_USERNAME);
        }
        if (!util_string_empty(CONFIG_TRACKER_FIELD_VALIDATION_MQTT_PASSWORD)) {
            util_copy_string(config.mqtt_password,
                             sizeof(config.mqtt_password),
                             CONFIG_TRACKER_FIELD_VALIDATION_MQTT_PASSWORD);
        }
        if (!util_string_empty(CONFIG_TRACKER_FIELD_VALIDATION_AUTH_TOKEN)) {
            util_copy_string(config.auth_token,
                             sizeof(config.auth_token),
                             CONFIG_TRACKER_FIELD_VALIDATION_AUTH_TOKEN);
        }
        ESP_LOGW(TAG,
                 "Field validation override: mqtt broker=%s (default TLS port) user=%s",
                 config.mqtt_host,
                 config.mqtt_username);
    }
#if CONFIG_TRACKER_FIELD_VALIDATION_DISABLE_COMMAND_SUBSCRIBE
    if (config.command_subscribe_enabled) {
        ESP_LOGW(TAG, "Field validation override: command subscribe disabled (publish-path validation)");
    }
    config.command_subscribe_enabled = false;
#else
    if (!config.command_subscribe_enabled) {
        ESP_LOGW(TAG, "Field validation override: command subscribe re-enabled for OTA loop");
    }
    config.command_subscribe_enabled = true;
#endif
#endif
#if CONFIG_TRACKER_FIELD_VALIDATION_MODE && CONFIG_ESP_TASK_WDT_EN
    tracker_main_relax_task_wdt_for_field_validation();
#endif
    util_set_sleep_enabled(config.sleep_enabled);

    const esp_partition_t *running = esp_ota_get_running_partition();
    const esp_partition_t *boot = esp_ota_get_boot_partition();
    if (running != NULL && boot != NULL && running != boot) {
        ESP_LOGW(TAG, "Running partition differs from boot partition");
    }

    if (running != NULL && !util_string_empty(running->label)) {
        util_copy_string(g_rtc_context.ota_partition,
                         sizeof(g_rtc_context.ota_partition),
                         running->label);
    }

    g_rtc_context.boot_count += 1U;

    app_state_t state = APP_STATE_INIT;
    esp_sleep_wakeup_cause_t wakeup = esp_sleep_get_wakeup_cause();
    if (util_is_sleep_enabled()) {
        if (wakeup == ESP_SLEEP_WAKEUP_TIMER) {
            state = APP_STATE_HEARTBEAT;
        } else if (wakeup == ESP_SLEEP_WAKEUP_EXT0 && config.imu_wakeup_enabled) {
            state = APP_STATE_ALARM;
        } else if (wakeup == ESP_SLEEP_WAKEUP_EXT0) {
            state = APP_STATE_HEARTBEAT;
        }
    }

    ESP_LOGI(TAG,
             "Boot #%lu wakeup=%d initial_state=%d",
             (unsigned long)g_rtc_context.boot_count,
             (int)wakeup,
             (int)state);

    bool state_machine_ready = false;
    while (true) {
        uint64_t now_ms = util_uptime_ms();
        if (!state_machine_ready) {
            if (retry_state_can_run(&s_init_retry, now_ms)) {
                err = state_machine_init(&config);
                if (err == ESP_OK) {
                    retry_state_reset(&s_init_retry);
                    state_machine_ready = true;
                } else {
                    uint32_t delay_ms = retry_state_current_delay_ms(&s_init_retry,
                                                                     &s_init_retry_policy,
                                                                     now_ms);
                    (void)retry_state_schedule(&s_init_retry,
                                               &s_init_retry_policy,
                                               now_ms,
                                               err);
                    ESP_LOGW(TAG,
                             "retry step=state_machine_init err=%s attempt=%lu next_delay_ms=%lu",
                             esp_err_to_name(err),
                             (unsigned long)s_init_retry.attempts,
                             (unsigned long)delay_ms);
                }
            }
            vTaskDelay(pdMS_TO_TICKS(100));
            continue;
        }

        state = state_machine_run(state);
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}
