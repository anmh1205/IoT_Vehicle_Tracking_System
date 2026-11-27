#include "app/app.h"
#include "app_log.h"
#include "app_timing.h"
#include "boot/app_boot.h"
#include "boot/task_table.h"
#include "esp_log.h"
#include "platform/platform.h"
#include "runtime/app_events.h"
#include "runtime/app_task.h"

void app_start(void)
{
    const app_task_spec_t *task = &APP_TASKS[APP_TASK_RUNTIME];
    if (!app_boot_init() || !app_events_start_task(app_task_run, task->stack_bytes, task->priority)) {
        ESP_LOGE(APP_TAG, "init lỗi không cứu được: restart sau 10 s");
        platform_delay_ms(INIT_RESTART_DELAY_MS);
        platform_restart("init_failed");
    }
}
