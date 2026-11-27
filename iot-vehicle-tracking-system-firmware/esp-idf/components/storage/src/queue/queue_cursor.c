#include "queue_parts.h"
#include "ivts_core/base/crc32.h"

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
