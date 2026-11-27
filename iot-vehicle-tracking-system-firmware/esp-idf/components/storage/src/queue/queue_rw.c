/**
 * @file queue_rw.c
 * @brief Queue frame codec, record append, token-checked pop and cursor persistence.
 *
 * Write the existing disk frame with its CRC. Only pop the record matching the
 * active token and checkpoint the advanced read cursor at the established
 * intervals.
 */
#include "queue/queue.h"
#include "ivts_core/base/crc32.h"
#include <string.h>
#include "esp_log.h"
#include <errno.h>
#include <sys/stat.h>
#include <unistd.h>

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

#define CURSOR_PATH Q_DIR "/CURSOR.BIN"
#define CURSOR_MAGIC 0x51435552u /* QCUR */

/* Cursor bytes and CRC are shared with firmware already deployed. */
typedef struct { uint32_t magic, seg, off, crc; } cursor_t;
_Static_assert(sizeof(cursor_t) == 16u, "offline queue cursor layout changed");

void storage_queue_cursor_save(storage_queue_state_t *queue)
{
    cursor_t c = { CURSOR_MAGIC, queue->read_segment, queue->read_offset, 0 };
    c.crc = ivts_crc32(0, &c, offsetof(cursor_t, crc));
    FILE *f = fopen(CURSOR_PATH, "wb");
    if (f == NULL) { return; }
    size_t written = fwrite(&c, 1, sizeof c, f);
    if (fclose(f) == 0 && written == sizeof c) { queue->pops_since_checkpoint = 0; }
}

bool storage_queue_cursor_load(storage_queue_state_t *queue)
{
    cursor_t c;
    FILE *f = fopen(CURSOR_PATH, "rb");
    if (f == NULL) { return false; }
    size_t n = fread(&c, 1, sizeof c, f);
    fclose(f);
    if (n != sizeof c || c.magic != CURSOR_MAGIC || c.crc != ivts_crc32(0, &c, offsetof(cursor_t, crc))) {
        return false;
    }
    queue->read_segment = c.seg;
    queue->read_offset = c.off;
    return true;
}

static ivts_err_t drop_head_segment(storage_queue_state_t *queue)
{
    uint32_t lost = 0;
    if (queue->read_segment == queue->head) {
        uint32_t end;
        if (storage_queue_scan_segment(queue->head, queue->read_offset, &end, &lost) == FRAME_IO) { return IVTS_ERR_IO; }
    }
    char p[48];
    storage_queue_segment_path(p, sizeof p, queue->head);
    uint32_t next = queue->head + 1u;
    if (remove(p) != 0) {
        if (errno != ENOENT || !storage_queue_next_segment(queue, next, &next)) { return IVTS_ERR_IO; }
    }
    storage_queue_slot_evict(queue->head, lost);
    if (queue->read_segment < next) { queue->read_segment = next; queue->read_offset = 0; storage_queue_cursor_save(queue); }
    queue->head = next;
    ESP_LOGW(STORAGE_TAG, "queue đầy: bỏ %lu bản ghi cũ nhất", (unsigned long)lost);
    return IVTS_OK;
}

static bool repair_tail(const storage_queue_state_t *queue)
{
    char path[48];
    storage_queue_segment_path(path, sizeof path, queue->tail);
    struct stat st;
    if (stat(path, &st) != 0) { return errno == ENOENT && queue->tail_size == 0u; }
    if (st.st_size < (off_t)queue->tail_size) { return false; }
    return st.st_size == (off_t)queue->tail_size || truncate(path, (off_t)queue->tail_size) == 0;
}

static ivts_err_t rotate_tail_if_full(storage_queue_state_t *queue, size_t len)
{
    if (queue->tail_size + len + FRAME_OVERHEAD > storage_config_view()->queue_segment_bytes) {
        if (queue->tail == MAX_SEGMENT_ID) { return IVTS_ERR_FULL; }
        /*
         * Reclaim old segments before updating the tail. On failure, preserve
         * the current write position.
         */
        while (queue->tail - queue->head + 1u >= storage_config_view()->queue_max_segments) {
            ivts_err_t result = drop_head_segment(queue);
            if (result != IVTS_OK) { return result; }
        }
        queue->tail++;
        queue->tail_size = 0;
    }
    return IVTS_OK;
}

static ivts_err_t ensure_room(storage_queue_state_t *queue, size_t len)
{
    if (queue->tail_needs_repair) {
        if (!repair_tail(queue)) { return IVTS_ERR_IO; }
        queue->tail_needs_repair = false;
    }
    return rotate_tail_if_full(queue, len);
}

static ivts_err_t append_frame(storage_queue_state_t *queue, const uint8_t *frame, size_t frame_size)
{
    char p[48];
    storage_queue_segment_path(p, sizeof p, queue->tail);
    FILE *f = fopen(p, "ab");
    if (f == NULL) { return IVTS_ERR_IO; }
    if (fseek(f, 0, SEEK_END) != 0 || ftell(f) != (long)queue->tail_size) {
        fclose(f);
        return IVTS_ERR_IO;
    }
    size_t w = fwrite(frame, 1, frame_size, f);
    int rc = fclose(f);
    if (w != frame_size || rc != 0) {
        queue->tail_needs_repair = !repair_tail(queue);
        return IVTS_ERR_IO;
    }
    queue->tail_size += (uint32_t)(frame_size);
    storage_queue_slot_note_push();
    return IVTS_OK;
}

ivts_err_t storage_queue_push_record(storage_queue_state_t *queue, const uint8_t *rec, size_t len)
{
    if (!queue->is_open) { return IVTS_ERR_INVALID_STATE; }
    if (len == 0u || len > IVTS_RECORD_MAX_SIZE) { return IVTS_ERR_INVALID_ARG; }
    ivts_err_t result = ensure_room(queue, len);
    if (result != IVTS_OK) { return result; }
    uint8_t frame[IVTS_RECORD_MAX_SIZE + FRAME_OVERHEAD];
    size_t frame_size = storage_queue_frame_encode(frame, rec, len);
    return append_frame(queue, frame, frame_size);
}

#define CURSOR_EVERY 16u

ivts_err_t storage_queue_pop_record(storage_queue_state_t *queue, uint32_t token)
{
    if (!storage_queue_slot_consume(token, &queue->read_segment, &queue->read_offset)) {
        return IVTS_ERR_NOT_FOUND;
    }
    if (++queue->pops_since_checkpoint >= CURSOR_EVERY || storage_queue_count() == 0u) {
        storage_queue_cursor_save(queue);
    }
    return IVTS_OK;
}
