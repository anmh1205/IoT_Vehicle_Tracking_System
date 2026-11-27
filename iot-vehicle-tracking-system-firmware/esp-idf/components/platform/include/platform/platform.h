/**
 * @file platform.h
 * @brief ESP-IDF services shared by firmware tasks and device adapters.
 *
 * Time is monotonic and starts at boot. Blocking calls require task context.
 * Device-specific GPIO, bus and peripheral access belongs to each adapter.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"
#include "ivts_core/base/err.h"

/** @brief Return monotonic milliseconds since this boot. */
uint64_t platform_uptime_ms(void);

/** @brief Log a caller-supplied reason, then restart the controller. */
void platform_restart(const char *reason);

/** @brief Map an ESP-IDF result to the corresponding firmware result. */
ivts_err_t platform_err_from_esp(esp_err_t error);

/**
 * @brief Convert milliseconds to scheduler ticks using the configured tick rate.
 * @details Short durations can round down to zero, matching the native SDK
 * conversion. Adapters use this for SDK interfaces that accept ticks.
 */
uint32_t platform_timeout_ticks(uint32_t ms);

/** @brief Delay the calling task using the native millisecond-to-tick conversion. */
void platform_delay_ms(uint32_t ms);

/** @brief Opaque, non-recursive, priority-inheriting task mutex. */
typedef struct platform_mutex *platform_mutex_t;

/** @brief Allocate an initially unlocked firmware-lifetime mutex, or return NULL. */
platform_mutex_t platform_mutex_create(void);

/** @brief Acquire an initialized mutex, waiting indefinitely if necessary. */
void platform_mutex_lock(platform_mutex_t mutex);

/** @brief Try to acquire an initialized mutex within the specified milliseconds. */
bool platform_mutex_lock_for(platform_mutex_t mutex, uint32_t timeout_ms);

/** @brief Release the mutex held by the calling task. */
void platform_mutex_unlock(platform_mutex_t mutex);
