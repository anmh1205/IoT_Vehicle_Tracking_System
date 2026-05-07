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


const tracker_obd_diag_query_t *state_machine_obd_diagnostic_queries(size_t *out_count);
void state_machine_obd_response_cb(uint8_t mode, int pid, const uint8_t *data, size_t len, void *usr_ctx);
void state_machine_obd_refresh_fail_window(uint64_t now_ms);
void state_machine_clear_obd_signal_snapshot(void);
void state_machine_mark_obd_disconnected(void);
void state_machine_run_obd_diagnostic_query(ble_obd_ctx_t *ctx, const tracker_obd_diag_query_t *query);
bool state_machine_handle_ble_connect_result(void);
void state_machine_try_connect_ble(void);
