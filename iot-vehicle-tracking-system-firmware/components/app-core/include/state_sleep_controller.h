#pragma once

#include "app_state.h"

/**
 * @file state_sleep_controller.h
 * @brief Sleep decision and entry helpers for the tracker FSM.
 * This header belongs to the app-core orchestration layer and defines the orchestration boundary that bootstrap code and adapters rely on during runtime.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Resolve which sleep mode applies to the given FSM state.
 *
 * Returns NONE for any non-sleep state; otherwise selects FAKE, LIGHT, or DEEP
 * based on build-time policy (fake sleep, field-validation keep-awake, warm
 * modem/GNSS) and motion-wake capability of the IMU pin.
 *
 * @param app_state Current FSM state.
 * @return Resolved runtime sleep mode for this state.
 */
tracker_sleep_mode_t state_machine_resolve_sleep_mode(app_state_t app_state);
/**
 * @brief Check whether the device is currently allowed to sleep.
 *
 * Blocks sleep while field validation pins the device awake, sleep policy is
 * disabled, OTA is in progress or awaiting confirm, ignition is on (or stably
 * on), or a BLE connect is in flight.
 *
 * @param out_reason Optional destination for a human-readable blocker string.
 * @return true when the configured sleep flow may proceed.
 */
bool state_machine_can_enter_sleep(const char **out_reason);
/**
 * @brief Tear down active subsystems and snapshot state before sleeping.
 *
 * Single pre-sleep teardown path: disconnects BLE/OBD, either parks the modem
 * in low power (warm GNSS) or fully powers down LTE/GNSS/modem, then captures
 * the last known runtime context into RTC-retained memory.
 */
void state_machine_shutdown_for_sleep(void);
/**
 * @brief Emulate parked sleep with a timed busy-wait (bench/debug builds).
 *
 * @return Next FSM state after the fake-sleep interval elapses.
 */
app_state_t state_machine_enter_fake_sleep(void);
/**
 * @brief Enter light sleep and map the wake cause back to an FSM state.
 *
 * @return Next FSM state after the light-sleep wake event.
 */
app_state_t state_machine_enter_light_sleep(void);
/**
 * @brief Arm deep-sleep wake sources for the parked wake interval.
 *
 * Enables the heartbeat timer and, when the IMU pin is RTC-capable, ext0 motion
 * wake. Must be called immediately before `esp_deep_sleep_start()`.
 */
void state_machine_prepare_deep_sleep_wakeup(void);
/**
 * @brief Enter the sleep mode selected by current build/runtime policy.
 *
 * @return Next FSM state after wake, or `APP_STATE_SLEEP` if deep sleep never
 *         returns (the next boot reconstructs state from the wake cause).
 */
app_state_t state_machine_enter_configured_sleep(void);
