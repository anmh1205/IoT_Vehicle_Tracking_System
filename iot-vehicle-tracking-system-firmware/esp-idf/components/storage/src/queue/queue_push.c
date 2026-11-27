#include "queue_parts.h"
#include "esp_log.h"

#include <errno.h>
#include <sys/stat.h>
#include <unistd.h>

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
        /* Dọn đoạn cũ trước khi cập nhật tail; lỗi I/O giữ nguyên con trỏ ghi. */
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
