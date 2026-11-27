#pragma once

/**
 * @file gnss_parse.h
 * @brief Phân tích kết quả GNSS của SIM7600 thành ivts_gnss_t bằng số nguyên (không dùng float).
 *
 * Module thuần C, không có trạng thái toàn cục nên gọi được từ mọi task và kiểm thử được trên host.
 *
 * Định dạng theo SIM7500_SIM7600 Series AT Command Manual V2.00, mục 17.2.2 và 17.2.21:
 *
 *     +CGNSSINFO: <mode>,<GPS-SVs>,<GLONASS-SVs>,<BEIDOU-SVs>,<lat>,<N/S>,<log>,<E/W>,<date>,
 *                 <UTC-time>,<alt>,<speed>,<course>,<PDOP>,<HDOP>,<VDOP>   -> IVTS_GNSS_SRC_FULL
 *     +CGPSINFO:  <lat>,<N/S>,<log>,<E/W>,<date>,<UTC time>,<alt>,<speed>,<course>
 *                                                                          -> IVTS_GNSS_SRC_APPROX
 *
 * Đơn vị: lat dạng ddmm.mmmmmm, log dạng dddmm.mmmmmm, date dạng ddmmyy, time dạng hhmmss.s,
 * speed tính bằng knot. Khi chưa có fix (ví dụ "+CGNSSINFO: ,,,,") hàm trả IVTS_OK với
 * fix_valid = false.
 */

#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/model/gnss.h"

/** Phân tích một dòng +CGNSSINFO (đầy đủ). @return IVTS_OK, hoặc lỗi nếu dòng sai định dạng. */
ivts_err_t gnss_parse_cgnssinfo(const char *line, ivts_gnss_t *out);

/** Phân tích một dòng +CGPSINFO (rút gọn). @return IVTS_OK, hoặc lỗi nếu dòng sai định dạng. */
ivts_err_t gnss_parse_cgpsinfo(const char *line, ivts_gnss_t *out);

/**
 * @brief Đổi toạ độ NMEA sang độ nhân 1e7, có dấu theo bán cầu.
 *
 * Ví dụ "3113.330650" với 'N' cho 312221775. Hemisphere 'S' và 'W' cho giá trị âm.
 *
 * @param hemi 'N', 'S', 'E' hoặc 'W'; 'N'/'S' kiểm tra giới hạn vĩ độ, 'E'/'W' kiểm tra kinh độ.
 * @retval IVTS_OK              Đã chuyển đổi.
 * @retval IVTS_ERR_INVALID_ARG Tham số NULL, chuỗi sai định dạng, phút >= 60, bán cầu không hợp lệ
 *                              hoặc vượt giới hạn.
 */
ivts_err_t gnss_nmea_to_e7(const char *ddmm, char hemi, int32_t *out);

/** Đổi ngày ddmmyy và giờ hhmmss(.s) UTC sang Unix epoch tính bằng ms. */
ivts_err_t gnss_datetime_to_unix_ms(const char *ddmmyy, const char *hhmmss, uint64_t *out);
