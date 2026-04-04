#pragma once

#include <stdint.h>

/**
 * @file telemetry_counters.h
 * @brief Lightweight runtime counters for SD queue/replay diagnostics.
 */

typedef struct {
    uint32_t sd_write_ok;
    uint32_t sd_write_fail;
    uint32_t sd_fsync_fail;
    uint32_t replay_success;
    uint32_t replay_retry;
    uint32_t replay_drop;
    uint32_t quota_hit;
    uint32_t mqtt_connected;
    uint32_t mqtt_disconnected;
} telemetry_counters_t;

void telemetry_counters_reset(void);
void telemetry_counters_inc_sd_write_ok(void);
void telemetry_counters_inc_sd_write_fail(void);
void telemetry_counters_inc_sd_fsync_fail(void);
void telemetry_counters_inc_replay_success(void);
void telemetry_counters_inc_replay_retry(void);
void telemetry_counters_inc_replay_drop(void);
void telemetry_counters_inc_quota_hit(void);
void telemetry_counters_inc_mqtt_connected(void);
void telemetry_counters_inc_mqtt_disconnected(void);
telemetry_counters_t telemetry_counters_get(void);
