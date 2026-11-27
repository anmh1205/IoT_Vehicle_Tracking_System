/**
 * @file src/power/power.h
 * @brief Private sleep wake-source configuration and wake classification.
 *
 * Board startup captures the boot wake cause. The app sleep path arms GPIO wake and restores edge IRQ
 * delivery.
 * The board task handles the latched sensor status after notification.
 */
#pragma once
#include "esp_err.h"
#include "board/board_power.h"

/**
 * @brief Switch INT1 from edge IRQ delivery to active-high GPIO wake.
 * @return The SDK result for GPIO wake configuration or enabling GPIO as a wake source.
 * @note Context: App task before light sleep. Synchronous GPIO and wake setup with no explicit wait.
 * @warning Restore edge IRQ delivery even on failure because the interrupt is disabled first.
 */
esp_err_t board_power_arm_imu_level_wake(void);
/**
 * @brief Disable INT1 wake and restore rising-edge task notifications.
 * SDK errors are discarded.
 * @note Context: App task after a light-sleep attempt. No explicit wait.
 */
void board_power_restore_imu_edge_irq(void);
/**
 * @brief Request active-high EXT1 wake on INT1.
 * SDK errors are discarded.
 * @note Context: App task before deep sleep after checking wake capability. No explicit wait.
 */
void board_power_arm_imu_deep_wake(void);

/**
 * @brief Save the boot wake classification for later queries.
 * @note Context: App startup before initializing peripherals. Non-blocking.
 */
void board_power_capture_wake(void);
/**
 * @brief Classify the most recent SDK wake-source bitmap.
 * @return Board wake reason. GPIO sources take precedence when the timer also fires.
 * @note Context: App startup or app task after light sleep. Non-blocking.
 */
board_wake_t board_power_read_wake_cause(void);
