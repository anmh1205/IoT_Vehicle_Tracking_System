/**
 * @file civil.h
 * @brief Chuyển đổi giữa ngày giờ UTC và Unix time (ms).
 *
 * Không dùng time.h/mktime: kết quả không phụ thuộc TZ, locale hay độ rộng time_t
 * của host so với target. Dùng bởi modem (giờ GNSS) và board (DS3231M).
 */
#pragma once
#include <stdint.h>
#include "ivts_core/base/err.h"

/** Ngày giờ UTC theo lịch Gregory. */
typedef struct {
    uint16_t year;    /**< 1970..2099 */
    uint8_t  month;   /**< 1..12 */
    uint8_t  day;     /**< 1..31 */
    uint8_t  hour, min, sec;
    uint16_t ms;      /**< 0..999 */
} ivts_civil_t;

/**
 * @brief Đổi ngày giờ UTC sang Unix time (ms).
 * @param c    Ngày giờ đầu vào.
 * @param out  Nhận Unix time (ms).
 * @return IVTS_OK; IVTS_ERR_INVALID_ARG nếu con trỏ NULL, trường ngoài dải
 *         hoặc ngày không tồn tại (31/4, 29/2 năm thường).
 */
ivts_err_t ivts_civil_to_unix_ms(const ivts_civil_t *c, uint64_t *out);

/**
 * @brief Đổi Unix time (ms) sang ngày giờ UTC.
 * @param unix_ms  Unix time (ms).
 * @param c        Nhận kết quả. Không được NULL.
 */
void ivts_unix_ms_to_civil(uint64_t unix_ms, ivts_civil_t *c);
