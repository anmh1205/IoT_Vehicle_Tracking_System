#include "util.h"

#include <ctype.h>
#include <stdio.h>
#include <string.h>

#include "esp_random.h"
#include "esp_timer.h"

/**
 * @file util_core.c
 * @brief Generic utility helpers shared across firmware modules.
 */

static const char *UTIL_TAG = "UTIL";
static bool s_sleep_enabled = false;

size_t util_copy_string(char *dst, size_t dst_size, const char *src) {
    if (dst == NULL || dst_size == 0) {
        return 0;
    }

    if (src == NULL) {
        dst[0] = '\0';
        return 0;
    }

    size_t src_len = strnlen(src, dst_size - 1);
    memcpy(dst, src, src_len);
    dst[src_len] = '\0';
    return src_len;
}

uint64_t util_uptime_ms(void) {
    return (uint64_t)(esp_timer_get_time() / 1000ULL);
}

void util_generate_uuid_v4(char *out, size_t out_size) {
    if (out == NULL || out_size < 37) {
        return;
    }

    uint8_t bytes[16] = {0};
    for (size_t i = 0; i < 16; i += 4) {
        uint32_t r = esp_random();
        bytes[i] = (uint8_t)(r & 0xFFU);
        bytes[i + 1] = (uint8_t)((r >> 8) & 0xFFU);
        bytes[i + 2] = (uint8_t)((r >> 16) & 0xFFU);
        bytes[i + 3] = (uint8_t)((r >> 24) & 0xFFU);
    }

    bytes[6] = (uint8_t)((bytes[6] & 0x0FU) | 0x40U);
    bytes[8] = (uint8_t)((bytes[8] & 0x3FU) | 0x80U);

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

void util_generate_boot_id(char *out, size_t out_size, uint32_t boot_count) {
    if (out == NULL || out_size == 0) {
        return;
    }

    uint32_t salt = esp_random();
    (void)snprintf(out,
                   out_size,
                   "boot-%lu-%08lx",
                   (unsigned long)boot_count,
                   (unsigned long)salt);
}

void util_set_sleep_enabled(bool enabled) {
    s_sleep_enabled = enabled;
}

bool util_is_sleep_enabled(void) {
    return s_sleep_enabled;
}

float util_clamp_float(float value, float min_value, float max_value) {
    if (value < min_value) {
        return min_value;
    }
    if (value > max_value) {
        return max_value;
    }
    return value;
}

int util_clamp_int(int value, int min_value, int max_value) {
    if (value < min_value) {
        return min_value;
    }
    if (value > max_value) {
        return max_value;
    }
    return value;
}

bool util_string_empty(const char *value) {
    return value == NULL || value[0] == '\0';
}

bool util_hex_to_bytes(const char *hex, uint8_t *out, size_t out_len) {
    if (hex == NULL || out == NULL) {
        return false;
    }

    for (size_t i = 0; i < out_len; ++i) {
        const char hi = (char)tolower((unsigned char)hex[i * 2]);
        const char lo = (char)tolower((unsigned char)hex[i * 2 + 1]);
        if (!isxdigit((unsigned char)hi) || !isxdigit((unsigned char)lo)) {
            return false;
        }

        uint8_t high = (uint8_t)(isdigit((unsigned char)hi) ? (hi - '0') : (hi - 'a' + 10));
        uint8_t low = (uint8_t)(isdigit((unsigned char)lo) ? (lo - '0') : (lo - 'a' + 10));
        out[i] = (uint8_t)((high << 4) | low);
    }

    return true;
}

bool util_hex_to_bytes_span(const char *hex,
                            size_t hex_len,
                            uint8_t *out,
                            size_t out_cap,
                            size_t *out_written) {
    if (hex == NULL || out == NULL || out_written == NULL || (hex_len % 2U) != 0U) {
        return false;
    }

    size_t byte_len = hex_len / 2U;
    if (byte_len > out_cap) {
        return false;
    }

    for (size_t i = 0; i < byte_len; ++i) {
        const char hi = (char)tolower((unsigned char)hex[i * 2U]);
        const char lo = (char)tolower((unsigned char)hex[i * 2U + 1U]);
        if (!isxdigit((unsigned char)hi) || !isxdigit((unsigned char)lo)) {
            return false;
        }

        uint8_t high = (uint8_t)(isdigit((unsigned char)hi) ? (hi - '0') : (hi - 'a' + 10));
        uint8_t low = (uint8_t)(isdigit((unsigned char)lo) ? (lo - '0') : (lo - 'a' + 10));
        out[i] = (uint8_t)((high << 4) | low);
    }

    *out_written = byte_len;
    return true;
}

void util_log_hex_preview(const char *label, const uint8_t *data, size_t len) {
    if (data == NULL || len == 0U) {
        return;
    }

    size_t preview_len = len;
    if (preview_len > 24U) {
        preview_len = 24U;
    }

    char preview[(24U * 3U) + 1U] = {0};
    size_t cursor = 0U;
    for (size_t i = 0; i < preview_len && (cursor + 3U) < sizeof(preview); ++i) {
        int written = snprintf(&preview[cursor], sizeof(preview) - cursor, "%02X ", data[i]);
        if (written <= 0) {
            break;
        }
        cursor += (size_t)written;
    }

    ESP_LOGW(UTIL_TAG, "%s (%u bytes): %s", label, (unsigned)preview_len, preview);
}
