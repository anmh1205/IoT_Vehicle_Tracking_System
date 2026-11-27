#pragma once
#include "ivts_core/fsm/fsm.h"

/* Run the current state's transitions after initializing the common output. */
void ivts_fsm_run_state(ivts_fsm_t *fsm, const ivts_fsm_cfg_t *cfg,
                        const ivts_fsm_in_t *in, ivts_fsm_out_t *out);
