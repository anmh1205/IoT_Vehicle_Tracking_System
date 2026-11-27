#pragma once
#include "ivts_core/fsm/axes.h"
#include "ivts_core/fsm/fsm.h"

/* Configured at boot and when a validated command changes policy. */
void app_task_set_config(const ivts_axes_cfg_t *axes_cfg, const ivts_fsm_cfg_t *fsm_cfg);
/* FreeRTOS task entry. Owns the runtime FSM, its axes and both configurations. */
void app_task_run(void *arg);
/* Event dispatch calls these on the app task. */
void app_task_on_power_sample(uint16_t vehicle_mv);
void app_task_on_motion(void);
