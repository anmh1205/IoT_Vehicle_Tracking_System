/**
 * @file src/fsm/fsm_internal.h
 * @brief Private state-transition helpers shared by the FSM and its handlers.
 *
 * The step dispatcher calls the state handler after initializing the output.
 * Handlers operate on app-task-owned data and leave effect execution to runtime code.
 */
#pragma once
#include "ivts_core/fsm/fsm.h"

/**
 * @brief Run the active state handler and add its requested actions.
 * @param[in,out] fsm Required initialized FSM owned by the app task.
 * @param cfg Required borrowed timing and sleep policy.
 * @param in Required borrowed observations for this step.
 * @param[in,out] out Required output initialized by the caller. Existing action bits are retained.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void ivts_fsm_run_state(ivts_fsm_t *fsm, const ivts_fsm_cfg_t *cfg,
                        const ivts_fsm_in_t *in, ivts_fsm_out_t *out);
