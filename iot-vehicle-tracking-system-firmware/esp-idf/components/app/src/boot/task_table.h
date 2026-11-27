/**
 * @file src/boot/task_table.h
 * @brief Scheduling policy for the six IVTS-owned FreeRTOS tasks.
 *
 * ESP-IDF expresses task stack depth in bytes. The modem gets the highest IVTS priority to
 * service the UART, followed by the app, OBD, storage and OTA, and board sampling. Startup and
 * adapter wiring read the immutable table. Each adapter creates or manages its own worker.
 */
#pragma once
#include <stdint.h>

/** @brief Indices into the immutable app task specification. */
typedef enum {
    APP_TASK_MODEM, /**< SIM7600 modem worker. */
    APP_TASK_RUNTIME, /**< App event consumer and FSM task. */
    APP_TASK_OBD, /**< BLE OBD link and polling worker. */
    APP_TASK_STORAGE, /**< SD request worker. */
    APP_TASK_OTA, /**< On-demand firmware update worker. */
    APP_TASK_BOARD, /**< Board sampling and motion worker. */
    APP_TASK_COUNT /**< Number of entries in the task table. */
} app_task_id_t;

/** @brief Immutable task creation settings shared by boot and wiring code. */
typedef struct {
    uint8_t priority; /**< Scheduler priority passed to task creation. */
    uint32_t stack_bytes; /**< Stack allocation in bytes. */
} app_task_spec_t;

/** @brief Read-only task settings. Each including source has its own copy. */
static const app_task_spec_t APP_TASKS[APP_TASK_COUNT] = {
    [APP_TASK_MODEM]   = { .priority = 6, .stack_bytes = 6144 },
    [APP_TASK_RUNTIME] = { .priority = 5, .stack_bytes = 6144 },
    [APP_TASK_OBD]     = { .priority = 4, .stack_bytes = 4096 },
    [APP_TASK_STORAGE] = { .priority = 3, .stack_bytes = 5120 },
    [APP_TASK_OTA]     = { .priority = 3, .stack_bytes = 6144 },
    [APP_TASK_BOARD]   = { .priority = 2, .stack_bytes = 3072 },
};
