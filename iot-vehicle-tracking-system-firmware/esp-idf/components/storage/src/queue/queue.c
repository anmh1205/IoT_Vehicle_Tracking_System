#include "queue_parts.h"

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
