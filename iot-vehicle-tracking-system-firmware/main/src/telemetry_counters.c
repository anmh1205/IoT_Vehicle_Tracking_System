#include "telemetry_counters.h"

#include <string.h>

static telemetry_counters_t s_counters;

void telemetry_counters_reset(void) {
    memset(&s_counters, 0, sizeof(s_counters));
}

void telemetry_counters_inc_sd_write_ok(void) {
    s_counters.sd_write_ok++;
}

void telemetry_counters_inc_sd_write_fail(void) {
    s_counters.sd_write_fail++;
}

void telemetry_counters_inc_sd_fsync_fail(void) {
    s_counters.sd_fsync_fail++;
}

void telemetry_counters_inc_replay_success(void) {
    s_counters.replay_success++;
}

void telemetry_counters_inc_replay_retry(void) {
    s_counters.replay_retry++;
}

void telemetry_counters_inc_replay_drop(void) {
    s_counters.replay_drop++;
}

void telemetry_counters_inc_quota_hit(void) {
    s_counters.quota_hit++;
}

void telemetry_counters_inc_mqtt_connected(void) {
    s_counters.mqtt_connected++;
}

void telemetry_counters_inc_mqtt_disconnected(void) {
    s_counters.mqtt_disconnected++;
}

telemetry_counters_t telemetry_counters_get(void) {
    return s_counters;
}
