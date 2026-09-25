#include "util.h"

#include <ctype.h>   // tolower(), isxdigit(), isdigit() for hex parsing
#include <stdio.h>   // snprintf() for safe formatted string building
#include <string.h>  // memcpy(), strnlen() for bounded buffer operations

#include "esp_random.h"  // esp_random(): hardware RNG used for UUID/boot-id entropy
#include "esp_timer.h"   // esp_timer_get_time(): microsecond monotonic uptime clock

/**
 * @file util_core.c
 * @brief Generic utility helpers shared across firmware modules.
 * This translation unit belongs to the shared kernel layer and centralizes shared primitives, validation bounds, retry helpers, and generic utilities used across components.
 */


/* Logging tag for utility functions. Prefixes every ESP_LOGx line from this unit. */
static const char *UTIL_TAG = "UTIL";
/*
 * Global process-wide gate for all firmware sleep features. Kept in a single
 * static flag so any module can query/override sleep without a config round-trip.
 * Defaults to false so the device stays awake until policy explicitly enables sleep.
 */
static bool s_sleep_enabled = false;

/**
 * @brief Safe string copy with guaranteed null termination.
 *
 * Copies string from src to dst with bounds checking.
 * Always null-terminates dst even if truncation occurs.
 *
 * @param dst Destination buffer.
 * @param dst_size Size of destination buffer.
 * @param src Source string (can be NULL).
 * @return Number of characters copied (excluding null terminator).
 */
size_t util_copy_string(char *dst, size_t dst_size, const char *src) {
    // Guard against a NULL or zero-length destination: there is nowhere safe to
    // write, so report zero bytes copied rather than dereferencing a bad pointer.
    if (dst == NULL || dst_size == 0) {
        return 0;
    }

    // A NULL source is treated as an empty string: emit a valid empty C-string
    // so the destination is always null-terminated and never left uninitialized.
    if (src == NULL) {
        dst[0] = '\0';
        return 0;
    }

    // strnlen caps the scan at dst_size-1, reserving one byte for the terminator.
    // This bounds the length even if src is not null-terminated within the buffer.
    size_t src_len = strnlen(src, dst_size - 1);
    memcpy(dst, src, src_len);  // copy only the bytes that fit (truncates if longer)
    dst[src_len] = '\0';        // always terminate, even on truncation
    return src_len;             // number of payload bytes written (excludes terminator)
}

/**
 * @brief Get ESP32 high-resolution timer in milliseconds.
 *
 * Returns uptime since boot in milliseconds.
 *
 * @return Uptime in milliseconds.
 */
uint64_t util_uptime_ms(void) {
    // esp_timer_get_time() returns microseconds since boot; divide by 1000 to
    // get milliseconds. The 64-bit width avoids the ~49-day wraparound a 32-bit
    // millisecond counter would suffer, which matters for long-running trackers.
    return (uint64_t)(esp_timer_get_time() / 1000ULL);
}

/**
 * @brief Generate RFC 4122 compliant UUID v4.
 *
 * Generates a random UUID using ESP32 random number generator.
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 *
 * @param out Output buffer (minimum 37 bytes).
 * @param out_size Size of output buffer.
 */
void util_generate_uuid_v4(char *out, size_t out_size) {
    // A canonical UUID string is 36 chars + null terminator = 37 bytes minimum.
    // Reject undersized buffers up front to prevent truncated/overflowing output.
    if (out == NULL || out_size < 37) {
        return;
    }

    // Fill all 16 UUID bytes with hardware entropy, 4 bytes per RNG draw to
    // minimize calls. esp_random() yields a full 32-bit word each iteration.
    uint8_t bytes[16] = {0};
    for (size_t i = 0; i < 16; i += 4) {
        uint32_t r = esp_random();
        bytes[i] = (uint8_t)(r & 0xFFU);              // byte 0: low 8 bits
        bytes[i + 1] = (uint8_t)((r >> 8) & 0xFFU);   // byte 1: next 8 bits
        bytes[i + 2] = (uint8_t)((r >> 16) & 0xFFU);  // byte 2: next 8 bits
        bytes[i + 3] = (uint8_t)((r >> 24) & 0xFFU);  // byte 3: high 8 bits
    }

    // RFC 4122 version/variant stamping:
    //  - byte 6 high nibble forced to 0x4 marks this as a version-4 (random) UUID.
    //  - byte 8 top two bits forced to 10b (0x80) marks the RFC 4122 variant.
    bytes[6] = (uint8_t)((bytes[6] & 0x0FU) | 0x40U);
    bytes[8] = (uint8_t)((bytes[8] & 0x3FU) | 0x80U);

    // Render the 16 bytes into the canonical 8-4-4-4-12 hyphenated hex layout.
    // snprintf is bounded by out_size; its return value is intentionally ignored
    // because the >=37 byte precondition above guarantees the full string fits.
    (void)snprintf(out,
                   out_size,
                   "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
                   bytes[0],
                   bytes[1],
                   bytes[2],
                   bytes[3],
                   bytes[4],
                   bytes[5],
                   bytes[6],
                   bytes[7],
                   bytes[8],
                   bytes[9],
                   bytes[10],
                   bytes[11],
                   bytes[12],
                   bytes[13],
                   bytes[14],
                   bytes[15]);
}

