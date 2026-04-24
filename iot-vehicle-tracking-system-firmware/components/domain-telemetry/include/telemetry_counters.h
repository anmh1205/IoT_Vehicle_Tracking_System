#pragma once

#include <stdint.h>

/**
 * @file telemetry_counters.h
 * @brief Lightweight runtime counters for SD queue/replay diagnostics.
 */

typedef struct {
    /** Successful SD append + metadata sync operations. */
    uint32_t sd_write_ok;
    /** Failed SD append or metadata write attempts. */
    uint32_t sd_write_fail;
    /** Failed fsync operations after SD writes. */
    uint32_t sd_fsync_fail;
    /** Replay records fully acknowledged or auto-advanced. */
    uint32_t replay_success;
    /** Replay records that had to be retried. */
    uint32_t replay_retry;
    /** Replay records discarded because the on-disk entry was corrupt/invalid. */
    uint32_t replay_drop;
    /** SD queue usage crossed the hard quota and triggered GC. */
    uint32_t quota_hit;
    /** MQTT link-up events seen by the firmware runtime. */
    uint32_t mqtt_connected;
    /** MQTT link-down events seen by the firmware runtime. */
    uint32_t mqtt_disconnected;
} telemetry_counters_t;

/** @brief Reset every runtime counter to zero. */
void telemetry_counters_reset(void);
/** @brief Increment successful SD write counter. */
void telemetry_counters_inc_sd_write_ok(void);
/** @brief Increment failed SD write counter. */
void telemetry_counters_inc_sd_write_fail(void);
/** @brief Increment failed SD fsync counter. */
void telemetry_counters_inc_sd_fsync_fail(void);
/** @brief Increment replay success counter. */
void telemetry_counters_inc_replay_success(void);
/** @brief Increment replay retry counter. */
void telemetry_counters_inc_replay_retry(void);
/** @brief Increment replay drop counter. */
void telemetry_counters_inc_replay_drop(void);
/** @brief Increment quota-hit counter. */
void telemetry_counters_inc_quota_hit(void);
/** @brief Increment MQTT connected counter. */
void telemetry_counters_inc_mqtt_connected(void);
/** @brief Increment MQTT disconnected counter. */
void telemetry_counters_inc_mqtt_disconnected(void);

/**
 * @brief Return a copy of the current counters snapshot.
 *
 * @return Current counter values collected since the last reset.
 */
telemetry_counters_t telemetry_counters_get(void);
