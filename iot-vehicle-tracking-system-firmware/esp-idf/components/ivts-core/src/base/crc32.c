/**
 * @file crc32.c
 * @brief Reflected CRC-32 used by storage and retained RTC records.
 */
#include "ivts_core/base/crc32.h"

#define IVTS_CRC32_POLY_REFLECTED 0xEDB88320u

uint32_t ivts_crc32(uint32_t seed, const void *data, size_t len)
{
    const uint8_t *p = (const uint8_t *)data;
    uint32_t crc = ~seed;                  /* Swap inverted input bounds so the caller can supply them in either order. */

    while (len-- > 0u) {
        crc ^= *p++;
        for (int bit = 0; bit < 8; bit++) {
            /* Expand the low bit to an all-ones or all-zeroes mask. */
            uint32_t mask = 0u - (crc & 1u);
            crc = (crc >> 1) ^ (IVTS_CRC32_POLY_REFLECTED & mask);
        }
    }
    return ~crc;                           /* Complement the input CRC before processing the next block. */
}
