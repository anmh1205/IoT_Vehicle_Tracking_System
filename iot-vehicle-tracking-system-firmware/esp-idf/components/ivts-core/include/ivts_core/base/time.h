/**
 * @file time.h
 * @brief Portable monotonic millisecond types and deadline helpers.
 */
#pragma once
#include <stdint.h>

/**
 * Monotonic milliseconds since boot. The value is meaningful within one boot.
 */
typedef uint64_t ivts_ms_t;

/**
 * @brief Return elapsed milliseconds from @p since to @p now.
 * @return The difference, or zero when since is later than now.
 */
static inline ivts_ms_t ivts_elapsed(ivts_ms_t now, ivts_ms_t since)
{
    return (now >= since) ? (now - since) : 0u;
}
