#pragma once
#include "ivts_core/event/event.h"

/* Create the event queue before initializing producers. */
bool app_events_init(void);
bool app_events_start_task(void (*task)(void *), uint32_t stack_bytes, uint8_t priority);
/* All component tasks can post events through this nonblocking sink. */
ivts_sink_t app_events_sink(void);
/* The app task is the sole consumer. */
bool app_events_receive(ivts_event_t *event, uint32_t timeout_ms);
uint32_t app_events_drops(void);
