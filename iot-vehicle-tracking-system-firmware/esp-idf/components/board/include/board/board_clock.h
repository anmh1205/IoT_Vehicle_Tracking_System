#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

/**
 * @brief Đọc giờ từ DS3231M.
 * @param unix_ms  Nhận Unix time (ms); 0 nếu giá trị đọc được không phải ngày hợp lệ.
 * @param trusted  Nhận true khi cờ OSF (oscillator stop flag) không bật và giờ >= 2024-01-01.
 * @return IVTS_OK; IVTS_ERR_INVALID_STATE nếu không có RTC; lỗi I2C khác.
 */
ivts_err_t board_time_get(uint64_t *unix_ms, bool *trusted);

/**
 * @brief Ghi giờ vào DS3231M rồi xoá cờ OSF.
 * @param unix_ms  Unix time (ms), năm 2000..2099.
 */
ivts_err_t board_time_set(uint64_t unix_ms);

/** @brief Thời gian từ lúc boot (ms), theo esp_timer. */
uint64_t board_uptime_ms(void);
