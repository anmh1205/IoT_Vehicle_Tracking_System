#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "esp_err.h"
#include "esp_log.h"

/**
 * @file util.h
 * @brief Common helpers, guard macros, and generic byte/string utilities.
 * This header belongs to the shared kernel layer and collects the shared models, bounds, and helper contracts that multiple components reuse.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Compile-time element count of a fixed-size array.
 * @warning Only valid for true arrays, not pointers (a pointer would yield a
 *          meaningless ratio of pointer size to element size).
 */
#ifndef ARRAY_SIZE
#define ARRAY_SIZE(arr) (sizeof(arr) / sizeof((arr)[0]))
#endif
/**
 * @brief Smaller of two values.
 * @note Arguments are parenthesized to be operator-precedence safe, but each is
 *       still evaluated twice; avoid passing expressions with side effects.
 */
#define MIN_VALUE(a, b) ((a) < (b) ? (a) : (b))
/**
 * @brief Larger of two values.
 * @note Like MIN_VALUE, evaluates each argument twice (no side-effect args).
 */
#define MAX_VALUE(a, b) ((a) > (b) ? (a) : (b))

/**
 * @brief Guard clause: log and return @p err_code when @p cond is false.
 * @note Wrapped in do/while(0) so it behaves as a single statement in any
 *       if/else context. Used for early-exit precondition checks.
 */
#define ESP_RETURN_ON_FALSE(cond, err_code, tag, msg, ...) \
    do { \
        if (!(cond)) { \
            ESP_LOGE(tag, msg, ##__VA_ARGS__); \
            return (err_code); \
        } \
    } while (0)

/**
 * @brief Guard clause: log and return @p err_code when @p ptr is NULL.
 * @note Specialization of ESP_RETURN_ON_FALSE for the common NULL-pointer check.
 */
#define ESP_RETURN_ON_NULL(ptr, err_code, tag, msg, ...) \
    do { \
        if ((ptr) == NULL) { \
            ESP_LOGE(tag, msg, ##__VA_ARGS__); \
            return (err_code); \
        } \
    } while (0)

/**
 * @brief Guard clause: log and `goto goto_label` when @p cond is false.
 * @note Use for cleanup-style flows where a shared error path frees resources.
 */
#define ESP_GOTO_ON_FALSE(cond, goto_label, tag, msg, ...) \
    do { \
        if (!(cond)) { \
            ESP_LOGE(tag, msg, ##__VA_ARGS__); \
            goto goto_label; \
        } \
    } while (0)

/**
 * @brief Evaluate @p expr once; on non-OK result log it and jump to cleanup.
 * @note Captures the result in a local `_err_rc_`, assigns it to an `err`
 *       variable that MUST exist in the enclosing scope, then jumps. The
 *       human-readable error name is appended via esp_err_to_name().
 */
#define ESP_GOTO_ON_ERROR(expr, goto_label, tag, msg, ...) \
    do { \
        esp_err_t _err_rc_ = (expr); \
        if (_err_rc_ != ESP_OK) { \
            ESP_LOGE(tag, msg ": %s", ##__VA_ARGS__, esp_err_to_name(_err_rc_)); \
            err = _err_rc_; \
            goto goto_label; \
        } \
    } while (0)

/**
 * @brief Safe bounded string copy that always null-terminates.
 *
 * @param dst Destination buffer.
 * @param dst_size Destination buffer size.
 * @param src Source string.
 *
 * @return Number of copied bytes (excluding null terminator).
 */
size_t util_copy_string(char *dst, size_t dst_size, const char *src);

/**
 * @brief Get system uptime in milliseconds since boot.
 *
 * @return Uptime in milliseconds.
 */
uint64_t util_uptime_ms(void);

/**
 * @brief Generate a random RFC4122 UUID v4 string.
 *
 * @param out Destination buffer.
 * @param out_size Destination buffer size, must be >= 37.
 */
void util_generate_uuid_v4(char *out, size_t out_size);

/**
 * @brief Generate boot identifier string stable for current runtime boot.
 *
 * @param out Destination buffer.
 * @param out_size Destination buffer size.
 * @param boot_count Persisted RTC boot counter.
 */
void util_generate_boot_id(char *out, size_t out_size, uint32_t boot_count);

/**
 * @brief Enable or disable all firmware sleep features globally.
 *
 * @param enabled True to allow sleep features, false to disable them.
 */
void util_set_sleep_enabled(bool enabled);

/**
 * @brief Read global firmware sleep enable flag.
 *
 * @return true when sleep features are enabled.
 */
bool util_is_sleep_enabled(void);

/**
 * @brief Clamp an integer value into the inclusive range `[min_value, max_value]`.
 *
 * Returns @p min_value when below the floor, @p max_value when above the
 * ceiling, otherwise the value unchanged. Used to sanitize config/sensor inputs.
 *
 * @param value Input value.
 * @param min_value Minimum bound (inclusive).
 * @param max_value Maximum bound (inclusive).
 *
 * @return Clamped value within `[min_value, max_value]`.
 */
int util_clamp_int(int value, int min_value, int max_value);

/**
 * @brief Check whether string pointer is NULL or empty.
 *
 * @param value Input string pointer.
 *
 * @return true when empty or NULL.
 */
bool util_string_empty(const char *value);

/**
 * @brief Decode a fixed number of bytes from a hex string.
 *
 * Reads exactly `2 * out_len` hex characters (case-insensitive) from @p hex
 * and writes @p out_len decoded bytes. Fails fast on any non-hex character.
 *
 * @param hex     Source hex string; must hold at least `2 * out_len` chars.
 * @param out     Destination byte buffer of at least @p out_len bytes.
 * @param out_len Exact number of bytes to decode.
 *
 * @return true on success, false on NULL args or invalid hex.
 */
bool util_hex_to_bytes(const char *hex, uint8_t *out, size_t out_len);

/**
 * @brief Decode a variable-length hex string into a bounded byte buffer.
 *
 * Validates that @p hex_len is even and that the decoded byte count fits
 * @p out_cap before writing. Reports the number of bytes produced.
 *
 * @param hex         Source hex string.
 * @param hex_len     Number of hex chars to consume (must be even).
 * @param out         Destination byte buffer.
 * @param out_cap     Capacity of @p out in bytes.
 * @param out_written Receives the number of decoded bytes on success.
 *
 * @return true on success, false on NULL args, odd length, overflow, or bad hex.
 */
bool util_hex_to_bytes_span(const char *hex,
                            size_t hex_len,
                            uint8_t *out,
                            size_t out_cap,
                            size_t *out_written);

/**
 * @brief Log a truncated upper-case hex preview of a byte buffer.
 *
 * Prints at most the first 24 bytes to keep serial diagnostics concise.
 *
 * @param label Human-readable prefix for the log line.
 * @param data  Byte buffer to preview.
 * @param len   Length of @p data; only the leading bytes are shown.
 */
void util_log_hex_preview(const char *label, const uint8_t *data, size_t len);
