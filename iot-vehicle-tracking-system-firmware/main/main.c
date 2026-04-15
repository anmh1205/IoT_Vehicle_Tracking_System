#include "app_state.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"
#include "esp_ota_ops.h"
#include "esp_sleep.h"
#include "esp_task_wdt.h"
#include "sdkconfig.h"

#include "nvs_config.h"
#include "retry_manager.h"
#include "util.h"

/**
 * @file main.c
 * @brief Firmware boot entrypoint and top-level state-machine loop.
 */

static const char *TAG = "TRACKER_MAIN";

static retry_state_t s_init_retry = {0};
static const retry_policy_t s_init_retry_policy = {
    .mode = RETRY_MODE_FIXED,
    .base_delay_ms = 10000,
    .max_delay_ms = 10000,
    .max_attempts = 0,
    .jitter_ms = 0,
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

/**
 * @brief ESP-IDF application entrypoint.
 *
 * Initializes config storage, restores runtime context, selects initial
 * state based on wakeup source, then continuously executes state machine.
 */
void app_main(void) {
    /* Keep default logging at INFO so field diagnostics stay readable. */
    esp_log_level_set("*", ESP_LOG_INFO);
    /* NimBLE info logs are very noisy during stable OBD traffic; keep only warnings/errors. */
    esp_log_level_set("NimBLE", ESP_LOG_WARN);
    /* Initialize NVS first because config and command updates rely on it. */
    esp_err_t err = nvs_config_init();
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "nvs_config_init failed: %s (using in-memory defaults)", esp_err_to_name(err));
    }

    /* Load persisted runtime configuration (or defaults if not present). */
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
        util_copy_string(config.mqtt_username,
                         sizeof(config.mqtt_username),
                         CONFIG_TRACKER_FIELD_VALIDATION_MQTT_USERNAME);
        util_copy_string(config.mqtt_password,
                         sizeof(config.mqtt_password),
                         CONFIG_TRACKER_FIELD_VALIDATION_MQTT_PASSWORD);
        util_copy_string(config.auth_token,
                         sizeof(config.auth_token),
                         CONFIG_TRACKER_FIELD_VALIDATION_AUTH_TOKEN);
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

    /* Compare running partition and boot partition for OTA diagnostics. */
    const esp_partition_t *running = esp_ota_get_running_partition();
    const esp_partition_t *boot = esp_ota_get_boot_partition();
    if (running != NULL && boot != NULL && running != boot) {
        ESP_LOGW(TAG, "Running partition differs from boot partition");
    }

    /* Cache running partition label in RTC context for firmware status reporting. */
    if (running != NULL && !util_string_empty(running->label)) {
        util_copy_string(g_rtc_context.ota_partition,
                         sizeof(g_rtc_context.ota_partition),
                         running->label);
    }

    /* Persist boot counter across deep sleep cycles. */
    g_rtc_context.boot_count += 1;

    /* Choose boot state based on wakeup source semantics. */
    app_state_t state = APP_STATE_INIT;
    esp_sleep_wakeup_cause_t wakeup = esp_sleep_get_wakeup_cause();
    if (util_is_sleep_enabled()) {
        if (wakeup == ESP_SLEEP_WAKEUP_TIMER) {
            /* Timer wakeup should perform heartbeat flow. */
            state = APP_STATE_HEARTBEAT;
        } else if (wakeup == ESP_SLEEP_WAKEUP_EXT0 && config.imu_wakeup_enabled) {
            /* IMU interrupt wakeup should enter motion alarm flow. */
            state = APP_STATE_ALARM;
        } else if (wakeup == ESP_SLEEP_WAKEUP_EXT0) {
            /* Fallback when IMU wake is not enabled/proven yet. */
            state = APP_STATE_HEARTBEAT;
        }
    }

    /* Log enough boot metadata for fleet troubleshooting. */
    ESP_LOGI(TAG,
             "Boot #%lu wakeup=%d initial_state=%d",
             (unsigned long)g_rtc_context.boot_count,
             (int)wakeup,
             (int)state);

    bool state_machine_ready = false;

    /**
     * Main control loop:
     * - retry state_machine_init non-blocking until ready,
     * - execute one finite-state-machine step after init,
     * - sleep briefly to avoid busy spin.
     */
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
