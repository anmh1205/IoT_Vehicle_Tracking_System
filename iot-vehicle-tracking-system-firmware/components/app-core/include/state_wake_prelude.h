#pragma once

#include <stdbool.h>

/**
 * @file state_wake_prelude.h
 * @brief Wake/bootstrap/network/telemetry helpers for the tracker FSM.
 * This header belongs to the app-core orchestration layer and defines the orchestration boundary that bootstrap code and adapters rely on during runtime.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


bool state_machine_can_poll_gnss(void);
void state_machine_try_start_gnss_nonblocking(void);
void state_machine_bootstrap_rtc(void);
void state_machine_bootstrap_imu(void);
void state_machine_refresh_telemetry(bool read_gnss, bool read_obd);
void state_machine_update_time_source(void);
void state_machine_run_wake_prelude(bool allow_replay);
