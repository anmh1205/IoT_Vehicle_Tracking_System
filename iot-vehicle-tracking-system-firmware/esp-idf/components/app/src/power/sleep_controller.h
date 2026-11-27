#pragma once
#include "ivts_core/fsm/axes.h"
#include "ivts_core/fsm/fsm.h"

typedef bool (*app_sleep_dispatch_t)(uint32_t timeout_ms);

/* App task. Stop radios and apply the selected sleep mode. May block until wake. */
void app_sleep_enter(const ivts_fsm_out_t *out, ivts_fsm_t *fsm, ivts_axes_t *axes,
                     const ivts_axes_cfg_t *axes_cfg, app_sleep_dispatch_t dispatch_next);
