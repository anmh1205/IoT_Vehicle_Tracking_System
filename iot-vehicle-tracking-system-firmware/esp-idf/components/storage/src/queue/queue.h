/**
 * @file queue.h
 * @brief Private offline queue state, frame and peek-slot interfaces.
 *
 * The storage task owns segment and cursor state. The mutex protects only a
 * bounded shared copy of the current record and count.
 */
#pragma once
#include "esp_err.h"
#include "storage/offline_queue.h"
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/model/record.h"
#include <stdio.h>
#include "storage_internal.h"

/* Startup initializes the shared peek slot and recovers the on-disk queue. */
void storage_queue_slot_init(void);
esp_err_t storage_queue_open(void);
/** @brief Process one append request on the storage task. */
ivts_err_t storage_queue_do_push(const uint8_t *record, size_t len);
/** @brief Fill the shared peek slot from disk and notify its consumer. */
ivts_err_t storage_queue_do_peek(void);
/** @brief Process one pop on the storage task. A stale token is harmless. */
ivts_err_t storage_queue_do_pop(uint32_t token);

#define FRAME_OVERHEAD 6u

enum { FRAME_END = 0, FRAME_CORRUPT = -1, FRAME_IO = -2 };

/* The frame is A5, payload length, payload, then little-endian CRC32.
 * The checksum covers the length byte and payload.
 */
/** @brief Return the indicated payload size, or zero for an invalid header. */
size_t storage_queue_frame_payload_size(const uint8_t header[2]);
/** @brief Encode a validated record into len + FRAME_OVERHEAD writable bytes. */
size_t storage_queue_frame_encode(uint8_t *frame, const uint8_t *record, size_t len);
/** @brief Verify a complete frame and optionally copy its payload. Returns frame bytes or FRAME_CORRUPT. */
int storage_queue_frame_decode(const uint8_t *frame, size_t size, uint8_t *payload, size_t *len);

#define Q_DIR SD_MOUNT "/q"
#define MAX_SEGMENT_ID 9999999u

/* The queue entry points own this state and lend it to helpers only on the storage task. */
typedef struct {
    uint32_t head;
    uint32_t tail;
    uint32_t tail_size;
    uint32_t read_segment;
    uint32_t read_offset;
    uint32_t pops_since_checkpoint;
    bool is_open;
    bool tail_needs_repair;
} storage_queue_state_t;

esp_err_t storage_queue_open_state(storage_queue_state_t *queue);
ivts_err_t storage_queue_push_record(storage_queue_state_t *queue, const uint8_t *record, size_t len);
ivts_err_t storage_queue_peek_record(storage_queue_state_t *queue);
ivts_err_t storage_queue_pop_record(storage_queue_state_t *queue, uint32_t token);

void storage_queue_segment_path(char *out, size_t len, uint32_t segment);
bool storage_queue_segment_id(const char *name, uint32_t *id);
bool storage_queue_next_segment(const storage_queue_state_t *queue, uint32_t first, uint32_t *next);
bool storage_queue_find_segment_range(uint32_t *head, uint32_t *tail);
int storage_queue_read_frame(FILE *file, uint32_t offset, uint8_t *payload, size_t *len);
int storage_queue_scan_segment(uint32_t segment, uint32_t offset, uint32_t *valid_end, uint32_t *count);

/** @brief Checkpoint the read position and clear the pop count only after a successful write and close. */
void storage_queue_cursor_save(storage_queue_state_t *queue);
/** @brief Load a checksum-valid stored position. Segment recovery verifies its bounds. */
bool storage_queue_cursor_load(storage_queue_state_t *queue);

bool storage_queue_slot_is_initialized(void);
void storage_queue_slot_set_count(uint32_t count);
void storage_queue_slot_reset(uint32_t count);
void storage_queue_slot_evict(uint32_t segment, uint32_t lost);
void storage_queue_slot_note_push(void);
bool storage_queue_slot_can_peek(uint32_t *count);
void storage_queue_slot_fill(const uint8_t *data, size_t len, uint32_t next_segment, uint32_t next_offset);
/** @brief Match the current token, clear its slot and return the next cursor under the copy mutex. */
bool storage_queue_slot_consume(uint32_t token, uint32_t *segment, uint32_t *offset);