/**
 * @brief Generate unique boot identifier.
 *
 * Creates a boot identifier string including boot count
 * and random salt. Used for crash dump tracking.
 *
 * @param out Output buffer.
 * @param out_size Buffer size.
 * @param boot_count Sequential boot number.
 */
void util_generate_boot_id(char *out, size_t out_size, uint32_t boot_count) {
    // Refuse to write into a missing or zero-capacity buffer.
    if (out == NULL || out_size == 0) {
        return;
    }

    // Combine the monotonic boot counter with a random salt so two boots that
    // share a boot_count (e.g. after a counter reset) still produce distinct IDs.
    uint32_t salt = esp_random();
    // Format: "boot-<count>-<8 hex salt>". snprintf truncates safely if out_size
    // is small; the return value is not needed since callers size buffers generously.
    (void)snprintf(out,
                   out_size,
                   "boot-%lu-%08lx",
                   (unsigned long)boot_count,
                   (unsigned long)salt);
}

/**
 * @brief Enable/disable sleep mode globally.
 *
 * @param enabled true to allow sleep, false to disable.
 */
void util_set_sleep_enabled(bool enabled) {
    // Single write point for the global sleep gate; mirrors runtime config policy.
    s_sleep_enabled = enabled;
}

/**
 * @brief Check if sleep mode is enabled.
 *
 * @return true if sleep is permitted, false otherwise.
 */
bool util_is_sleep_enabled(void) {
    // Read-only accessor used by sleep-decision logic across modules.
    return s_sleep_enabled;
}

/**
 * @brief Clamp integer value to inclusive range.
 *
 * @param value Input value.
 * @param min_value Lower bound.
 * @param max_value Upper bound.
 * @return Clamped value within bounds.
 */
int util_clamp_int(int value, int min_value, int max_value) {
    // Constrain value to the inclusive [min_value, max_value] window. Used to
    // sanitize config/sensor inputs before they reach shared or persisted state.
    if (value < min_value) {
        return min_value;  // below the floor -> snap up to the minimum
    }
    if (value > max_value) {
        return max_value;  // above the ceiling -> snap down to the maximum
    }
    return value;          // already within range -> pass through unchanged
}

/**
 * @brief Check if string is NULL or empty.
 *
 * @param value String to check (can be NULL).
 * @return true if NULL or empty, false otherwise.
 */
bool util_string_empty(const char *value) {
    // Treat both a NULL pointer and a leading null byte as "empty". Short-circuit
    // ordering ensures value[0] is only read after the NULL check passes.
    return value == NULL || value[0] == '\0';
}

/**
 * @brief Convert hex string to byte array (fixed length).
 *
 * @param hex Hex string (e.g., "deadbeef").
 * @param out Output byte buffer.
 * @param out_len Exact number of bytes to convert.
 * @return true on success, false on invalid hex.
 */
