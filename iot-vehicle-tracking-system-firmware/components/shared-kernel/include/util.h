#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "esp_err.h"
#include "esp_log.h"

/**
 * @file util.h
 * @brief Common helpers, guard macros, and generic byte/string utilities.
 */

/** @brief Compile-time array length helper. */
#ifndef ARRAY_SIZE
#define ARRAY_SIZE(arr) (sizeof(arr) / sizeof((arr)[0]))
#endif
/** @brief Minimum helper macro. */
#define MIN_VALUE(a, b) ((a) < (b) ? (a) : (b))
/** @brief Maximum helper macro. */
#define MAX_VALUE(a, b) ((a) > (b) ? (a) : (b))

/** @brief Return from function when condition is false and log error. */
#define ESP_RETURN_ON_FALSE(cond, err_code, tag, msg, ...) \
    do { \
        if (!(cond)) { \
            ESP_LOGE(tag, msg, ##__VA_ARGS__); \
            return (err_code); \
        } \
    } while (0)

/** @brief Return from function when pointer is NULL and log error. */
#define ESP_RETURN_ON_NULL(ptr, err_code, tag, msg, ...) \
    do { \
        if ((ptr) == NULL) { \
            ESP_LOGE(tag, msg, ##__VA_ARGS__); \
            return (err_code); \
        } \
    } while (0)

/** @brief Jump to label when condition is false and log error. */
#define ESP_GOTO_ON_FALSE(cond, goto_label, tag, msg, ...) \
    do { \
        if (!(cond)) { \
            ESP_LOGE(tag, msg, ##__VA_ARGS__); \
            goto goto_label; \
        } \
    } while (0)

/** @brief Evaluate expression and jump to label when expression returns error. */
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
 * @brief Clamp floating-point value into `[min_value, max_value]`.
 *
 * @param value Input value.
 * @param min_value Minimum bound.
 * @param max_value Maximum bound.
 *
 * @return Clamped value.
 */
float util_clamp_float(float value, float min_value, float max_value);

/**
 * @brief Clamp integer value into `[min_value, max_value]`.
 *
 * @param value Input value.
 * @param min_value Minimum bound.
 * @param max_value Maximum bound.
 *
 * @return Clamped value.
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
bool util_hex_to_bytes(const char *hex, uint8_t *out, size_t out_len);
bool util_hex_to_bytes_span(const char *hex,
                            size_t hex_len,
                            uint8_t *out,
                            size_t out_cap,
                            size_t *out_written);
void util_log_hex_preview(const char *label, const uint8_t *data, size_t len);
