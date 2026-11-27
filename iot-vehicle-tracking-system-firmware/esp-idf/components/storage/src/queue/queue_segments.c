#include "queue_parts.h"

#include <dirent.h>
#include <errno.h>
#include <string.h>

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