bool util_hex_to_bytes(const char *hex, uint8_t *out, size_t out_len) {
    // Reject NULL inputs; the caller-supplied out_len defines exactly how many
    // bytes (and therefore 2*out_len hex chars) must be present in `hex`.
    if (hex == NULL || out == NULL) {
        return false;
    }

    // Each output byte consumes two hex nibbles: index i maps to chars [2i, 2i+1].
    for (size_t i = 0; i < out_len; ++i) {
        // Lower-case both nibble chars so 'A'..'F' and 'a'..'f' decode identically.
        // Cast to unsigned char first: passing a negative char to ctype is UB.
        const char hi = (char)tolower((unsigned char)hex[i * 2]);
        const char lo = (char)tolower((unsigned char)hex[i * 2 + 1]);
        // Bail out on any non-hex character so partial garbage is never accepted.
        if (!isxdigit((unsigned char)hi) || !isxdigit((unsigned char)lo)) {
            return false;
        }

        // Convert each nibble: digits map via '0'..'9', letters via 'a'..'f'+10.
        uint8_t high = (uint8_t)(isdigit((unsigned char)hi) ? (hi - '0') : (hi - 'a' + 10));
        uint8_t low = (uint8_t)(isdigit((unsigned char)lo) ? (lo - '0') : (lo - 'a' + 10));
        // High nibble occupies bits 7..4, low nibble bits 3..0 of the output byte.
        out[i] = (uint8_t)((high << 4) | low);
    }

    return true;
}

/**
 * @brief Convert hex string to byte array (variable length).
 *
 * @param hex Input hex string.
 * @param hex_len Length of hex string (must be even).
 * @param out Output byte buffer.
 * @param out_cap Capacity of output buffer.
 * @param out_written Number of bytes written.
 * @return true on success, false on invalid input.
 */
bool util_hex_to_bytes_span(const char *hex,
                            size_t hex_len,
                            uint8_t *out,
                            size_t out_cap,
                            size_t *out_written) {
    // Validate pointers and require an even hex length: an odd number of hex
    // chars cannot form whole bytes and indicates a malformed input string.
    if (hex == NULL || out == NULL || out_written == NULL || (hex_len % 2U) != 0U) {
        return false;
    }

    // Two hex chars decode to one byte; ensure the result fits the output buffer.
    size_t byte_len = hex_len / 2U;
    if (byte_len > out_cap) {
        return false;
    }

    // Decode byte-by-byte using the same nibble logic as the fixed-length variant.
    for (size_t i = 0; i < byte_len; ++i) {
        const char hi = (char)tolower((unsigned char)hex[i * 2U]);       // high nibble char
        const char lo = (char)tolower((unsigned char)hex[i * 2U + 1U]);  // low nibble char
        if (!isxdigit((unsigned char)hi) || !isxdigit((unsigned char)lo)) {
            return false;  // reject on first invalid nibble
        }

        uint8_t high = (uint8_t)(isdigit((unsigned char)hi) ? (hi - '0') : (hi - 'a' + 10));
        uint8_t low = (uint8_t)(isdigit((unsigned char)lo) ? (lo - '0') : (lo - 'a' + 10));
        out[i] = (uint8_t)((high << 4) | low);  // pack nibbles into one byte
    }

    // Report how many bytes were produced so the caller knows the valid span.
    *out_written = byte_len;
    return true;
}

/**
 * @brief Log hex data preview for diagnostics.
 *
 * Logs first 24 bytes of data in hex format for debugging.
 *
 * @param label Descriptive label for log line.
 * @param data Byte array to log.
 * @param len Length of data.
 */
void util_log_hex_preview(const char *label, const uint8_t *data, size_t len) {
    // Emit a bounded hex dump for diagnostics. Logging only a prefix keeps serial
    // output readable and cheap instead of flooding the console with full payloads.
    if (data == NULL || len == 0U) {
        return;  // nothing meaningful to print
    }

    // Cap the preview at 24 bytes regardless of the real payload length.
    size_t preview_len = len;
    if (preview_len > 24U) {
        preview_len = 24U;
    }

    // Buffer holds "XX " (3 chars) per byte plus the trailing null terminator.
    char preview[(24U * 3U) + 1U] = {0};
    size_t cursor = 0U;  // running write offset into the preview buffer
    // Stop when we run out of bytes OR when the next "XX " group would not fit.
    for (size_t i = 0; i < preview_len && (cursor + 3U) < sizeof(preview); ++i) {
        // Append the byte as two upper-case hex digits followed by a space.
        int written = snprintf(&preview[cursor], sizeof(preview) - cursor, "%02X ", data[i]);
        if (written <= 0) {
            break;  // formatting error -> stop building the preview
        }
        cursor += (size_t)written;  // advance past the chars just written
    }

    // Warn-level so the preview is visible at typical production log thresholds.
    ESP_LOGW(UTIL_TAG, "%s (%u bytes): %s", label, (unsigned)preview_len, preview);
}
