/**
 * @file src/board_internal.h
 * @brief Private board task, I2C registry and driver result translation.
 *
 * Board startup initializes the task configuration and device registry. RTC and IMU drivers share the I2C
 * mutex.
 * The GPIO ISR and sleep adapter use separate notification entry points. The board task handles sensor I/O.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"
#include "board/board.h"
#include "platform/platform.h"
#include <stddef.h>
#include "board/board_power.h"

/* UART log tag for board, RTC, IMU, ADC and I2C lines (see platform/log.h). */
#define BOARD_TAG "board"   /**< UART log tag for board hardware and the sampling task. */

/**
 * @brief Translate a board SDK result to an IVTS result.
 * @param error SDK result.
 * @retval IVTS_OK The SDK reports success.
 * @retval IVTS_ERR_INVALID_ARG The SDK reports invalid arguments.
 * @retval IVTS_ERR_INVALID_STATE The SDK reports invalid state.
 * @retval IVTS_ERR_TIMEOUT The SDK reports a timeout.
 * @retval IVTS_ERR_NOT_FOUND The SDK reports an absent resource.
 * @retval IVTS_ERR_IO Allocation or other SDK failure.
 * @note Context: Task context. Non-blocking.
 */
static inline ivts_err_t board_err(esp_err_t error)
{
    return error == ESP_ERR_NO_MEM ? IVTS_ERR_IO : platform_err_from_esp(error);
}

/**
 * @brief Copy settings for ADC sampling and IMU event delivery.
 * @param cfg Non-null configuration. The sink context must remain valid after the copy.
 * @note Context: App startup before task creation. Non-blocking.
 */
void board_task_configure(const board_cfg_t *cfg);
/**
 * @brief Create the board sampling task with its saved settings.
 * @retval ESP_OK The task starts.
 * @retval ESP_ERR_NO_MEM Task creation fails.
 * @note Context: App startup after peripheral setup. No wait for the worker to run.
 */
esp_err_t board_task_start(void);

/**
 * @brief Notify the board task that INT1 may be latched.
 * The notification is ignored if there is no task handle.
 * @note Context: App task during sleep entry or resume. Non-blocking.
 */
void board_task_notify_imu(void);
/**
 * @brief Notify the board task from the INT1 interrupt.
 * The notification is ignored if there is no task handle. The ISR requests a yield if needed.
 * @note Context: INT1 GPIO ISR. Non-blocking.
 */
void board_task_notify_imu_from_isr(void);

/** @brief Fixed slots in the board I2C device registry. */
typedef enum { BOARD_DEV_RTC = 0, /**< DS3231M clock slot.
 */ BOARD_DEV_IMU, /**< LIS3DSH slot. */ BOARD_DEV_COUNT /**< Registry size. */ } board_dev_t;

/**
 * @brief Create the board I2C master bus and its task mutex.
 * @retval ESP_OK The bus is available.
 * @retval ESP_ERR_NO_MEM Mutex allocation fails.
 * @return Otherwise, the SDK master-bus initialization error.
 * @note Context: App startup before probe or registration. Synchronous allocation with no explicit timeout.
 */
esp_err_t board_i2c_init(void);
/**
 * @brief Register a 7-bit I2C device in a board slot.
 * @param device RTC or IMU slot. The count sentinel is outside the valid range.
 * @param address 7-bit address.
 * @param speed_hz SCL speed in hertz.
 * @return SDK registration result.
 * @note Context: App startup after bus setup. Synchronous registration with no component-level timeout.
 */
esp_err_t board_i2c_add(board_dev_t device, uint16_t address, uint32_t speed_hz);

/**
 * @brief Probe an address using the shared I2C bus.
 * @param address 7-bit address.
 * @retval true The SDK probe succeeds.
 * @retval false The mutex wait or probe fails.
 * @note Context: App startup. Waits up to 100 ms for the mutex, then passes a 50 ms probe timeout to the SDK.
 */
bool board_i2c_probe(uint16_t address);
/**
 * @brief Read a register range with a combined write and read.
 * @param device Registered RTC or IMU slot.
 * @param reg First register address.
 * @param[out] data Non-null writable buffer of len bytes. Contents are unspecified on an SDK transfer
 *       failure.
 * @param len Number of bytes to read.
 * @retval ESP_OK The transfer completes.
 * @retval ESP_ERR_INVALID_STATE The slot is unregistered.
 * @retval ESP_ERR_TIMEOUT The mutex wait or SDK transfer times out.
 * @return Otherwise, the SDK transfer error.
 * @note Context: Board, app, modem or OTA task. Waits up to 100 ms for the mutex, then uses a 50 ms transfer
 *       timeout.
 */
esp_err_t board_i2c_read(board_dev_t device, uint8_t reg, uint8_t *data, size_t len);
/**
 * @brief Send a register address followed by up to 16 bytes.
 * @param device Registered RTC or IMU slot.
 * @param reg First register address.
 * @param data Borrowed input with at least len bytes. May be NULL when len is zero.
 * @param len Payload bytes, from zero through 16.
 * @retval ESP_OK The transfer completes.
 * @retval ESP_ERR_INVALID_STATE The slot is unregistered.
 * @retval ESP_ERR_INVALID_SIZE The payload exceeds 16 bytes.
 * @retval ESP_ERR_TIMEOUT The mutex wait or SDK transfer times out.
 * @return Otherwise, the SDK transfer error.
 * @note Context: App task during startup or RTC synchronization. Waits up to 100 ms for the mutex, then uses
 *       a 50 ms transfer timeout.
 */
esp_err_t board_i2c_write(board_dev_t device, uint8_t reg, const uint8_t *data, size_t len);
