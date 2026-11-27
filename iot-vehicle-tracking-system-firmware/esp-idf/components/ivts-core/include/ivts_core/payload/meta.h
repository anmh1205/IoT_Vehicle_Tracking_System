/**
 * @file include/ivts_core/payload/meta.h
 * @brief Common device and message metadata for MQTT payloads.
 *
 * MQTT builders derive message identity from the device ID, boot ID and sequence.
 * Replay uses the captured values so the MQTT Bridge can deduplicate repeats.
 * The app supplies the clock observations and owns the input strings and output
 * buffers. Formatting retains no borrowed pointers.
 */
#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define IVTS_MSG_ID_SIZE 37u  /**< Formatted UUID capacity in bytes including NUL. */
#define IVTS_BOOT_ID_SIZE 9u  /**< Capacity for eight hexadecimal digits and NUL. */

/** @brief Caller-owned metadata with strings borrowed by the builder during the call. */
typedef struct {
    const char *device_id;  /**< NUL-terminated device ID borrowed for serialization. */
    const char *auth_token;    /**< Borrowed NUL-terminated token. NULL omits the field. */
    uint32_t    boot_id;  /**< Boot identifier for the message identity. */
    uint32_t    seq;  /**< Sequence number within the message boot. */
    uint64_t    sent_unix_ms;  /**< Send time in Unix milliseconds. Zero means unavailable. */
    bool        time_trusted;  /**< True when sent_unix_ms comes from a trusted source. */
    uint64_t    uptime_ms;  /**< Monotonic milliseconds since boot, used if trusted UTC is unavailable. */
} ivts_msg_meta_t;

/**
 * @brief Format a deterministic UUIDv8 message ID.
 * @param[out] out Required writable array of at least IVTS_MSG_ID_SIZE bytes, including NUL.
 * @param device_id Required NUL-terminated device identity borrowed for the call.
 * @param boot_id Boot identifier for this message.
 * @param seq Sequence allocated within the boot.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
void ivts_msg_id_format(char out[IVTS_MSG_ID_SIZE], const char *device_id, uint32_t boot_id, uint32_t seq);
/**
 * @brief Format a boot ID as eight lowercase hexadecimal digits.
 * @param[out] out Required writable array of at least IVTS_BOOT_ID_SIZE bytes, including NUL.
 * @param boot_id Boot identifier to format.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
void ivts_boot_id_format(char out[IVTS_BOOT_ID_SIZE], uint32_t boot_id);
