#pragma once
#include <stdbool.h>
#include "ivts_core/model/session.h"

typedef enum {
    REPLAY_BUSY,                   /* Waiting on an older RAW record or outstanding SD operation. */
    REPLAY_DONE_BEFORE_BOUNDARY,   /* The next SD record follows the requested boundary. */
    REPLAY_EMPTY,
} app_replay_result_t;

/* App task. Issue the next peek or send when the modem slot is free. */
void app_replay_tick(void);
app_replay_result_t app_replay_until(const ivts_session_boundary_t *boundary);
void app_replay_on_ack(bool ok);
void app_replay_on_queue_ready(void);
