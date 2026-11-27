/**
 * @file src/queue/queue_store.c
 * @brief Offline queue startup, segment discovery and tail recovery.
 *
 * Startup scans the SD directory, truncates a corrupt tail suffix and restores the cursor where usable.
 * The storage task owns later mutations and calls the frame and peek helpers. The app decides when to replay.
 * Recovery publishes its unread count through the shared slot interface.
 */
#include "queue/queue.h"
#include "platform/log.h"
#include <dirent.h>
#include <errno.h>
#include <sys/stat.h>
#include <unistd.h>
#include <string.h>

/* Startup owns recovery. The storage task exclusively mutates this state after startup. */
static storage_queue_state_t s_queue;

esp_err_t storage_queue_open(void)
{
    return storage_queue_open_state(&s_queue);
}

ivts_err_t storage_queue_do_push(const uint8_t *record, size_t len)
{
    return storage_queue_push_record(&s_queue, record, len);
}

ivts_err_t storage_queue_do_peek(void)
{
    return storage_queue_peek_record(&s_queue);
}

ivts_err_t storage_queue_do_pop(uint32_t token)
{
    return storage_queue_pop_record(&s_queue, token);
}

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
    /* Trim an incomplete tail frame left by a partial append or power loss. */
    int result = storage_queue_scan_segment(queue->tail, 0, &queue->tail_size, total_in_tail);
    if (result == FRAME_IO) { return false; }
    if (result == FRAME_CORRUPT) {
        char path[48];
        storage_queue_segment_path(path, sizeof path, queue->tail);
        if (truncate(path, (off_t)queue->tail_size) != 0) { return false; }
        IVTS_LOGW(STORAGE_TAG, "queue partial_frame file=%s action=truncate size=%luB", path,
                  (unsigned long)queue->tail_size);
    }
    return true;
}

/**
 * @brief Fall back to the head if the checkpoint fails validation or names an out-of-range segment.
 */
static void restore_read_cursor(storage_queue_state_t *queue)
{
    if (!storage_queue_cursor_load(queue) || queue->read_segment < queue->head || queue->read_segment > queue->tail) {
        queue->read_segment = queue->head;
        queue->read_offset = 0;
    }
    if (queue->read_segment == queue->tail && queue->read_offset > queue->tail_size) { queue->read_offset = 0; }
}

/**
 * @brief Count frames from the restored cursor, reusing the tail scan when it covers the same range.
 */
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

/**
 * @brief Publish the count and mark the queue open only after recovery succeeds.
 */
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

void storage_queue_segment_path(char *out, size_t n, uint32_t seg)
{
    snprintf(out, n, Q_DIR "/Q%07lu.BIN", (unsigned long)seg);
}

bool storage_queue_segment_id(const char *name, uint32_t *id)
{
    if (strlen(name) != sizeof("Q0000000.BIN") - 1u || name[0] != 'Q' ||
        strcmp(name + 8, ".BIN") != 0) {
        return false;
    }
    uint32_t value = 0;
    for (size_t i = 1; i < 8; i++) {
        if (name[i] < '0' || name[i] > '9') { return false; }
        value = value * 10u + (uint32_t)(name[i] - '0');
    }
    *id = value;
    return true;
}

bool storage_queue_next_segment(const storage_queue_state_t *queue, uint32_t first, uint32_t *next)
{
    *next = queue->tail;
    DIR *dir = opendir(Q_DIR);
    if (dir == NULL) { return false; }
    for (;;) {
        errno = 0;
        struct dirent *entry = readdir(dir);
        if (entry == NULL) { break; }
        uint32_t id;
        if (storage_queue_segment_id(entry->d_name, &id) && id >= first && id < *next) { *next = id; }
    }
    bool ok = errno == 0;
    closedir(dir);
    return ok;
}

int storage_queue_read_frame(FILE *file, uint32_t offset, uint8_t *payload, size_t *len)
{
    uint8_t frame[IVTS_RECORD_MAX_SIZE + FRAME_OVERHEAD];
    if (fseek(file, (long)offset, SEEK_SET) != 0) { return FRAME_IO; }
    size_t read = fread(frame, 1, 2, file);
    if (ferror(file)) { return FRAME_IO; }
    if (read == 0u) { return FRAME_END; }
    size_t payload_size = read == 2u ? storage_queue_frame_payload_size(frame) : 0u;
    if (payload_size == 0u) { return FRAME_CORRUPT; }
    size_t tail_size = payload_size + 4u;
    if (fread(frame + 2, 1, tail_size, file) != tail_size) {
        return ferror(file) ? FRAME_IO : FRAME_CORRUPT;
    }
    return storage_queue_frame_decode(frame, 2u + tail_size, payload, len);
}

int storage_queue_scan_segment(uint32_t seg, uint32_t off, uint32_t *valid_end, uint32_t *count)
{
    char p[48];
    storage_queue_segment_path(p, sizeof p, seg);
    FILE *f = fopen(p, "rb");
    *valid_end = off;
    *count = 0;
    if (f == NULL) { return errno == ENOENT ? FRAME_END : FRAME_IO; }
    int k;
    while ((k = storage_queue_read_frame(f, off, NULL, NULL)) > 0) {
        off += (uint32_t)k;
        (*count)++;
    }
    *valid_end = off;
    return fclose(f) == 0 ? k : FRAME_IO;
}

bool storage_queue_find_segment_range(uint32_t *head, uint32_t *tail)
{
    DIR *d = opendir(Q_DIR);
    if (d == NULL) { return false; }
    *head = UINT32_MAX;
    *tail = 0;
    for (;;) {
        errno = 0;
        struct dirent *de = readdir(d);
        if (de == NULL) { break; }
        uint32_t v;
        if (storage_queue_segment_id(de->d_name, &v)) {
            if (v < *head) { *head = v; }
            if (v > *tail) { *tail = v; }
        }
    }
    bool listed = errno == 0;
    closedir(d);
    if (!listed) { return false; }
    if (*head == UINT32_MAX) { *head = *tail = 0; }

    return true;
}
