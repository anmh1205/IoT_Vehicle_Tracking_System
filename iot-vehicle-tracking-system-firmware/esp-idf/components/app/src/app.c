/**
 * @file src/app.c
 * @brief Firmware composition entry point and recovery from startup failure.
 *
 * The ESP-IDF startup task calls the boot composer, then creates the app runtime using
 * the task table. Failure of either step delays restart by 10000 ms on the caller. Runtime
 * state and hardware I/O belong to the app task and the adapters it coordinates.
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
