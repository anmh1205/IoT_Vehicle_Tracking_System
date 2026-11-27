#include "queue_parts.h"
#include "esp_log.h"
#include "platform/platform_clock.h"

#include <errno.h>

static int read_head_frame(const storage_queue_state_t *queue, const char *path, bool *exists, uint8_t *buffer, size_t *len)
{
    FILE *f = fopen(path, "rb");
    if (f == NULL && (errno != ENOENT || queue->read_segment == queue->tail)) { return FRAME_IO; }
    *exists = f != NULL;
    int k = (f != NULL) ? storage_queue_read_frame(f, queue->read_offset, buffer, len) : FRAME_END;
    if (f != NULL && fclose(f) != 0) { k = FRAME_IO; }
    return k;
}

static void emit_queue_ready(uint32_t pending)
{
    ivts_event_t ev = { .type = IVTS_EV_QUEUE_READY, .ts_ms = platform_uptime_ms() };
    ev.u.queue_ready.pending = pending;
    storage_emit(&ev);
}

static ivts_err_t advance_past_segment(storage_queue_state_t *queue, const char *path, bool exists)
{
    uint32_t next = queue->read_segment + 1u;
    if (exists) {
        if (remove(path) != 0 && errno != ENOENT) { return IVTS_ERR_IO; }
    } else if (!storage_queue_next_segment(queue, next, &next)) {
        return IVTS_ERR_IO;
    }
    queue->read_segment = next;
    queue->read_offset = 0;
    if (queue->head < queue->read_segment) { queue->head = queue->read_segment; }
    storage_queue_cursor_save(queue);
    return IVTS_OK;
}

ivts_err_t storage_queue_peek_record(storage_queue_state_t *queue)
{
    if (!queue->is_open) { return IVTS_ERR_INVALID_STATE; }
    uint32_t pending;
    if (!storage_queue_slot_can_peek(&pending)) { return IVTS_OK; }

    while (queue->read_segment <= queue->tail) {
        char p[48];
        storage_queue_segment_path(p, sizeof p, queue->read_segment);
        if (queue->read_segment == queue->tail && queue->read_offset >= queue->tail_size) {
            storage_queue_slot_set_count(0);
            return IVTS_OK;
        }
        bool exists;
        uint8_t buf[IVTS_RECORD_MAX_SIZE];
        size_t len = 0;
        int k = read_head_frame(queue, p, &exists, buf, &len);
        if (k == FRAME_IO) { return IVTS_ERR_IO; }
        if (k > 0) {
            storage_queue_slot_fill(buf, len, queue->read_segment, queue->read_offset + (uint32_t)k);
            emit_queue_ready(pending);
            return IVTS_OK;
        }
        if (k == FRAME_CORRUPT) {
            ESP_LOGW(STORAGE_TAG, "queue: khung hỏng %s@%lu, bỏ phần còn lại của đoạn", p, (unsigned long)queue->read_offset);
        }
        if (queue->read_segment == queue->tail) {
            storage_queue_slot_set_count(0);                            /* Bộ đếm lệch với nội dung file: lấy file làm chuẩn. */
            return IVTS_OK;
        }
        ivts_err_t error = advance_past_segment(queue, p, exists);
        if (error != IVTS_OK) { return error; }
    }
    return IVTS_OK;
}
