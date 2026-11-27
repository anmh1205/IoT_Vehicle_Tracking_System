/**
 * @file err.h
 * @brief Portable IVTS results shared by the host and target firmware.
 *
 * ESP-IDF adapters translate their SDK results at the I/O boundary before
 * returning to portable core code.
 */
#pragma once

typedef enum {
    IVTS_OK = 0,
    IVTS_ERR_FAIL,
    IVTS_ERR_INVALID_ARG,
    IVTS_ERR_INVALID_STATE,
    IVTS_ERR_TIMEOUT,
    IVTS_ERR_NOT_FOUND,
    IVTS_ERR_FULL,       /**< Buffer full or output truncated. */
    IVTS_ERR_IO,
    IVTS_ERR_CRC,
    IVTS_ERR_VERSION,
    IVTS_ERR_COUNT       /**< Sentinel after the last valid result code. */
} ivts_err_t;

/**
 * @brief Return the static string name for an IVTS result code.
 */
const char *ivts_err_name(ivts_err_t e);
