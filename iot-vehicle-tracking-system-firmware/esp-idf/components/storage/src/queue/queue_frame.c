#include "queue_frame.h"
#include "ivts_core/base/crc32.h"

#include <string.h>

#define FRAME_MAGIC 0xA5u

_Static_assert(IVTS_RECORD_MAX_SIZE <= UINT8_MAX, "frame payload length is one byte");

size_t storage_queue_frame_payload_size(const uint8_t header[2])
{
    return header[0] == FRAME_MAGIC && header[1] != 0u && header[1] <= IVTS_RECORD_MAX_SIZE
        ? header[1] : 0u;
}

size_t storage_queue_frame_encode(uint8_t *frame, const uint8_t *record, size_t len)
{
    frame[0] = FRAME_MAGIC;
    frame[1] = (uint8_t)len;
    memcpy(&frame[2], record, len);
    uint32_t crc = ivts_crc32(0, &frame[1], len + 1u);
    for (size_t i = 0; i < 4u; i++) { frame[2u + len + i] = (uint8_t)(crc >> (8u * i)); }
    return len + FRAME_OVERHEAD;
}

int storage_queue_frame_decode(const uint8_t *frame, size_t size, uint8_t *payload, size_t *len)
{
    if (size < 2u) { return FRAME_CORRUPT; }
    size_t payload_size = storage_queue_frame_payload_size(frame);
    if (payload_size == 0u || size != payload_size + FRAME_OVERHEAD) { return FRAME_CORRUPT; }
    const uint8_t *crc_bytes = &frame[2u + payload_size];
    uint32_t stored_crc = (uint32_t)crc_bytes[0] | ((uint32_t)crc_bytes[1] << 8) |
                          ((uint32_t)crc_bytes[2] << 16) | ((uint32_t)crc_bytes[3] << 24);
    if (ivts_crc32(0, &frame[1], payload_size + 1u) != stored_crc) { return FRAME_CORRUPT; }
    if (payload != NULL) {
        memcpy(payload, &frame[2], payload_size);
        *len = payload_size;
    }
    return (int)size;
}
