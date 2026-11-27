#pragma once
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/model/record.h"

#define FRAME_OVERHEAD 6u

enum { FRAME_END = 0, FRAME_CORRUPT = -1, FRAME_IO = -2 };

/* The frame is magic, payload length, payload and little-endian CRC32. */
size_t storage_queue_frame_payload_size(const uint8_t header[2]);
size_t storage_queue_frame_encode(uint8_t *frame, const uint8_t *record, size_t len);
int storage_queue_frame_decode(const uint8_t *frame, size_t size, uint8_t *payload, size_t *len);
