#pragma once
#include <stddef.h>
#include <stdint.h>
#include <string.h>

/* Copy the available prefix and return its size. Caller decides whether truncation is allowed. */
static inline size_t append_bounded(void *destination, size_t capacity, size_t *used,
                             const uint8_t *data, size_t len)
{
    size_t room = capacity - *used;
    size_t copied = len < room ? len : room;
    memcpy((uint8_t *)destination + *used, data, copied);
    *used += copied;
    return copied;
}
