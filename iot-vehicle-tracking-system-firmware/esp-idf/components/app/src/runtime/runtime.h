/**
 * @file src/runtime/runtime.h
 * @brief Private interfaces for app task creation, event dispatch and FSM effects.
 *
 * Startup creates the event queue before starting producers and copies runtime policy before launching
 * the app task. Producers post copied events without waiting. The app task owns event consumption and
 * runtime state. Core FSM rules and device I/O remain in their respective modules.
 */
#pragma once
#include "ivts_core/fsm/axes.h"
#include "ivts_core/fsm/fsm.h"
#include "ivts_core/event/event.h"

/**
 * @brief Replace the axes and FSM policies used by the runtime.
 *
 * @param axes_cfg Non-null ignition and motion policy copied by value.
 * @param fsm_cfg Non-null FSM policy copied by value.
 *
 * @note Context: Startup task before the app task starts, then the app task. Blocking: non-blocking.
 */
void app_task_set_config(const ivts_axes_cfg_t *axes_cfg, const ivts_fsm_cfg_t *fsm_cfg);
/**
 * @brief Apply a vehicle voltage sample to the ignition axes.
 *
 * Use the time at dispatch to evaluate ignition hysteresis and hold times.
 *
 * @param vehicle_mv Calibrated vehicle supply voltage in millivolts.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_task_on_power_sample(uint16_t vehicle_mv);
/**
 * @brief Record an IMU motion event in the axes.
 *
 * Use the time at dispatch as the start of the quiet window.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_task_on_motion(void);

/**
 * @brief Create the queue for by-value app events.
 *
 * @retval true when the queue is allocated.
 * @retval false when allocation fails.
 *
 * @note Context: Startup task. Blocking: synchronous queue allocation.
 * @warning Call once before starting any event producer.
 */
bool app_events_init(void);
/**
 * @brief Create the app runtime task after wiring finishes.
 *
 * @param stack_bytes Stack size in bytes for the app task.
 * @param priority Scheduler priority in the valid FreeRTOS task priority range.
 * @retval true when the task is created.
 * @retval false when task creation fails.
 *
 * @note Context: Startup task. Blocking: synchronous task allocation.
 * @warning Create and configure the queue and runtime dependencies first.
 */
bool app_task_start(uint32_t stack_bytes, uint8_t priority);
/**
 * @brief Get the task-context event producer callback.
 *
 * @return Sink copied by value. It copies each event without waiting and counts full-queue drops.
 *
 * @note Context: Startup task. Blocking: non-blocking.
 * @warning Invoke the callback only after queue initialization and only from task context.
 */
ivts_sink_t app_events_sink(void);
/**
 * @brief Receive a by-value event from the app queue.
 *
 * @param[out] event Non-null caller-owned destination. Unchanged on timeout.
 * @param timeout_ms Maximum queue wait in milliseconds before tick conversion. Zero polls immediately.
 * @retval true when an event is copied and removed from the queue.
 * @retval false when the receive finds no event within the wait.
 *
 * @note Context: App task. Blocking: up to timeout_ms converted to scheduler ticks.
 */
bool app_events_receive(ivts_event_t *event, uint32_t timeout_ms);
/**
 * @brief Read the cumulative full-queue drop count.
 *
 * @return Unsigned 32-bit number of drops since startup, modulo the counter width.
 *
 * @note Context: App task, with an atomic read shared with producers. Blocking: non-blocking.
 */
uint32_t app_events_drops(void);

/**
 * @brief Apply telemetry and route one event to its app handler.
 *
 * Update the snapshot before invoking the corresponding side-effect handler, when one exists.
 *
 * @param event Non-null event borrowed for the call.
 *
 * @note Context: App task. Blocking: depends on the event and may include bus, mutex or NVS waits.
 */
void app_dispatch(const ivts_event_t *event);
/**
 * @brief Reconcile cached link state with the modem snapshot.
 *
 * Request status when a change brings the broker up. Polling covers lost queue notifications.
 *
 * @note Context: App task. Blocking: may wait on the storage peek mutex without a timeout when gathering the
 * count for a transition log.
 */
void app_dispatch_refresh_link(void);
/**
 * @brief Receive and dispatch one event.
 *
 * @param timeout_ms Queue wait in milliseconds before tick conversion. Zero polls immediately.
 * @retval true when an event is received and dispatched.
 * @retval false when no event arrives within the wait.
 *
 * @note Context: App task. Blocking: up to timeout_ms converted to scheduler ticks for receipt, plus any
 * handler waits.
 */
bool app_dispatch_next(uint32_t timeout_ms);

/**
 * @brief Apply the effects selected by the FSM.
 *
 * Apply GNSS and OBD requests and enqueue status intent before handling sleep. On iterations without sleep,
 * service the outbox before live RAW and ordinary replay.
 *
 * @param out Non-null FSM result borrowed for the call.
 * @param[in,out] fsm Non-null caller-owned FSM state. Sleep can update it.
 * @param[in,out] axes Non-null caller-owned axes. Sleep can refresh them.
 * @param axes_cfg Non-null axes policy borrowed for the call.
 *
 * @note Context: App task. Blocking: may wait on RTC, mutexes, NVS or board sleep through the selected
 * actions.
 */
void app_fsm_actions_execute(const ivts_fsm_out_t *out, ivts_fsm_t *fsm, ivts_axes_t *axes,
                             const ivts_axes_cfg_t *axes_cfg);
