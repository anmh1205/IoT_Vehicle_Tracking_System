/**
 * @file runtime.h
 * @brief Private interfaces for app task creation, event dispatch and FSM effects.
 *
 * Producers receive a nonblocking sink after queue creation. The app task
 * serializes event delivery and runtime state transitions.
 */
#pragma once
#include "ivts_core/fsm/axes.h"
#include "ivts_core/fsm/fsm.h"
#include "ivts_core/event/event.h"

/* Configured at boot and when a validated command changes policy. */
void app_task_set_config(const ivts_axes_cfg_t *axes_cfg, const ivts_fsm_cfg_t *fsm_cfg);
/* Event dispatch calls these on the app task. */
void app_task_on_power_sample(uint16_t vehicle_mv);
void app_task_on_motion(void);

/* Create the event queue before initializing producers. */
bool app_events_init(void);
/** @brief Start the task after boot has configured the runtime and all producers. */
bool app_task_start(uint32_t stack_bytes, uint8_t priority);
/* All component tasks can post events through this nonblocking sink. */
ivts_sink_t app_events_sink(void);
/** @brief Receive a copied event on the app task, with timeout in milliseconds. */
bool app_events_receive(ivts_event_t *event, uint32_t timeout_ms);
/** @brief Read the cumulative number of full-queue drops since boot. */
uint32_t app_events_drops(void);

/* App task. Apply telemetry and dispatch controls for one event. */
void app_dispatch(const ivts_event_t *event);
/** @brief Reconcile link state even when the queue lost its notification. */
void app_dispatch_refresh_link(void);
/* Receive and apply one event, optionally waiting on the queue. */
bool app_dispatch_next(uint32_t timeout_ms);

/* App task. Execute the effects selected for this iteration of the FSM. */
void app_fsm_actions_execute(const ivts_fsm_out_t *out, ivts_fsm_t *fsm, ivts_axes_t *axes,
                             const ivts_axes_cfg_t *axes_cfg);
