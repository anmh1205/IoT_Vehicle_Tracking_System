#include "ivts_core/base/crc32.h"

#define IVTS_CRC32_POLY_REFLECTED 0xEDB88320u

uint32_t ivts_crc32(uint32_t seed, const void *data, size_t len)
{
    const uint8_t *p = (const uint8_t *)data;
    uint32_t crc = ~seed;                  /* đảo đầu vào: cho phép ghép đoạn */

    while (len-- > 0u) {
        crc ^= *p++;
        for (int bit = 0; bit < 8; bit++) {
            /* nếu bit thấp = 1 thì mask = 0xFFFFFFFF, ngược lại 0 */
            uint32_t mask = 0u - (crc & 1u);
            crc = (crc >> 1) ^ (IVTS_CRC32_POLY_REFLECTED & mask);
        }
    }
    return ~crc;                           /* đảo đầu ra */
}
