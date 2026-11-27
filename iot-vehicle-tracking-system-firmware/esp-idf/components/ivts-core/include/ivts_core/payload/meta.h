/**
 * @file meta.h
 * @brief Common device and message metadata for MQTT payloads.
 *
 * The message ID derives from device identity, boot ID and sequence. Replay
 * preserves it so the MQTT Bridge can deduplicate repeated delivery.
 */
#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define IVTS_MSG_ID_SIZE 37u
#define IVTS_BOOT_ID_SIZE 9u

/** Common message metadata. */
typedef struct {
    const char *device_id;
    const char *auth_token;    /**< A null value omits this field from the payload. */
    uint32_t    boot_id;
    uint32_t    seq;
    uint64_t    sent_unix_ms;  /**< Send time in Unix milliseconds. Zero means unavailable. */
    bool        time_trusted;  /**< True when sent_unix_ms comes from a trusted source. */
    uint64_t    uptime_ms;
} ivts_msg_meta_t;

/**
 * @brief Format the message ID as a NUL-terminated string.
 */
void ivts_msg_id_format(char out[IVTS_MSG_ID_SIZE], const char *device_id, uint32_t boot_id, uint32_t seq);
void ivts_boot_id_format(char out[IVTS_BOOT_ID_SIZE], uint32_t boot_id);
