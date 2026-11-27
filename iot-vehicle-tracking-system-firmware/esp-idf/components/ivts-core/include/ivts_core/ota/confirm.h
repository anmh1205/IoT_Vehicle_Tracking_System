#pragma once

/**
 * @file confirm.h
 * @brief Quyết định xác nhận hoặc rollback image OTA sau khi boot vào image mới.
 *
 * Thuần: không I/O, không đọc clock.
 */

#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/time.h"
#include "ivts_core/ota/contract.h"

/** Ngữ cảnh chờ xác nhận, lưu NVS để sống qua reboot. */
typedef struct {
    bool     pending;           /**< Đang chờ xác nhận image vừa cài. */
    uint32_t timeout_s;         /**< Thời gian chờ xác nhận, đã kẹp vào [MIN, MAX] khi nhận command. */
    uint64_t deadline_unix_ms;  /**< Hạn chót theo giờ thật; 0 nếu lúc cài chưa có giờ tin cậy. */
    char     job_id[IVTS_OTA_JOB_ID_SIZE];          /**< Job cần báo kết quả cho cloud sau reboot. */
    char     target_version[IVTS_OTA_VERSION_SIZE];
    char     target_partition[IVTS_OTA_PART_LABEL_SIZE];
} ivts_ota_confirm_ctx_t;

/** Quyết định của ivts_ota_confirm_decide(). */
typedef enum { IVTS_CONFIRM_WAIT = 0, IVTS_CONFIRM_ACCEPT, IVTS_CONFIRM_ROLLBACK } ivts_confirm_t;

/**
 * @brief Quyết định chờ, chấp nhận hay rollback image mới.
 *
 * - Không có xác nhận đang chờ: ACCEPT.
 * - Hết hạn giờ thật (nếu tin cậy) hoặc hết cửa sổ uptime: ROLLBACK.
 * - Trước hạn, @p healthy (broker đã ACK bản tin trạng thái): ACCEPT.
 *
 * Quyết định chỉ có nghĩa trong một lần boot: với CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE,
 * mọi reboot khi image còn PENDING_VERIFY (crash, WDT, brownout, thức từ deep sleep) khiến
 * bootloader đánh dấu ABORTED và boot lại image cũ. Deadline theo giờ thật chỉ để uptime
 * bị reset không kéo dài thời gian chờ.
 *
 * @return IVTS_CONFIRM_WAIT, IVTS_CONFIRM_ACCEPT hoặc IVTS_CONFIRM_ROLLBACK.
 */
ivts_confirm_t ivts_ota_confirm_decide(const ivts_ota_confirm_ctx_t *p, bool healthy,
                                       uint64_t now_unix_ms, bool time_trusted, ivts_ms_t uptime_ms);
