/**
 * @file app.c
 * @brief Firmware composition entry point and recovery from startup failure.
 *
 * Starts the runtime using the central task specification. A failed startup
 * waits for the existing restart delay before resetting the controller.
 */
#include "app/app.h"
#include "app_internal.h"
#include "boot/boot.h"
#include "boot/task_table.h"
#include "platform/log.h"
#include "platform/platform.h"
#include "runtime/runtime.h"

void app_start(void)
{
    const app_task_spec_t *task = &APP_TASKS[APP_TASK_RUNTIME];
    if (!app_boot_init() || !app_task_start(task->stack_bytes, task->priority)) {
        IVTS_LOGE(APP_TAG, "init result=fail action=restart delay=%ums", (unsigned)INIT_RESTART_DELAY_MS);
        platform_delay_ms(INIT_RESTART_DELAY_MS);
        platform_restart("init_failed");
    }
}
