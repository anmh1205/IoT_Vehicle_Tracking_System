#pragma once
#include <assert.h>
#include <stdbool.h>

#define pdTRUE 1

typedef bool *SemaphoreHandle_t;

static inline SemaphoreHandle_t xSemaphoreCreateMutex(void)
{
    static bool held;
    return &held;
}

static inline int xSemaphoreTake(SemaphoreHandle_t mutex, unsigned ticks)
{
    (void)ticks;
    assert(!*mutex);
    *mutex = true;
    return pdTRUE;
}

static inline void xSemaphoreGive(SemaphoreHandle_t mutex)
{
    assert(*mutex);
    *mutex = false;
}
