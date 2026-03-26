#include "app_state.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"
#include "esp_ota_ops.h"
#include "esp_sleep.h"

#include "nvs_config.h"
#include "util.h"

/**
 * @file main.c
 * @brief Firmware boot entrypoint and top-level state-machine loop.
 */

static const char *TAG = "TRACKER_MAIN";

/**
 * @brief ESP-IDF application entrypoint.
 *
 * Initializes config storage, restores runtime context, selects initial
 * state based on wakeup source, then continuously executes state machine.
 */
void app_main(void) {
    /* Keep default logging at INFO so field diagnostics stay readable. */
    esp_log_level_set("*", ESP_LOG_INFO);

    /* Initialize NVS first because config and command updates rely on it. */
    ESP_ERROR_CHECK(nvs_config_init());

    /* Load persisted runtime configuration (or defaults if not present). */
    config_t config = {0};
    ESP_ERROR_CHECK(nvs_config_load(&config));

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
    if (wakeup == ESP_SLEEP_WAKEUP_TIMER) {
        /* Timer wakeup should perform heartbeat flow. */
        state = APP_STATE_HEARTBEAT;
    } else if (wakeup == ESP_SLEEP_WAKEUP_EXT0) {
        /* IMU interrupt wakeup should enter motion alarm flow. */
        state = APP_STATE_ALARM;
    }

    /* Log enough boot metadata for fleet troubleshooting. */
    ESP_LOGI(TAG,
             "Boot #%lu wakeup=%d initial_state=%d",
             (unsigned long)g_rtc_context.boot_count,
             (int)wakeup,
             (int)state);

    /* Initialize all runtime subsystems used by state machine. */
    ESP_ERROR_CHECK(state_machine_init(&config));

    /**
     * Main control loop:
     * - execute one finite-state-machine step,
     * - sleep briefly to avoid busy spin.
     */
    while (true) {
        state = state_machine_run(state);
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}
