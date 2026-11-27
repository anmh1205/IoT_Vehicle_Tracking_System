#pragma once
#include "ivts_core/fsm/axes.h"
#include "ivts_core/fsm/fsm.h"

/* App task. Request radio shutdown or sleep when both radios are already stopped. */
void app_sleep_enter(const ivts_fsm_out_t *out, ivts_fsm_t *fsm, ivts_axes_t *axes,
                     const ivts_axes_cfg_t *axes_cfg);
/* App task. Advance radio shutdown after draining events. Return true when servicing sleep. */
bool app_sleep_poll(ivts_fsm_t *fsm, ivts_axes_t *axes, const ivts_axes_cfg_t *axes_cfg, uint64_t now_ms);
