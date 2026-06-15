#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "state_runtime_context.h"

/**
 * @file state_obd_runtime.h
 * @brief OBD decoding and BLE OBD session helpers for the tracker FSM.
 * This header belongs to the app-core orchestration layer and defines the orchestration boundary that bootstrap code and adapters rely on during runtime.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Expose the fixed diagnostic query rotation used by the FSM.
 *
 * @param out_count Optional destination for the number of queries.
 * @return Pointer to the internal immutable diagnostic query table.
 */
const tracker_obd_diag_query_t *state_machine_obd_diagnostic_queries(size_t *out_count);
/**
 * @brief Decode one OBD response into the shared telemetry snapshot.
 *
 * Routes monitor-status and DTC payloads to their dedicated structures; only
 * scalar live PIDs (RPM, speed, coolant, fuel, load) advance the "last live
 * sample" timestamp used by ignition inference.
 *
 * @param mode OBD mode associated with the payload.
 * @param pid PID associated with the payload, or negative for mode-only calls.
 * @param data Raw payload bytes.
 * @param len Number of bytes in @p data.
 * @param usr_ctx Unused caller context.
 */
void state_machine_obd_response_cb(uint8_t mode, int pid, const uint8_t *data, size_t len, void *usr_ctx);
/**
 * @brief Roll the OBD connect-failure counting window forward when it expires.
 *
 * @param now_ms Current uptime in milliseconds.
 */
void state_machine_obd_refresh_fail_window(uint64_t now_ms);
/**
 * @brief Zero all cached OBD signal/diagnostic fields.
 *
 * Prevents a disconnected or stale adapter from republishing the last known PID
 * values once freshness can no longer be proven.
 */
void state_machine_clear_obd_signal_snapshot(void);
/**
 * @brief Single exit path applied on any BLE/OBD disconnect or failure.
 *
 * Clears ELM-ready state, the signal snapshot, poll cursors, and marks the ECU
 * state label disconnected so every caller leaves identical clean state.
 */
void state_machine_mark_obd_disconnected(void);
/**
 * @brief Issue one diagnostic query (mode or mode+PID) over a BLE OBD session.
 *
 * @param ctx Connected BLE OBD context.
 * @param query Query descriptor containing mode and optional PID.
 */
void state_machine_run_obd_diagnostic_query(ble_obd_ctx_t *ctx, const tracker_obd_diag_query_t *query);
/**
 * @brief Drain and apply any completed async BLE connect result.
 *
 * Adopts a successful context atomically (dropping stale handles), or converges
 * failures through disconnect + retry scheduling.
 *
 * @return true when at least one result item was consumed.
 */
bool state_machine_handle_ble_connect_result(void);
/**
 * @brief Start an asynchronous BLE OBD connect attempt when policy allows.
 *
 * Enforces OTA exclusion, retry cadence, and preferred-MAC selection, then
 * launches a worker task so the main FSM loop never blocks on BLE discovery.
 */
void state_machine_try_connect_ble(void);
