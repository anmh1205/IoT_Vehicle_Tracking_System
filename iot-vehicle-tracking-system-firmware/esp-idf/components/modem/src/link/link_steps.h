#pragma once
#include "modem_link.h"

typedef enum {
    MODEM_LINK_IDLE, MODEM_LINK_ADVANCE, MODEM_LINK_FAIL, MODEM_LINK_RETRY_LATER, MODEM_LINK_RESTART, MODEM_LINK_BROKER_UP,
} step_action_t;

typedef struct {
    step_action_t action;
    modem_link_step_t target;
    uint32_t delay_ms;
} step_result_t;

step_result_t modem_link_run_step(const modem_link_t *link);
