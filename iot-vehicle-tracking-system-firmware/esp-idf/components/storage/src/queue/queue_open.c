#include "queue_parts.h"
#include "esp_log.h"

#include <dirent.h>
#include <errno.h>
#include <sys/stat.h>
#include <unistd.h>

static esp_err_t validate_queue_cfg(void)
{
    if (!storage_queue_slot_is_initialized() || storage_config_view()->queue_max_segments < 2u ||
        storage_config_view()->queue_segment_bytes < IVTS_RECORD_MAX_SIZE + FRAME_OVERHEAD) {
        return ESP_ERR_INVALID_ARG;
    }
    return ESP_OK;
}

static bool repair_tail_segment(storage_queue_state_t *queue, uint32_t *total_in_tail)
{
    /* Cắt khung dở ở cuối đoạn đang ghi (nguồn mất giữa lúc fwrite). */
    int result = storage_queue_scan_segment(queue->tail, 0, &queue->tail_size, total_in_tail);
    if (result == FRAME_IO) { return false; }
    if (result == FRAME_CORRUPT) {
        char path[48];
        storage_queue_segment_path(path, sizeof path, queue->tail);
        if (truncate(path, (off_t)queue->tail_size) != 0) { return false; }
        ESP_LOGW(STORAGE_TAG, "queue: bỏ phần khung dở ở %s", path);
    }
    return true;
}

static void restore_read_cursor(storage_queue_state_t *queue)
{
    if (!storage_queue_cursor_load(queue) || queue->read_segment < queue->head || queue->read_segment > queue->tail) {
        queue->read_segment = queue->head;
        queue->read_offset = 0;
    }
    if (queue->read_segment == queue->tail && queue->read_offset > queue->tail_size) { queue->read_offset = 0; }
}

static bool count_unread_records(const storage_queue_state_t *queue, uint32_t total_in_tail, uint32_t *unread)
{
    uint32_t pending = 0;
    DIR *d = opendir(Q_DIR);
    if (d == NULL) { return false; }
    bool listed;
    for (;;) {
        errno = 0;
        struct dirent *de = readdir(d);
        if (de == NULL) { listed = errno == 0; break; }
        uint32_t seg;
        if (!storage_queue_segment_id(de->d_name, &seg) || seg < queue->read_segment) { continue; }
        uint32_t count = total_in_tail;
        if (seg != queue->tail || (seg == queue->read_segment && queue->read_offset != 0u)) {
            uint32_t end;
            if (storage_queue_scan_segment(seg, seg == queue->read_segment ? queue->read_offset : 0u, &end, &count) == FRAME_IO) {
                listed = false;
                break;
            }
        }
        pending += count;
    }
    closedir(d);
    if (!listed) { return false; }
    *unread = pending;
    return true;
}

static void publish_initial_count(storage_queue_state_t *queue, uint32_t pending)
{
    storage_queue_slot_reset(pending);
    queue->pops_since_checkpoint = 0;
    queue->tail_needs_repair = false;
    queue->is_open = true;
}

esp_err_t storage_queue_open_state(storage_queue_state_t *queue)
{
    queue->is_open = false;
    esp_err_t error = validate_queue_cfg();
    if (error != ESP_OK) { return error; }
    if (mkdir(Q_DIR, 0775) != 0 && errno != EEXIST) { return ESP_FAIL; }
    if (!storage_queue_find_segment_range(&queue->head, &queue->tail)) { return ESP_FAIL; }

    uint32_t total_in_tail;
    if (!repair_tail_segment(queue, &total_in_tail)) { return ESP_FAIL; }
    restore_read_cursor(queue);

    uint32_t unread;
    if (!count_unread_records(queue, total_in_tail, &unread)) { return ESP_FAIL; }
    publish_initial_count(queue, unread);
    return ESP_OK;
}
