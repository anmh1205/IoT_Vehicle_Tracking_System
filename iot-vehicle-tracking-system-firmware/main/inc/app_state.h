#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

#include "app_config.h"
#include "modem_gnss.h"

/**
 * @file app_state.h
 * @brief Global state types and state-machine public API.
 */

/**
 * @brief Main runtime states of the tracker finite-state machine.
 */
typedef enum {
    /** Boot-time initialization. */
    APP_STATE_INIT = 0,
    /** Decide ignition state and first transition. */
    APP_STATE_CHECK_IGN,
    /** Vehicle is moving, high-frequency telemetry enabled. */
    APP_STATE_DRIVING,
    /** Vehicle is stopped, waiting for sleep transition. */
    APP_STATE_PARKED,
    /** Motion alarm mode after wake on IMU interrupt. */
    APP_STATE_ALARM,
    /** Periodic timer wakeup mode for heartbeat/telemetry. */
    APP_STATE_HEARTBEAT,
    /** Deep-sleep preparation and entry. */
    APP_STATE_SLEEP,
} app_state_t;

/**
 * @brief Persistent RTC context retained across deep-sleep resets.
 */
typedef struct {
    /** Last state before entering deep sleep. */
    app_state_t last_state;
    /** Number of boots since power cycle. */
    uint32_t boot_count;
    /** Last heartbeat UNIX-like uptime timestamp (seconds). */
    uint32_t last_heartbeat_ts;
    /** Last known BLE adapter MAC address. */
    uint8_t ble_mac[6];
    /** Ignition state seen before sleeping. */
    bool ign_last_known;
    /** Battery voltage captured before sleeping. */
    float last_battery_v;
    /** Set after OTA reboot until new image confirms itself. */
    bool ota_pending_confirm;
    /** OTA confirm timeout copied from command payload. */
    uint32_t ota_confirm_timeout_sec;
    /** OTA job currently being confirmed. */
    char ota_job_id[TRACKER_JOB_ID_MAX_LEN];
    /** Target version requested by pending OTA job. */
    char ota_target_version[TRACKER_TARGET_VERSION_MAX_LEN];
    /** Version running before OTA update, used for rollback reporting. */
    char ota_previous_version[TRACKER_TARGET_VERSION_MAX_LEN];
    /** Partition label of downloaded image. */
    char ota_partition[TRACKER_PARTITION_MAX_LEN];
} rtc_context_t;

/**
 * @brief Aggregated telemetry snapshot used for payload formatting.
 */
typedef struct {
    /** GNSS sensor fields. */
    gnss_data_t gnss;
    /** Primary battery voltage. */
    float battery_top;
    /** Backup battery voltage placeholder. */
    float battery_bot;
    /** Composite vibration score (0..1000). */
    uint16_t vibration;
    /** Derived ignition state. */
    bool ignition;
    /** Generic error code for telemetry stream. */
    int error_code;
    /** Engine RPM from OBD PID 0x0C. */
    int32_t obd_rpm;
    /** Vehicle speed from OBD PID 0x0D. */
    int32_t obd_speed;
    /** Coolant temperature from OBD PID 0x05. */
    int32_t obd_coolant_temp;
    /** Fuel level percentage from OBD PID 0x2F. */
    int32_t obd_fuel_level;
    /** Engine load percentage from OBD PID 0x04. */
    int32_t obd_engine_load;
} telemetry_t;

/** @brief Global RTC-retained context instance. */
extern rtc_context_t g_rtc_context;

/**
 * @brief Initialize all modules needed by the runtime state machine.
 *
 * @param config Runtime configuration pointer.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t state_machine_init(const config_t *config);

/**
 * @brief Execute one state-machine iteration and return next state.
 *
 * @param current_state Current FSM state.
 *
 * @return Next FSM state.
 */
app_state_t state_machine_run(app_state_t current_state);

/**
 * @brief Return latest telemetry snapshot.
 *
 * @return Copy of current telemetry structure.
 */
telemetry_t state_machine_get_telemetry(void);
