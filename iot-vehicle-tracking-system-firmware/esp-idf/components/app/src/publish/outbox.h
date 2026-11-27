#pragma once
#include <stdbool.h>

/* App task ACK callbacks registered by boot wiring. */
void app_outbox_on_status_ack(bool ok);
void app_outbox_on_boundary_ack(bool ok);
void app_outbox_on_event_ack(bool ok);
/* App task. Record control messages that need publishing. */
void app_outbox_request_status(void);
void app_outbox_request_event(const char *event_code);
bool app_outbox_has_unsent_control(void);
/* App task. Publish control messages in priority order. */
void app_outbox_tick(bool heartbeat);
