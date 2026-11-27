/**
 * @file include/ivts_core/base/time.h
 * @brief Portable monotonic millisecond types and deadline helpers.
 *
 * The FSM and axis timers use timestamps from the same boot. The helpers
 * operate on values and leave clock reads and scheduling to their callers.
 */
#pragma once
#include <stdint.h>

/**
 * @brief Monotonic milliseconds since boot. The value is meaningful within one boot.
 */
typedef uint64_t ivts_ms_t;

/**
 * @brief Compute elapsed milliseconds between monotonic timestamps.
 * @param now Current milliseconds since boot.
 * @param since Earlier observation in milliseconds since the same boot.
 * @return The difference, or zero when since is later than now.
 *
 * @note Context: Any task. Blocking: non-blocking.
 */
static inline ivts_ms_t ivts_elapsed(ivts_ms_t now, ivts_ms_t since)
{
    return (now >= since) ? (now - since) : 0u;
}
