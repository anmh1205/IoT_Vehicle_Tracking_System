/**
 * @file include/platform/platform.h
 * @brief ESP-IDF services shared by firmware tasks and device adapters.
 *
 * Adapters use monotonic boot time for deadlines and map SDK results at the I/O boundary.
 * The app requests a restart after its own shutdown or update coordination.
 * Device-specific GPIO, bus and peripheral access belongs to each adapter.
 * Blocking calls require task context. Adapters own their opaque mutex handles for the boot lifetime.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"
#include "ivts_core/base/err.h"

/**
 * @brief Return monotonic milliseconds since this boot.
 *
 * The conversion discards submillisecond precision. Deadlines based on this clock are local to this boot.
 *
 * @return Milliseconds since the ESP timer starts.
 * @note Context: Any task or ISR. Blocking: Non-blocking.
 */
uint64_t platform_uptime_ms(void);

/**
 * @brief Log a caller-supplied reason, then restart the controller.
 *
 * @param reason Required NUL-terminated reason string borrowed for the log call.
 * @note Context: Task context. The app uses this for startup failure, remote restart and OTA reboot.
 *       Blocking: The call performs console logging and enters the SDK restart path without returning.
 */
void platform_restart(const char *reason);

/**
 * @brief Translate an ESP-IDF result to its IVTS counterpart.
 *
 * @param error ESP-IDF result code.
 * @retval IVTS_OK The SDK reports success.
 * @retval IVTS_ERR_INVALID_ARG The SDK reports an invalid argument.
 * @retval IVTS_ERR_INVALID_STATE The SDK reports an invalid state.
 * @retval IVTS_ERR_TIMEOUT The SDK reports a timeout.
 * @retval IVTS_ERR_NOT_FOUND The SDK reports that the requested item is absent.
 * @retval IVTS_ERR_FULL The SDK reports insufficient memory.
 * @retval IVTS_ERR_IO Any other SDK failure.
 * @note Context: Any task or ISR. Blocking: Non-blocking.
 */
ivts_err_t platform_err_from_esp(esp_err_t error);

/**
 * @brief Convert milliseconds to scheduler ticks using the configured tick rate.
 *
 * Subtick durations can round down to zero. The conversion uses native tick-width arithmetic.
 *
 * @param ms Duration in milliseconds within the range whose product with the tick rate fits the tick type.
 * @return The duration in native scheduler ticks.
 * @note Context: Any task or ISR. Blocking: Non-blocking.
 */
uint32_t platform_timeout_ticks(uint32_t ms);

/**
 * @brief Delay the calling task using the native millisecond-to-tick conversion.
 *
 * A duration that converts to zero yields without waiting for a tick.
 *
 * @param ms Duration in milliseconds within the range accepted by platform_timeout_ticks().
 * @note Context: Task context with the scheduler running. Blocking: The converted number of ticks.
 */
void platform_delay_ms(uint32_t ms);

/** @brief Opaque, non-recursive, priority-inheriting mutex owned by its creating adapter for the boot lifetime. */
typedef struct platform_mutex *platform_mutex_t;

/**
 * @brief Allocate an initially unlocked firmware-lifetime mutex.
 *
 * @return An adapter-owned handle, or NULL on allocation failure.
 * @note Context: Task or task initialization context. Blocking: Allocates from the heap without
 *       waiting for the new mutex.
 */
platform_mutex_t platform_mutex_create(void);

/**
 * @brief Acquire an initialized mutex.
 *
 * @param mutex Required borrowed handle from platform_mutex_create().
 * @note Context: Task context only. Blocking: Waits indefinitely for the current holder.
 * @warning The calling task must not already hold the mutex.
 */
void platform_mutex_lock(platform_mutex_t mutex);

/**
 * @brief Try to acquire an initialized mutex within the specified duration.
 *
 * @param mutex Required borrowed handle from platform_mutex_create().
 * @param timeout_ms Maximum wait in milliseconds within the range accepted by platform_timeout_ticks().
 *                   Zero tries once without waiting.
 * @retval true The calling task owns the mutex and must release it.
 * @retval false The mutex was unavailable within the wait. Ownership does not change.
 * @note Context: Task context only. Blocking: Up to the converted number of scheduler ticks.
 * @warning The calling task must not already hold the mutex.
 */
bool platform_mutex_lock_for(platform_mutex_t mutex, uint32_t timeout_ms);

/**
 * @brief Release a mutex held by the calling task.
 *
 * @param mutex Required borrowed handle owned by the calling task for this acquisition.
 * @note Context: Task context only. Blocking: Non-blocking. Releasing can wake a waiting task.
 */
void platform_mutex_unlock(platform_mutex_t mutex);
