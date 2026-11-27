/**
 * @file board_internal.h
 * @brief Private board bus, task and sleep integration interfaces.
 *
 * The board task, clock and sensor drivers share the I2C adapter. Wake and
 * sleep helpers remain within board sources.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"
#include "board/board.h"
#include "platform/platform.h"
#include <stddef.h>
#include "board/board_power.h"

#define BOARD_TAG "board"

/* Preserve the board I/O error mapping on mutex or task allocation failure. */
static inline ivts_err_t board_err(esp_err_t error)
{
    return error == ESP_ERR_NO_MEM ? IVTS_ERR_IO : platform_err_from_esp(error);
}

/* Called by board_init before starting the board task. */
void board_task_configure(const board_cfg_t *cfg);
esp_err_t board_task_start(void);

/* Wake the board task so it can release the latched IMU interrupt. */
void board_task_notify_imu(void);
void board_task_notify_imu_from_isr(void);

typedef enum { BOARD_DEV_RTC = 0, BOARD_DEV_IMU, BOARD_DEV_COUNT } board_dev_t;

/* Called before the board task starts. */
esp_err_t board_i2c_init(void);
esp_err_t board_i2c_add(board_dev_t device, uint16_t address, uint32_t speed_hz);

/* Serialize transactions on the shared bus. These calls may wait for the mutex. */
bool board_i2c_probe(uint16_t address);
esp_err_t board_i2c_read(board_dev_t device, uint8_t reg, uint8_t *data, size_t len);
esp_err_t board_i2c_write(board_dev_t device, uint8_t reg, const uint8_t *data, size_t len);

/* Switch INT1 to level wake just before light sleep; restore the IRQ after any result. */
esp_err_t board_power_arm_imu_level_wake(void);
void board_power_restore_imu_edge_irq(void);
void board_power_arm_imu_deep_wake(void);

/* Capture the boot wake source before initializing any drivers. */
void board_power_capture_wake(void);
/* Read the reason for the most recent wake, including light sleep. */
board_wake_t board_power_read_wake_cause(void);
