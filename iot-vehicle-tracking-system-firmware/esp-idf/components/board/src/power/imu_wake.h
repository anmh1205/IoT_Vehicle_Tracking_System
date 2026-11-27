#pragma once
#include "esp_err.h"

/* Switch INT1 to level wake just before light sleep; restore the IRQ after any result. */
esp_err_t board_power_arm_imu_level_wake(void);
void board_power_restore_imu_edge_irq(void);
void board_power_arm_imu_deep_wake(void);
