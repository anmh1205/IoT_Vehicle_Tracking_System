#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "fsm_types.h"
#include "runtime_config.h"

/**
 * @file rtc_context.h
 * @brief RTC-retained runtime continuity model.
 */

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
    /** Absolute UTC deadline for OTA confirm when trusted time is available. */
    uint64_t ota_confirm_deadline_ms;
    /** OTA job currently being confirmed. */
    char ota_job_id[TRACKER_JOB_ID_MAX_LEN];
    /** Target version requested by pending OTA job. */
    char ota_target_version[TRACKER_TARGET_VERSION_MAX_LEN];
    /** Version running before OTA update, used for rollback reporting. */
    char ota_previous_version[TRACKER_TARGET_VERSION_MAX_LEN];
    /** Partition label of downloaded image. */
    char ota_partition[TRACKER_PARTITION_MAX_LEN];
} rtc_context_t;
