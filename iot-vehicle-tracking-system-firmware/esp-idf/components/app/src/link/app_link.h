#pragma once
#include <stdbool.h>
#include "ivts_core/event/event.h"

/* App task. Record the latest link state, returning true on transition. */
bool app_link_update(ivts_link_t link);
bool app_link_is_broker_up(void);
