#include "app/app.h"
#include "app_log.h"
#include "app_timing.h"
#include "boot/app_boot.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "platform/platform_reset.h"
#include "runtime/app_events.h"
#include "runtime/app_task.h"

void app_start(void)
{
    if (!app_boot_init() || !app_events_start_task(app_task_run)) {
        ESP_LOGE(APP_TAG, "init lỗi không cứu được: restart sau 10 s");
        vTaskDelay(pdMS_TO_TICKS(INIT_RESTART_DELAY_MS));
        platform_restart("init_failed");
    }
}
