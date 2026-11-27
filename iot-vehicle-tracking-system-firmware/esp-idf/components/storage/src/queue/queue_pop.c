#include "queue_parts.h"

#define CURSOR_EVERY 16u

ivts_err_t storage_queue_pop_record(storage_queue_state_t *queue, uint32_t token)
{
    if (!storage_queue_slot_consume(token, &queue->read_segment, &queue->read_offset)) {
        return IVTS_ERR_NOT_FOUND;
    }
    if (++queue->pops_since_checkpoint >= CURSOR_EVERY || storage_queue_count() == 0u) {
        storage_queue_cursor_save(queue);
    }
    return IVTS_OK;
}
