#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "esp_err.h"
#include "esp_log.h"

#include "app_config.h"

/**
 * @file util.h
 * @brief Common helpers, guard macros, and OTA utility APIs.
 */

/** @brief Compile-time array length helper. */
#define ARRAY_SIZE(arr) (sizeof(arr) / sizeof((arr)[0]))
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

/**
 * @brief Download firmware image, verify hash, and set next boot partition.
 *
 * @param cfg Runtime configuration.
 * @param current_version Current running firmware version string.
 * @param cmd OTA command payload from cloud.
 * @param out_status Output firmware status report.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t util_ota_apply_update(const config_t *cfg,
                                const char *current_version,
                                const ota_command_t *cmd,
                                firmware_status_t *out_status);

/**
 * @brief Switch boot partition to rollback target manually.
 *
 * @param out_status Output firmware status report.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t util_ota_trigger_manual_rollback(firmware_status_t *out_status);

