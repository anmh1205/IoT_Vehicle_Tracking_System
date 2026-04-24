#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "state_runtime_context.h"

/**
 * @file state_obd_runtime.h
 * @brief OBD decoding and BLE OBD session helpers for the tracker FSM.
 */

void state_machine_obd_response_cb(uint8_t mode, int pid, const uint8_t *data, size_t len, void *usr_ctx);
void state_machine_obd_refresh_fail_window(uint64_t now_ms);
void state_machine_run_obd_diagnostic_query(ble_obd_ctx_t *ctx, const tracker_obd_diag_query_t *query);
bool state_machine_handle_ble_connect_result(void);
void state_machine_try_connect_ble(void);
