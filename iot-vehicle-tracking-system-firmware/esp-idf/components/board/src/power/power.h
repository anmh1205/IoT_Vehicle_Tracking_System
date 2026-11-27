/*
 * Owns private sleep and wake coordination, including IMU wake configuration
 * and wake-reason capture. FreeRTOS task handling stays in board_task.c.
 * Used by board.c at startup and by the sleep and wake implementations.
 */
#pragma once
#include "esp_err.h"
#include "board/board_power.h"

/* Switch INT1 to level wake just before light sleep; restore the IRQ after any result. */
esp_err_t board_power_arm_imu_level_wake(void);
void board_power_restore_imu_edge_irq(void);
void board_power_arm_imu_deep_wake(void);

/* Capture the boot wake source before initializing any drivers. */
void board_power_capture_wake(void);
/* Read the reason for the most recent wake, including light sleep. */
board_wake_t board_power_read_wake_cause(void);
