#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "esp_err.h"
#include "esp_log.h"

#define ARRAY_SIZE(arr) (sizeof(arr) / sizeof((arr)[0]))
#define MIN_VALUE(a, b) ((a) < (b) ? (a) : (b))
#define MAX_VALUE(a, b) ((a) > (b) ? (a) : (b))

#define ESP_RETURN_ON_FALSE(cond, err_code, tag, msg, ...) \
    do { \
        if (!(cond)) { \
            ESP_LOGE(tag, msg, ##__VA_ARGS__); \
            return (err_code); \
        } \
    } while (0)

#define ESP_RETURN_ON_NULL(ptr, err_code, tag, msg, ...) \
    do { \
        if ((ptr) == NULL) { \
            ESP_LOGE(tag, msg, ##__VA_ARGS__); \
            return (err_code); \
        } \
    } while (0)

#define ESP_GOTO_ON_FALSE(cond, goto_label, tag, msg, ...) \
    do { \
        if (!(cond)) { \
            ESP_LOGE(tag, msg, ##__VA_ARGS__); \
            goto goto_label; \
        } \
    } while (0)

#define ESP_GOTO_ON_ERROR(expr, goto_label, tag, msg, ...) \
    do { \
        esp_err_t _err_rc_ = (expr); \
        if (_err_rc_ != ESP_OK) { \
            ESP_LOGE(tag, msg ": %s", ##__VA_ARGS__, esp_err_to_name(_err_rc_)); \
            err = _err_rc_; \
            goto goto_label; \
        } \
    } while (0)

size_t util_copy_string(char *dst, size_t dst_size, const char *src);
uint64_t util_uptime_ms(void);
float util_clamp_float(float value, float min_value, float max_value);
int util_clamp_int(int value, int min_value, int max_value);
bool util_string_empty(const char *value);
