#pragma once
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/model/config.h"

#define STORAGE_RECORD_PAYLOAD_MAX 1537u

/* Read or commit a single versioned NVS record. Copy into the caller buffer after validation. */
ivts_err_t storage_record_load(const char *key, uint16_t version, void *buffer, size_t len);
ivts_err_t storage_record_save(const char *key, uint16_t version, const void *buffer, size_t len);

/**
 * @brief Đọc cấu hình từ NVS.
 *
 * Khi đọc không được (CRC sai, sai version, không có), *out được đặt về ivts_config_defaults().
 * Trừ trường hợp IVTS_ERR_NOT_FOUND (thiết bị mới, không phải dữ liệu hỏng), hàm còn phát
 * IVTS_EV_CONFIG_CORRUPT.
 *
 * @retval IVTS_OK            Đọc được.
 * @retval IVTS_ERR_NOT_FOUND Chưa có cấu hình.
 * @retval IVTS_ERR_CRC       Dữ liệu hỏng.
 * @retval IVTS_ERR_VERSION   Phiên bản hoặc kích thước không khớp.
 * @retval IVTS_ERR_IO        Lỗi NVS.
 */
ivts_err_t storage_config_load(ivts_config_t *out);

/**
 * @brief Ghi cấu hình xuống NVS dưới dạng một blob duy nhất (nguyên tử).
 * @retval IVTS_ERR_INVALID_ARG cfg NULL hoặc không qua ivts_config_validate().
 */
ivts_err_t storage_config_save(const ivts_config_t *cfg);

/**
 * @brief Tăng và trả về bộ đếm lần khởi động nguội (cấp nguồn hoặc reset), lưu trong NVS.
 *        Dùng làm boot_id của message_id.
 */
ivts_err_t storage_boot_id_next(uint32_t *out);
