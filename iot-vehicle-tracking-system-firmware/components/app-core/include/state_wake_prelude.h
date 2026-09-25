#pragma once

#include <stdbool.h>

/**
 * @file state_wake_prelude.h
 * @brief Wake/bootstrap/network/telemetry helpers for the tracker FSM.
 * This header belongs to the app-core orchestration layer and defines the orchestration boundary that bootstrap code and adapters rely on during runtime.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Report whether GNSS is ready to be polled this loop.
 *
 * Gating combines three conditions: GNSS power was started, the modem AT
 * channel is ready, and the modem GNSS query subsystem reports it can serve a
 * location request. Used by the telemetry refresh to avoid hammering the modem.
 *
 * @return true when a GNSS location query may be issued safely.
 */
bool state_machine_can_poll_gnss(void);
/**
 * @brief Power GNSS on without blocking the FSM loop.
 *
 * No-op when GNSS is already started or the modem AT channel is not ready yet.
 * A cooldown gate prevents rapid power-on retries from thrashing the GNSS rail.
 */
void state_machine_try_start_gnss_nonblocking(void);
/**
 * @brief Bring up the external RTC once, with retry gating.
 *
 * Idempotent: returns early once bootstrap succeeded or when the RTC chip is
 * absent. Seeds a fallback time (GNSS timestamp when trusted, otherwise a fixed
 * epoch baseline) so downstream timestamping always has a sane starting clock.
 */
void state_machine_bootstrap_rtc(void);
/**
 * @brief Bring up the IMU once and arm its motion interrupt, with retry gating.
 *
 * Idempotent and non-blocking; failures feed the IMU bootstrap retry rail.
 * Configuring the motion interrupt here lets later sleep states rely on a ready
 * wake source without redoing setup.
 */
void state_machine_bootstrap_imu(void);
/**
 * @brief Refresh the shared telemetry snapshot from ADC, OBD, and GNSS.
 *
 * @param read_gnss True to poll GNSS when the modem/GNSS path is ready.
 * @param read_obd True to poll OBD when a BLE session is connected.
 */
void state_machine_refresh_telemetry(bool read_gnss, bool read_obd);
/**
 * @brief Select the authoritative event timestamp source for publishing.
 *
 * Priority is trusted GNSS time, then trusted RTC time, then local uptime as an
 * untrusted fallback. Trusted GNSS time is periodically written back into the
 * RTC so future deep-sleep boots recover a trusted clock sooner.
 */
void state_machine_update_time_source(void);
/**
 * @brief Run one full wake-prelude service pass for the FSM loop.
 *
 * Drives pending commands, BLE connect completion, modem/LTE/MQTT/GNSS bring-up,
 * RTC/IMU bootstrap, telemetry refresh, and optional offline replay.
 *
 * @param allow_replay True to let the offline queue drain during this pass.
 */
void state_machine_run_wake_prelude(bool allow_replay);
