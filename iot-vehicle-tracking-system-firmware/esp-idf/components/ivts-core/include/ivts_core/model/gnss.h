#pragma once
#include <stdbool.h>
#include <stdint.h>

/** Nguồn của mẫu GNSS. */
typedef enum {
    IVTS_GNSS_SRC_NONE = 0,
    IVTS_GNSS_SRC_FULL,     /**< Có số vệ tinh theo từng hệ. */
    IVTS_GNSS_SRC_APPROX    /**< Nguồn dự phòng, không có số vệ tinh (sats = 0). */
} ivts_gnss_src_t;

/** Một mẫu định vị. Toạ độ là số nguyên, không dùng float. */

typedef struct {
    uint64_t ts_unix_ms;       /**< Giờ UTC của mẫu; 0 = chưa biết. */
    int32_t  lat_e7;           /**< Vĩ độ (độ * 1e7), |giá trị| <= 900000000. */
    int32_t  lon_e7;           /**< Kinh độ (độ * 1e7), |giá trị| <= 1800000000. */
    uint16_t speed_cm_s;       /**< Tốc độ (cm/s). */
    uint16_t course_deg_x10;   /**< Hướng (độ * 10), 0..3599. */
    uint8_t  sats;             /**< Số vệ tinh. */
    uint8_t  src;              /**< ivts_gnss_src_t; lưu uint8_t để kích thước cố định. */
    bool     fix_valid;        /**< false: không có fix, các trường vị trí không có giá trị. */
} ivts_gnss_t;
