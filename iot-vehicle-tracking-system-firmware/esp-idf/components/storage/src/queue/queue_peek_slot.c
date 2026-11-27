#include "queue_parts.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

#include <string.h>

static SemaphoreHandle_t s_slot_mutex;
static struct {
    bool     full;                          /* Ô đang giữ một bản ghi chưa pop. */
    uint8_t  data[IVTS_RECORD_MAX_SIZE];    /* Bản ghi đã mã hoá. */
    size_t   len;
    uint32_t token;                         /* Định danh để pop. */
    uint32_t next_seg, next_off;            /* Vị trí cursor sau khi pop bản ghi này. */
} s_slot;
static uint32_t s_pending;     /* Số bản ghi còn trong queue, kể cả bản ghi trong ô peek. */
static uint32_t s_token;       /* Bộ đếm cấp token. */

void storage_queue_slot_init(void)
{
    s_slot_mutex = xSemaphoreCreateMutex();
}

void storage_queue_slot_set_count(uint32_t v)
{
    xSemaphoreTake(s_slot_mutex, portMAX_DELAY);
    s_pending = v;
    xSemaphoreGive(s_slot_mutex);
}

uint32_t storage_queue_count(void)
{
    if (s_slot_mutex == NULL) { return 0; }
    xSemaphoreTake(s_slot_mutex, portMAX_DELAY);
    uint32_t v = s_pending;
    xSemaphoreGive(s_slot_mutex);
    return v;
}

void storage_queue_slot_fill(const uint8_t *buf, size_t len, uint32_t next_seg, uint32_t next_off)
{
    xSemaphoreTake(s_slot_mutex, portMAX_DELAY);
    memcpy(s_slot.data, buf, len);
    s_slot.len = len;
    if (++s_token == 0u) { s_token++; }
    s_slot.token = s_token;
    s_slot.next_seg = next_seg;
    s_slot.next_off = next_off;
    s_slot.full = true;
    xSemaphoreGive(s_slot_mutex);
}

ivts_err_t storage_queue_peek_copy(uint8_t *out, size_t cap, size_t *len, uint32_t *token)
{
    if (out == NULL || len == NULL || token == NULL || s_slot_mutex == NULL) { return IVTS_ERR_INVALID_ARG; }
    xSemaphoreTake(s_slot_mutex, portMAX_DELAY);
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
    xSemaphoreGive(s_slot_mutex);
    return r;
}


bool storage_queue_slot_is_initialized(void) { return s_slot_mutex != NULL; }

void storage_queue_slot_reset(uint32_t count)
{
    xSemaphoreTake(s_slot_mutex, portMAX_DELAY);
    s_slot.full = false;
    s_pending = count;
    xSemaphoreGive(s_slot_mutex);
}

void storage_queue_slot_evict(uint32_t segment, uint32_t lost)
{
    xSemaphoreTake(s_slot_mutex, portMAX_DELAY);
    if (s_slot.full && s_slot.next_seg == segment) { s_slot.full = false; }
    s_pending = s_pending > lost ? s_pending - lost : 0;
    xSemaphoreGive(s_slot_mutex);
}

void storage_queue_slot_note_push(void)
{
    xSemaphoreTake(s_slot_mutex, portMAX_DELAY);
    s_pending++;
    xSemaphoreGive(s_slot_mutex);
}

bool storage_queue_slot_can_peek(uint32_t *count)
{
    xSemaphoreTake(s_slot_mutex, portMAX_DELAY);
    bool busy = s_slot.full;
    *count = s_pending;
    xSemaphoreGive(s_slot_mutex);
    return !busy && *count != 0u;
}

bool storage_queue_slot_consume(uint32_t token, uint32_t *segment, uint32_t *offset)
{
    xSemaphoreTake(s_slot_mutex, portMAX_DELAY);
    bool matches = s_slot.full && s_slot.token == token;
    if (matches) {
        *segment = s_slot.next_seg;
        *offset = s_slot.next_off;
        s_slot.full = false;
        if (s_pending > 0u) { s_pending--; }
    }
    xSemaphoreGive(s_slot_mutex);
    return matches;
}
