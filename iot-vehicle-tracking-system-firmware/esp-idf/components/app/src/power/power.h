/**
 * @file src/power/power.h
 * @brief App sleep coordination and status LED interfaces.
 *
 * The app task owns the pending sleep request and supplies FSM and axes state during a sleep check.
 * Radio shutdown proceeds asynchronously before the board call, which can suspend the task.
 * The FSM chooses sleep policy and the board adapter owns hardware sleep and GPIO.
 */
#pragma once
#include "ivts_core/fsm/axes.h"
#include "ivts_core/fsm/fsm.h"
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/fsm/state.h"

/**
 * @brief Start handling an FSM sleep request.
 *
 * Simulated sleep updates telemetry and returns. For real sleep, request BLE shutdown and check or request
 * modem shutdown. If the modem must stop, copy the request for app_sleep_poll() with an 8000 ms deadline.
 *
 * @param out Non-null FSM sleep output. Copied by value when radio shutdown is pending.
 * @param[in,out] fsm Non-null caller-owned FSM updated when sleep aborts or returns.
 * @param[in,out] axes Non-null caller-owned axes refreshed before entering sleep.
 * @param axes_cfg Non-null axes policy borrowed for the call.
 *
 * @note Context: App task. Blocking: may suspend the task in light sleep until a wake source fires, including
 * the
 * timer for the requested duration in seconds. Deep sleep resumes execution through startup.
 */
void app_sleep_enter(const ivts_fsm_out_t *out, ivts_fsm_t *fsm, ivts_axes_t *axes,
                     const ivts_axes_cfg_t *axes_cfg);
/**
 * @brief Advance an outstanding radio shutdown and sleep request.
 *
 * Return promptly while the modem is still stopping. On shutdown or deadline, recheck BLE, ignition and
 * armed motion before entering sleep or aborting.
 *
 * @param[in,out] fsm Non-null caller-owned FSM updated when sleep aborts or returns.
 * @param[in,out] axes Non-null caller-owned axes refreshed before entering sleep.
 * @param axes_cfg Non-null axes policy borrowed for the call.
 * @param now_ms Current monotonic uptime in milliseconds.
 * @retval true when this tick services an outstanding shutdown, even if sleep aborts.
 * @retval false when there is no pending shutdown.
 *
 * @note Context: App task. Blocking: may suspend the task in light sleep until a wake source fires, including
 * the
 * timer for the requested duration in seconds. Deep sleep resumes execution through startup.
 */
bool app_sleep_poll(ivts_fsm_t *fsm, ivts_axes_t *axes, const ivts_axes_cfg_t *axes_cfg, uint64_t now_ms);

/**
 * @brief Drive the LED pattern for the current app state.
 *
 * @param state Current FSM state. An out-of-range value selects LED off.
 * @param tracking_enabled Determines the LED level in DRIVING.
 * @param now_ms Monotonic uptime in milliseconds used as the pattern phase reference.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_led_pattern_tick(ivts_fsm_state_t state, bool tracking_enabled, uint64_t now_ms);
