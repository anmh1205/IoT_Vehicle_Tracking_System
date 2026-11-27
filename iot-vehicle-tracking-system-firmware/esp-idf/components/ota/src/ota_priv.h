#pragma once

/**
 * @file ota_priv.h
 * @brief Khai báo nội bộ của component ota.
 */

#include "ota/ota.h"

#define OTA_TAG "ota"

/** Cấu hình OTA; ghi trong ota_init(), chỉ đọc sau đó. */
extern ota_cfg_t g_ota_cfg;

/**
 * @brief Thân của một lần OTA: kiểm tra điều kiện, tải, xác minh SHA-256, ghi flash và đặt
 *        partition khởi động. Chạy trong task "ota" (ota_os.c) và trả về khi xong hoặc thất bại.
 */
void ota_run(const ivts_ota_cmd_t *cmd, uint16_t battery_mv, uint16_t min_mv);

/** Phát IVTS_EV_OTA_PROGRESS qua sink: @p phase là ivts_ota_status_t, @p err là ivts_ota_err_t. */
void ota_emit(uint8_t phase, uint8_t pct, uint8_t err);
