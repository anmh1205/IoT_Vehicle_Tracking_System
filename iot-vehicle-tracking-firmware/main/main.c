#include "app_state.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"
#include "esp_ota_ops.h"
#include "esp_sleep.h"

#include "nvs_config.h"
#include "util.h"

static const char *TAG = "TRACKER_MAIN";

void app_main(void) {
    esp_log_level_set("*", ESP_LOG_INFO);

    ESP_ERROR_CHECK(nvs_config_init());

    config_t config = {0};
    ESP_ERROR_CHECK(nvs_config_load(&config));

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

    g_rtc_context.boot_count += 1;

    app_state_t state = APP_STATE_INIT;
    esp_sleep_wakeup_cause_t wakeup = esp_sleep_get_wakeup_cause();
    if (wakeup == ESP_SLEEP_WAKEUP_TIMER) {
        state = APP_STATE_HEARTBEAT;
    } else if (wakeup == ESP_SLEEP_WAKEUP_EXT0) {
        state = APP_STATE_ALARM;
    }

    ESP_LOGI(TAG,
             "Boot #%lu wakeup=%d initial_state=%d",
             (unsigned long)g_rtc_context.boot_count,
             (int)wakeup,
             (int)state);

    ESP_ERROR_CHECK(state_machine_init(&config));

    while (true) {
        state = state_machine_run(state);
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}
