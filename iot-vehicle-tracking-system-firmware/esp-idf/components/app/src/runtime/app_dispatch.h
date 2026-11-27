#pragma once
#include "ivts_core/event/event.h"

/* App task. Apply telemetry and dispatch controls for one event. */
void app_dispatch(const ivts_event_t *event);
void app_dispatch_refresh_link(void);
/* Receive and apply one event, optionally waiting on the queue. */
bool app_dispatch_next(uint32_t timeout_ms);
