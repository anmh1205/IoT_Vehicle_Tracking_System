#pragma once

/**
 * @file contract.h
 * @brief Hợp đồng OTA giữa thiết bị và cloud: kích thước trường, mã trạng thái, mã lỗi,
 *        payload báo cáo firmware.
 */

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/payload/meta.h"

/* Kích thước buffer của các trường trong command và status (gồm NUL). */
#define IVTS_OTA_URL_SIZE        256u
#define IVTS_OTA_JOB_ID_SIZE     80u
#define IVTS_OTA_VERSION_SIZE    32u
#define IVTS_OTA_SHA256_HEX_SIZE 65u
#define IVTS_OTA_PART_LABEL_SIZE 17u   /* Label partition tối đa 16 ký tự. */

/* Thời gian chờ xác nhận image mới (giây). */
#define IVTS_OTA_CONFIRM_DEFAULT_S 180u
#define IVTS_OTA_CONFIRM_MIN_S     60u
#define IVTS_OTA_CONFIRM_MAX_S     3600u

/* Mốc tiến độ (%) báo cloud theo từng giai đoạn. */
#define IVTS_OTA_PCT_ASSIGNED     0u
#define IVTS_OTA_PCT_DL_START     5u
#define IVTS_OTA_PCT_DL_MAX       90u
#define IVTS_OTA_PCT_VERIFYING    92u
#define IVTS_OTA_PCT_INSTALLING   96u
#define IVTS_OTA_PCT_CONFIRMING   99u
#define IVTS_OTA_PCT_DONE         100u

/** Giai đoạn của một job OTA. */
typedef enum {
    IVTS_OTA_ST_ASSIGNED = 0, IVTS_OTA_ST_DOWNLOADING, IVTS_OTA_ST_VERIFYING, IVTS_OTA_ST_INSTALLING,
    IVTS_OTA_ST_REBOOTING, IVTS_OTA_ST_CONFIRMING, IVTS_OTA_ST_SUCCESS, IVTS_OTA_ST_FAILED,
    IVTS_OTA_ST_ROLLED_BACK, IVTS_OTA_ST_COUNT
} ivts_ota_status_t;

/** Mã lỗi của job OTA. */
typedef enum {
    IVTS_OTA_E_NONE = 0, IVTS_OTA_E_LOW_BATTERY, IVTS_OTA_E_UNSAFE_WINDOW, IVTS_OTA_E_SOURCE_OPEN,
    IVTS_OTA_E_HTTP_STATUS, IVTS_OTA_E_SIZE_MISMATCH, IVTS_OTA_E_SOURCE_READ, IVTS_OTA_E_BEGIN,
    IVTS_OTA_E_WRITE, IVTS_OTA_E_SHA256, IVTS_OTA_E_END, IVTS_OTA_E_SET_BOOT, IVTS_OTA_E_PERSIST,
    IVTS_OTA_E_CONFIRM_TIMEOUT, IVTS_OTA_E_BAD_COMMAND, IVTS_OTA_E_COUNT
} ivts_ota_err_t;

/** @brief Tên chuỗi gửi cloud của giai đoạn. Không bao giờ NULL. */
const char *ivts_ota_status_name(ivts_ota_status_t s);
/** @brief Tên chuỗi gửi cloud của mã lỗi; IVTS_OTA_E_NONE trả về chuỗi rỗng. Không bao giờ NULL. */
const char *ivts_ota_err_name(ivts_ota_err_t e);

/** Command OTA nhận từ cloud, đã kiểm tra kiểu và độ dài. */
typedef struct {
    char     url[IVTS_OTA_URL_SIZE];
    char     sha256_hex[IVTS_OTA_SHA256_HEX_SIZE];
    char     version[IVTS_OTA_VERSION_SIZE];
    char     job_id[IVTS_OTA_JOB_ID_SIZE];
    uint32_t size;               /**< Kích thước image cloud công bố; 0 = không kiểm tra. */
    uint32_t confirm_timeout_s;  /**< Thời gian chờ xác nhận, đã kẹp vào [MIN, MAX]. */
    bool     force;              /**< Bỏ qua kiểm tra cùng version và cửa sổ an toàn. */
} ivts_ota_cmd_t;

/** Trạng thái firmware báo cloud. */
typedef struct {
    uint8_t  status;      /**< ivts_ota_status_t. */
    uint8_t  progress;    /**< Phần trăm tiến độ, 0..100. */
    uint8_t  error;       /**< ivts_ota_err_t. */
    char     job_id[IVTS_OTA_JOB_ID_SIZE];
    char     target_version[IVTS_OTA_VERSION_SIZE];
    char     current_version[IVTS_OTA_VERSION_SIZE];
    char     partition[IVTS_OTA_PART_LABEL_SIZE];
} ivts_fw_status_t;

/**
 * @brief Dựng payload JSON báo trạng thái firmware.
 * @param m    Thông tin đầu message.
 * @param s    Trạng thái cần báo.
 * @param buf  Buffer đích.
 * @param cap  Kích thước @p buf.
 * @param len  Nhận độ dài chuỗi (không gồm NUL).
 * @return IVTS_OK; IVTS_ERR_FULL nếu buffer không đủ; IVTS_ERR_INVALID_ARG nếu m hoặc s là NULL.
 */
ivts_err_t ivts_payload_firmware(const ivts_msg_meta_t *m, const ivts_fw_status_t *s,
                                 char *buf, size_t cap, size_t *len);

/**
 * @brief Giải mã chuỗi 64 ký tự hex thành 32 byte.
 * @param hex  Chuỗi hex kết thúc bằng NUL, đúng 64 ký tự.
 * @param out  Nhận 32 byte.
 * @return IVTS_OK; IVTS_ERR_INVALID_ARG nếu sai độ dài hoặc có ký tự không phải hex.
 */
ivts_err_t ivts_sha256_hex_decode(const char *hex, uint8_t out[32]);
