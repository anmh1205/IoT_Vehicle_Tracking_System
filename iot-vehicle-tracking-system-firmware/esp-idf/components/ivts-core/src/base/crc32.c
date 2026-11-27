/**
 * @file src/base/crc32.c
 * @brief Reflected CRC-32 used by storage and retained RTC records.
 *
 * Storage uses this checksum for NVS payloads and SD queue frames and cursors.
 * The app uses it for retained RTC context. The routine reads bytes synchronously
 * and leaves framing, verification and recovery to the callers.
 */
#include "ivts_core/base/crc32.h"

#define IVTS_CRC32_POLY_REFLECTED 0xEDB88320u  /**< CRC-32 polynomial in low-bit-first form. */

uint32_t ivts_crc32(uint32_t seed, const void *data, size_t len)
{
    const uint8_t *p = (const uint8_t *)data;
    uint32_t crc = ~seed;                  /* Recover the CRC state before extending it. */

    while (len-- > 0u) {
        crc ^= *p++;
        for (int bit = 0; bit < 8; bit++) {
            /* Expand the low bit to an all-ones or all-zeroes mask. */
            uint32_t mask = 0u - (crc & 1u);
            crc = (crc >> 1) ^ (IVTS_CRC32_POLY_REFLECTED & mask);
        }
    }
    return ~crc;                           /* Apply the final complement. */
}
