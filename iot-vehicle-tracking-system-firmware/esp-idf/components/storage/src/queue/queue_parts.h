#pragma once
#include <stdio.h>
#include "queue.h"
#include "queue_frame.h"
#include "storage_internal.h"

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

void storage_queue_cursor_save(storage_queue_state_t *queue);
bool storage_queue_cursor_load(storage_queue_state_t *queue);

bool storage_queue_slot_is_initialized(void);
void storage_queue_slot_set_count(uint32_t count);
void storage_queue_slot_reset(uint32_t count);
void storage_queue_slot_evict(uint32_t segment, uint32_t lost);
void storage_queue_slot_note_push(void);
bool storage_queue_slot_can_peek(uint32_t *count);
void storage_queue_slot_fill(const uint8_t *data, size_t len, uint32_t next_segment, uint32_t next_offset);
bool storage_queue_slot_consume(uint32_t token, uint32_t *segment, uint32_t *offset);
