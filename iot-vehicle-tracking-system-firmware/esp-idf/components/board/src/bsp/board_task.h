#pragma once
#include "board/board.h"
#include "esp_err.h"

/* Called by board_init before starting the board task. */
void board_task_configure(const board_cfg_t *cfg);
esp_err_t board_task_start(void);

/* Wake the board task so it can release the latched IMU interrupt. */
void board_task_notify_imu(void);
void board_task_notify_imu_from_isr(void);
