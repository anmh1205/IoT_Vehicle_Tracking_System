/**
 * @file task_table.h
 * @brief Scheduling policy for the six IVTS-owned FreeRTOS tasks.
 *
 * ESP-IDF expresses task stack depth in bytes. The modem gets the highest IVTS
 * priority to service the UART before other application work. The app follows
 * it, then OBD, storage and OTA, and finally board sampling.
 */
#pragma once
#include <stdint.h>

typedef enum {
    APP_TASK_MODEM,
    APP_TASK_RUNTIME,
    APP_TASK_OBD,
    APP_TASK_STORAGE,
    APP_TASK_OTA,
    APP_TASK_BOARD,
    APP_TASK_COUNT
} app_task_id_t;

typedef struct {
    uint8_t priority;
    uint32_t stack_bytes;
} app_task_spec_t;

static const app_task_spec_t APP_TASKS[APP_TASK_COUNT] = {
    [APP_TASK_MODEM]   = { .priority = 6, .stack_bytes = 6144 },
    [APP_TASK_RUNTIME] = { .priority = 5, .stack_bytes = 6144 },
    [APP_TASK_OBD]     = { .priority = 4, .stack_bytes = 4096 },
    [APP_TASK_STORAGE] = { .priority = 3, .stack_bytes = 5120 },
    [APP_TASK_OTA]     = { .priority = 3, .stack_bytes = 6144 },
    [APP_TASK_BOARD]   = { .priority = 2, .stack_bytes = 3072 },
};
