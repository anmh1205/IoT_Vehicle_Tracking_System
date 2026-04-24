#pragma once

#include <stddef.h>
#include <stdint.h>

#include "command_handler.h"
#include "state_runtime_context.h"

/**
 * @file state_machine_internal.h
 * @brief Shared internal helpers used across split FSM domain modules.
 */

#define STATE_MACHINE_TAG "STATE_MACHINE"

uint64_t state_machine_tracking_interval_ms(void);
uint64_t state_machine_alarm_interval_ms(void);
uint64_t state_machine_alarm_timeout_ms(void);
bool state_machine_should_throttle_rawdata(void);
uint64_t state_machine_ignition_off_hold_ms(void);
uint16_t state_machine_parked_wake_interval_s(void);
bool state_machine_imu_runtime_enabled(void);
bool state_machine_has_recent_obd_sample(uint64_t now_ms, uint32_t max_age_ms);
void state_machine_sync_runtime_axes(app_state_t app_state);
bool state_machine_network_ready_for_heartbeat_publish(void);
bool state_machine_ota_start_is_safe(void);
uint32_t state_machine_next_seq_no(void);
void state_machine_fill_message_id(char *out, size_t out_size);
void state_machine_init_boot_metadata(void);
