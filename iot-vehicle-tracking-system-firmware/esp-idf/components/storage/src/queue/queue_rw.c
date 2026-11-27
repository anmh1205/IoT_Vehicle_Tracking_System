/**
 * @file src/queue/queue_rw.c
 * @brief Queue frame encoding, append, token-checked pop and cursor checkpoints.
 *
 * Startup and the storage task share the on-disk codec. The storage task alone appends and pops records.
 * An append updates the pending count after a full write and close. Pops advance the RAM cursor before
 * checkpointing. Checkpoint writes alternate between two files so an interrupted write leaves the
 * previous checkpoint available for startup recovery.
 * Segment discovery and recovery live in the store module. Delivery decisions belong to the app.
 */
#include "queue/queue.h"
#include "ivts_core/base/crc32.h"
#include <string.h>
#include "platform/log.h"
#include <errno.h>
#include <sys/stat.h>
#include <unistd.h>

#define FRAME_MAGIC 0xA5u   /**< First byte identifying a queue frame. */

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

#define LEGACY_CURSOR_PATH Q_DIR "/CURSOR.BIN"   /**< Read-only fallback from older firmware. */
#define LEGACY_CURSOR_MAGIC 0x51435552u   /**< Original cursor format tag. */
#define CURSOR_MAGIC 0x51435532u   /**< Sequenced cursor format tag. */

static const char *const s_cursor_paths[] = { Q_DIR "/CURSOR0.BIN", Q_DIR "/CURSOR1.BIN" };

/** @brief Original on-disk cursor layout. */
typedef struct {
    uint32_t magic;   /**< Format tag. */
    uint32_t segment;   /**< Segment ID. */
    uint32_t offset_bytes;   /**< Byte offset. */
    uint32_t crc;   /**< CRC32 of the preceding fields. */
} legacy_cursor_t;

/** @brief Checkpoint layout with a sequence whose low bit selects the file. */
typedef struct {
    uint32_t magic;   /**< Format tag. */
    uint32_t sequence;   /**< Successive checkpoint number. */
    uint32_t segment;   /**< Segment ID. */
    uint32_t offset_bytes;   /**< Byte offset. */
    uint32_t crc;   /**< CRC32 of the preceding fields. */
} cursor_t;

_Static_assert(sizeof(legacy_cursor_t) == 16u, "legacy queue cursor layout changed");
_Static_assert(sizeof(cursor_t) == 20u, "offline queue cursor layout changed");

/** @brief Read a fixed cursor record, distinguishing a missing or short file from an I/O failure. */
static esp_err_t read_cursor_file(const char *path, void *record, size_t size_bytes)
{
    FILE *f = fopen(path, "rb");
    if (f == NULL) { return errno == ENOENT ? ESP_ERR_NOT_FOUND : ESP_FAIL; }
    size_t read_bytes = fread(record, 1, size_bytes, f);
    bool failed = ferror(f) != 0;
    if (fclose(f) != 0 || failed) { return ESP_FAIL; }
    return read_bytes == size_bytes ? ESP_OK : ESP_ERR_NOT_FOUND;
}

void storage_queue_cursor_save(storage_queue_state_t *queue)
{
    cursor_t c = { CURSOR_MAGIC, queue->checkpoint_sequence + 1u, queue->read_segment, queue->read_offset, 0 };
    c.crc = ivts_crc32(0, &c, offsetof(cursor_t, crc));
    const char *path = s_cursor_paths[c.sequence & 1u];
    /* Reuse the inactive file's allocation when it exists. Leave the active file and legacy cursor alone. */
    FILE *f = fopen(path, "r+b");
    if (f == NULL && errno == ENOENT) { f = fopen(path, "wb"); }
    if (f == NULL) { return; }
    bool synced = fwrite(&c, 1, sizeof c, f) == sizeof c && fflush(f) == 0 && fsync(fileno(f)) == 0;
    int closed = fclose(f);
    if (synced) {
        /* The slot is already durable even if the subsequent close reports an error. */
        queue->checkpoint_sequence = c.sequence;
        if (closed == 0) { queue->pops_since_checkpoint = 0; }
    }
}

esp_err_t storage_queue_cursor_load(storage_queue_state_t *queue)
{
    cursor_t cursors[2];
    bool valid[2];
    for (size_t i = 0; i < 2u; i++) {
        cursor_t *c = &cursors[i];
        esp_err_t result = read_cursor_file(s_cursor_paths[i], c, sizeof *c);
        if (result == ESP_FAIL) { return result; }
        valid[i] = result == ESP_OK && c->magic == CURSOR_MAGIC && (c->sequence & 1u) == i &&
                   c->crc == ivts_crc32(0, c, offsetof(cursor_t, crc));
    }
    if (valid[0] || valid[1]) {
        /* Compare the sequence distance modulo 2^32 so wraparound keeps the newer slot active. */
        bool use_second = valid[1] &&
                          (!valid[0] || cursors[1].sequence - cursors[0].sequence < UINT32_C(0x80000000));
        const cursor_t *newest = &cursors[use_second ? 1u : 0u];
        queue->checkpoint_sequence = newest->sequence;
        queue->read_segment = newest->segment;
        queue->read_offset = newest->offset_bytes;
        return ESP_OK;
    }

    queue->checkpoint_sequence = 0;
    legacy_cursor_t legacy;
    esp_err_t result = read_cursor_file(LEGACY_CURSOR_PATH, &legacy, sizeof legacy);
    if (result != ESP_OK) { return result; }
    if (legacy.magic != LEGACY_CURSOR_MAGIC || legacy.crc != ivts_crc32(0, &legacy, offsetof(legacy_cursor_t, crc))) {
        return ESP_ERR_NOT_FOUND;
    }
    queue->read_segment = legacy.segment;
    queue->read_offset = legacy.offset_bytes;
    return ESP_OK;
}

/**
 * @brief Reclaim the oldest segment for rotation and adjust the pending count and read cursor.
 */
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
    IVTS_LOGE(STORAGE_TAG, "queue full action=drop_oldest lost=%lu", (unsigned long)lost);
    return IVTS_OK;
}

/**
 * @brief Trim an incomplete append back to the last successfully closed byte position.
 */
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

/**
 * @brief Restore the tail before making room for another complete frame.
 */
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
    /* Keep the previous byte position until the entire frame writes and closes successfully. */
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

#define CURSOR_EVERY 16u   /**< Successful pops between checkpoint attempts, unless the queue empties first. */

ivts_err_t storage_queue_pop_record(storage_queue_state_t *queue, uint32_t token)
{
    if (!storage_queue_slot_is_initialized()) { return IVTS_ERR_INVALID_ARG; }
    if (!queue->is_open) { return IVTS_ERR_INVALID_STATE; }
    if (!storage_queue_slot_consume(token, &queue->read_segment, &queue->read_offset)) {
        return IVTS_ERR_NOT_FOUND;
    }
    /* Batch checkpoints. A reset can replay acknowledgments after the last durable position. */
    if (++queue->pops_since_checkpoint >= CURSOR_EVERY || storage_queue_count() == 0u) {
        storage_queue_cursor_save(queue);
    }
    return IVTS_OK;
}
