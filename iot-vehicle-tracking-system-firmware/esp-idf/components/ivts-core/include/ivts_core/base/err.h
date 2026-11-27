/**
 * @file include/ivts_core/base/err.h
 * @brief Portable IVTS results shared by the host and target firmware.
 *
 * ESP-IDF adapters translate their SDK results at the I/O boundary before
 * returning to portable core code. Callers can use the immutable names in logs
 * without taking ownership of a buffer.
 */
#pragma once

/** @brief Portable result returned by core and adapter interfaces. */
typedef enum {
    IVTS_OK = 0,  /**< The operation succeeds. */
    IVTS_ERR_FAIL,  /**< The operation fails without a more specific result. */
    IVTS_ERR_INVALID_ARG,  /**< An argument fails the operation's input requirements. */
    IVTS_ERR_INVALID_STATE,  /**< The current state does not permit the operation. */
    IVTS_ERR_TIMEOUT,  /**< A deadline expires before completion. */
    IVTS_ERR_NOT_FOUND,  /**< The requested item is absent. */
    IVTS_ERR_FULL,       /**< Buffer full or output truncated. */
    IVTS_ERR_IO,  /**< An input or output operation fails. */
    IVTS_ERR_CRC,  /**< A record fails its integrity check. */
    IVTS_ERR_VERSION,  /**< The format version is unsupported or incompatible. */
    IVTS_ERR_COUNT       /**< Sentinel after the last valid result code. */
} ivts_err_t;

/**
 * @brief Return the stable name of an IVTS result code.
 * @param e Result code to name.
 * @return Immutable static string, or "IVTS_ERR_UNKNOWN" for the sentinel or an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_err_name(ivts_err_t e);
