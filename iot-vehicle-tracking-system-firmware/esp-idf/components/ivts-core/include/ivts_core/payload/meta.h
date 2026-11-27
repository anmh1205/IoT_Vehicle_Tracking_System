#pragma once

/**
 * @file meta.h
 * @brief Thông tin đầu mỗi message gửi cloud.
 *
 * message_id là UUID xác định từ thiết bị, boot_id và seq. Bản replay giữ đúng id
 * để MQTT Bridge có thể khử trùng.
 */

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define IVTS_MSG_ID_SIZE 37u
#define IVTS_BOOT_ID_SIZE 9u

/** Thông tin đầu message. */
typedef struct {
    const char *device_id;
    const char *auth_token;    /**< NULL = không đưa vào payload. */
    uint32_t    boot_id;
    uint32_t    seq;
    uint64_t    sent_unix_ms;  /**< Thời điểm gửi (Unix ms); 0 = chưa có giờ. */
    bool        time_trusted;  /**< sent_unix_ms lấy từ nguồn giờ tin cậy. */
    uint64_t    uptime_ms;
} ivts_msg_meta_t;

/**
 * @brief Định dạng message_id vào @p out (có NUL).
 */
void ivts_msg_id_format(char out[IVTS_MSG_ID_SIZE], const char *device_id, uint32_t boot_id, uint32_t seq);
void ivts_boot_id_format(char out[IVTS_BOOT_ID_SIZE], uint32_t boot_id);
