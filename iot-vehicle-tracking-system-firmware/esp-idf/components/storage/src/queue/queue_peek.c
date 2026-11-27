/**
 * @file queue_peek.c
 * @brief Storage-task peeking and cross-task access to the cached record.
 *
 * File reads occur on the storage task. The copy mutex protects the slot, its
 * token and the pending count separately from file I/O.
 */
#include "queue/queue.h"
#include "platform/platform.h"
#include <string.h>
#include "platform/log.h"
#include <errno.h>

static platform_mutex_t s_slot_mutex;
static struct {
    bool     full;                          /* Slot contains a peeked record that has not been popped. */
    uint8_t  data[IVTS_RECORD_MAX_SIZE];    /* Serialized bytes of the peeked record. */
    size_t   len;
    uint32_t token;                         /* Token that authorizes removal of this specific record. */
    uint32_t next_seg, next_off;            /* Cursor position to commit after a matching pop. */
} s_slot;
static uint32_t s_pending;     /* Pending record count including the cached peek. */
static uint32_t s_token;       /* Sequence used to assign a new nonzero token. */

void storage_queue_slot_init(void)
{
    s_slot_mutex = platform_mutex_create();
}

void storage_queue_slot_set_count(uint32_t v)
{
    platform_mutex_lock(s_slot_mutex);
    s_pending = v;
    platform_mutex_unlock(s_slot_mutex);
}

uint32_t storage_queue_count(void)
{
    if (s_slot_mutex == NULL) { return 0; }
    platform_mutex_lock(s_slot_mutex);
    uint32_t v = s_pending;
    platform_mutex_unlock(s_slot_mutex);
    return v;
}

void storage_queue_slot_fill(const uint8_t *buf, size_t len, uint32_t next_seg, uint32_t next_off)
{
    platform_mutex_lock(s_slot_mutex);
    memcpy(s_slot.data, buf, len);
    s_slot.len = len;
    if (++s_token == 0u) { s_token++; }
    s_slot.token = s_token;
    s_slot.next_seg = next_seg;
    s_slot.next_off = next_off;
    s_slot.full = true;
    platform_mutex_unlock(s_slot_mutex);
}

ivts_err_t storage_queue_peek_copy(uint8_t *out, size_t cap, size_t *len, uint32_t *token)
{
    if (out == NULL || len == NULL || token == NULL || s_slot_mutex == NULL) { return IVTS_ERR_INVALID_ARG; }
    platform_mutex_lock(s_slot_mutex);
    ivts_err_t r = IVTS_ERR_NOT_FOUND;
    if (s_slot.full) {
        if (cap < s_slot.len) {
            r = IVTS_ERR_FULL;
        } else {
            memcpy(out, s_slot.data, s_slot.len);
            *len = s_slot.len;
            *token = s_slot.token;
            r = IVTS_OK;
        }
    }
    platform_mutex_unlock(s_slot_mutex);
    return r;
}

bool storage_queue_slot_is_initialized(void) { return s_slot_mutex != NULL; }

void storage_queue_slot_reset(uint32_t count)
{
    platform_mutex_lock(s_slot_mutex);
    s_slot.full = false;
    s_pending = count;
    platform_mutex_unlock(s_slot_mutex);
}

void storage_queue_slot_evict(uint32_t segment, uint32_t lost)
{
    platform_mutex_lock(s_slot_mutex);
    if (s_slot.full && s_slot.next_seg == segment) { s_slot.full = false; }
    s_pending = s_pending > lost ? s_pending - lost : 0;
    platform_mutex_unlock(s_slot_mutex);
}

void storage_queue_slot_note_push(void)
{
    platform_mutex_lock(s_slot_mutex);
    s_pending++;
    platform_mutex_unlock(s_slot_mutex);
}

bool storage_queue_slot_can_peek(uint32_t *count)
{
    platform_mutex_lock(s_slot_mutex);
    bool busy = s_slot.full;
    *count = s_pending;
    platform_mutex_unlock(s_slot_mutex);
    return !busy && *count != 0u;
}

bool storage_queue_slot_consume(uint32_t token, uint32_t *segment, uint32_t *offset)
{
    platform_mutex_lock(s_slot_mutex);
    bool matches = s_slot.full && s_slot.token == token;
    if (matches) {
        *segment = s_slot.next_seg;
        *offset = s_slot.next_off;
        s_slot.full = false;
        if (s_pending > 0u) { s_pending--; }
    }
    platform_mutex_unlock(s_slot_mutex);
    return matches;
}

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
            IVTS_LOGW(STORAGE_TAG, "queue corrupt_frame file=%s offset=%lu action=skip_segment_rest", p,
                      (unsigned long)queue->read_offset);
        }
        if (queue->read_segment == queue->tail) {
            storage_queue_slot_set_count(0);                            /* Reconcile the pending count with the segment contents on disk. */
            return IVTS_OK;
        }
        ivts_err_t error = advance_past_segment(queue, p, exists);
        if (error != IVTS_OK) { return error; }
    }
    return IVTS_OK;
}
