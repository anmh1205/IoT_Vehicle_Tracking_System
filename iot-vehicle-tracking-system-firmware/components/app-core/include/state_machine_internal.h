#pragma once

#include <stddef.h>
#include <stdint.h>

#include "state_runtime_context.h"

/**
 * @file state_machine_internal.h
 * @brief Shared internal helpers used across split FSM domain modules.
 * This header belongs to the app-core orchestration layer and defines the orchestration boundary that bootstrap code and adapters rely on during runtime.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


#define STATE_MACHINE_TAG "STATE_MACHINE"

/** @brief Return active-drive publish interval in milliseconds. */
uint64_t state_machine_tracking_interval_ms(void);
/** @brief Return alarm-mode publish interval in milliseconds. */
uint64_t state_machine_alarm_interval_ms(void);
/** @brief Return maximum alarm runtime in milliseconds. */
uint64_t state_machine_alarm_timeout_ms(void);
/** @brief Indicate whether raw telemetry publishing should currently slow down. */
bool state_machine_should_throttle_rawdata(void);
/** @brief Return ignition-off hold duration before transitioning toward sleep. */
uint64_t state_machine_ignition_off_hold_ms(void);
/** @brief Return parked heartbeat cadence clamped to the firmware safety cap. */
uint16_t state_machine_parked_wake_interval_s(void);
/** @brief Indicate whether runtime IMU-assisted wake logic is enabled. */
bool state_machine_imu_runtime_enabled(void);
/** @brief Report whether the latest OBD sample is still fresh enough for decisions. */
bool state_machine_has_recent_obd_sample(uint64_t now_ms, uint32_t max_age_ms);
/** @brief Report whether recent OBD engine-on evidence is still fresh enough for decisions. */
bool state_machine_has_recent_obd_engine_on_evidence(uint64_t now_ms);
/** @brief Report whether OBD activity is still recent enough to keep the tracker awake. */
/** @brief Recompute telemetry state axes after state or sensor updates. */
void state_machine_sync_runtime_axes(app_state_t app_state);
/** @brief Check whether heartbeat/status publishes may proceed on current network state. */
bool state_machine_network_ready_for_heartbeat_publish(void);
/** @brief Check whether OTA may start without violating runtime safety policy. */
bool state_machine_ota_start_is_safe(void);
/** @brief Reserve and return the next monotonically increasing metadata sequence number. */
uint32_t state_machine_next_seq_no(void);
/** @brief Fill a printable message identifier buffer for payload metadata. */
void state_machine_fill_message_id(char *out, size_t out_size);
/** @brief Refresh boot/session metadata derived from RTC-retained state. */
void state_machine_init_boot_metadata(void);
/** @brief Return true while a correlated command ACK is waiting for MQTT delivery. */
bool state_machine_has_pending_command_acks(void);
/** @brief Queue the final execution result for a correlated cloud command. */
bool state_machine_queue_command_execution_ack(uint64_t command_id, esp_err_t result);
/** @brief Apply cloud-assigned canonical session mapping to the active local session. */
esp_err_t state_machine_apply_session_assignment(uint32_t local_session_key,
                                                 uint64_t canonical_session_id,
                                                 const char *session_boot_id);
/** @brief Force the user LED on regardless of the normal state pattern. */
void state_machine_force_user_led_on(void);
/** @brief Force the user LED off regardless of the normal state pattern. */
void state_machine_force_user_led_off(void);
/** @brief Release any forced LED state and resume the normal state pattern. */
void state_machine_resume_user_led_pattern(void);
