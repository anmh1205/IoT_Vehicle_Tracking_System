#pragma once
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/model/obd.h"

/**
 * @file obd_pid.h
 * @brief Giải mã OBD-II service 01, 03, 07 và 0A từ dãy byte đã bỏ header.
 *
 * Module thuần C, không trạng thái; kiểm thử được trên host. Công thức theo SAE J1979
 * (tham chiếu: en.wikipedia.org/wiki/OBD-II_PIDs).
 */

/**
 * @brief Giải mã một PID service 01.
 * @param b Dữ liệu dạng [0x41, pid, A, B, ...].
 * @param[in,out] s Mẫu cần điền; giá trị giải mã được ghi vào đúng trường và bật bit tương ứng
 *                  trong valid_mask.
 * @retval IVTS_OK            Đã giải mã.
 * @retval IVTS_ERR_NOT_FOUND PID không được hỗ trợ.
 * @retval IVTS_ERR_INVALID_ARG Dữ liệu NULL hoặc không đủ byte.
 */
ivts_err_t obd_pid_decode(const uint8_t *b, size_t n, ivts_obd_sample_t *s);

/**
 * @brief Giải mã trạng thái sẵn sàng của các monitor (PID 0x01).
 * @param b Dữ liệu dạng [0x41, 0x01, A, B, C, D].
 */
ivts_err_t obd_readiness_decode(const uint8_t *b, size_t n, ivts_obd_readiness_t *r);

/**
 * @brief Giải mã danh sách DTC của service 03 (stored), 07 (pending) hoặc 0A (permanent).
 * @param b Dữ liệu dạng [0x43|0x47|0x4A, (số lượng trên CAN), hi, lo, hi, lo, ...].
 */
ivts_err_t obd_dtc_decode(const uint8_t *b, size_t n, ivts_dtc_list_t *d);

/**
 * @brief Định dạng một DTC hai byte thành chuỗi, ví dụ (0x01, 0x33) thành "P0133".
 * @param[out] out Bộ đệm IVTS_DTC_CODE_SIZE byte, kết thúc bằng NUL.
 */
void obd_dtc_format(uint8_t hi, uint8_t lo, char out[IVTS_DTC_CODE_SIZE]);
