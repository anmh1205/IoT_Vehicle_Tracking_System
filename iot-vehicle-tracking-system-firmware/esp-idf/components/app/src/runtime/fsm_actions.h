#pragma once
#include "ivts_core/fsm/axes.h"
#include "ivts_core/fsm/fsm.h"

/* App task. Execute the effects selected for this iteration of the FSM. */
void app_fsm_actions_execute(const ivts_fsm_out_t *out, ivts_fsm_t *fsm, ivts_axes_t *axes,
                             const ivts_axes_cfg_t *axes_cfg);
