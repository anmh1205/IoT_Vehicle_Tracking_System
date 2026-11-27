/**
 * @file err.h
 * @brief Mã lỗi dùng chung của firmware, độc lập với esp_err_t.
 *
 * Component I/O đổi esp_err_t sang ivts_err_t tại biên của mình để các
 * module thuần (ivts-core) và host test không phụ thuộc ESP-IDF.
 */
#pragma once

typedef enum {
    IVTS_OK = 0,
    IVTS_ERR_FAIL,
    IVTS_ERR_INVALID_ARG,
    IVTS_ERR_INVALID_STATE,
    IVTS_ERR_TIMEOUT,
    IVTS_ERR_NOT_FOUND,
    IVTS_ERR_FULL,       /**< Hết chỗ hoặc bị cắt. */
    IVTS_ERR_IO,
    IVTS_ERR_CRC,
    IVTS_ERR_VERSION,
    IVTS_ERR_COUNT       /**< Giá trị cuối enum, dùng để test duyệt hết các mã. */
} ivts_err_t;

/**
 * @brief Tên chuỗi của mã lỗi.
 * @return Con trỏ tới chuỗi tĩnh, không bao giờ NULL.
 */
const char *ivts_err_name(ivts_err_t e);
