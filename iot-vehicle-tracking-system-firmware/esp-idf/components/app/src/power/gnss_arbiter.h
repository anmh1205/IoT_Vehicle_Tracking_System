#pragma once
#include <stdbool.h>
#include <stdint.h>

/* App task. Reconcile the FSM and command requests with the modem's GNSS state. */
void app_gnss_arbiter_apply(uint32_t actions, bool command_requests_gnss);
