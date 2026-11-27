/**
 * @file semphr.h
 * @brief Deterministic FreeRTOS mutex substitute for single-threaded host fixtures.
 *
 * The fixture uses distinct objects for platform mutex allocations. It asserts
 * each lock and release pair without emulating target scheduling.
 */
#pragma once
#include <assert.h>
#include <stdbool.h>

#define pdTRUE 1

typedef bool *SemaphoreHandle_t;

static inline SemaphoreHandle_t xSemaphoreCreateMutex(void)
{
    static bool held[32];
    static unsigned used;
    assert(used < sizeof held / sizeof held[0]);
    return &held[used++];
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
