#pragma once
#include <stdbool.h>

/* Register the app's ACK handlers before the task starts. */
void app_outbox_init(void);
/* App task. Record control messages that need publishing. */
void app_outbox_request_status(void);
void app_outbox_request_event(const char *event_code);
bool app_outbox_has_unsent_control(void);
/* App task. Publish control messages in priority order. */
void app_outbox_tick(bool heartbeat);
