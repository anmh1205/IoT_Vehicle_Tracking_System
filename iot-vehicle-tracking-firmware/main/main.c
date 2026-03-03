#include "app_state.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"
#include "esp_sleep.h"

#include "nvs_config.h"

static const char *TAG = "TRACKER_MAIN";

void app_main(void) {
    esp_log_level_set("*", ESP_LOG_INFO);

    ESP_ERROR_CHECK(nvs_config_init());

    config_t config = {0};
    ESP_ERROR_CHECK(nvs_config_load(&config));

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
