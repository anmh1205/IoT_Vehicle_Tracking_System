#include "telemetry_counters.h"

#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/portmacro.h"

/**
 * @file telemetry_counters.c
 * @brief In-memory counters for storage/replay/MQTT diagnostics.
 */

static telemetry_counters_t s_counters;
static portMUX_TYPE s_counters_mux = portMUX_INITIALIZER_UNLOCKED;

static void telemetry_counters_inc_field(uint32_t *field) {
    portENTER_CRITICAL(&s_counters_mux);
    *field += 1U;
    portEXIT_CRITICAL(&s_counters_mux);
}

void telemetry_counters_reset(void) {
    portENTER_CRITICAL(&s_counters_mux);
    memset(&s_counters, 0, sizeof(s_counters));
    portEXIT_CRITICAL(&s_counters_mux);
}

void telemetry_counters_inc_sd_write_ok(void) {
    telemetry_counters_inc_field(&s_counters.sd_write_ok);
}

void telemetry_counters_inc_sd_write_fail(void) {
    telemetry_counters_inc_field(&s_counters.sd_write_fail);
}

void telemetry_counters_inc_sd_fsync_fail(void) {
    telemetry_counters_inc_field(&s_counters.sd_fsync_fail);
}

void telemetry_counters_inc_replay_success(void) {
    telemetry_counters_inc_field(&s_counters.replay_success);
}

void telemetry_counters_inc_replay_retry(void) {
    telemetry_counters_inc_field(&s_counters.replay_retry);
}

void telemetry_counters_inc_replay_drop(void) {
    telemetry_counters_inc_field(&s_counters.replay_drop);
}

void telemetry_counters_inc_quota_hit(void) {
    telemetry_counters_inc_field(&s_counters.quota_hit);
}

void telemetry_counters_inc_mqtt_connected(void) {
    telemetry_counters_inc_field(&s_counters.mqtt_connected);
}

void telemetry_counters_inc_mqtt_disconnected(void) {
    telemetry_counters_inc_field(&s_counters.mqtt_disconnected);
}

void telemetry_counters_inc_mqtt_publish_ok(void) {
    telemetry_counters_inc_field(&s_counters.mqtt_publish_ok);
}

void telemetry_counters_inc_mqtt_publish_fail(void) {
    telemetry_counters_inc_field(&s_counters.mqtt_publish_fail);
}

void telemetry_counters_inc_mqtt_publish_fallback(void) {
    telemetry_counters_inc_field(&s_counters.mqtt_publish_fallback);
}

void telemetry_counters_inc_lte_recovery_start(void) {
    telemetry_counters_inc_field(&s_counters.lte_recovery_start);
}

void telemetry_counters_inc_lte_recovery_success(void) {
    telemetry_counters_inc_field(&s_counters.lte_recovery_success);
}

void telemetry_counters_inc_lte_recovery_fail(void) {
    telemetry_counters_inc_field(&s_counters.lte_recovery_fail);
}

void telemetry_counters_inc_obd_read_ok(void) {
    telemetry_counters_inc_field(&s_counters.obd_read_ok);
}

void telemetry_counters_inc_obd_timeout(void) {
    telemetry_counters_inc_field(&s_counters.obd_timeout);
}

void telemetry_counters_inc_obd_invalid_response(void) {
    telemetry_counters_inc_field(&s_counters.obd_invalid_response);
}

void telemetry_counters_inc_ota_http_start(void) {
    telemetry_counters_inc_field(&s_counters.ota_http_start);
}

void telemetry_counters_inc_ota_http_success(void) {
    telemetry_counters_inc_field(&s_counters.ota_http_success);
}

void telemetry_counters_inc_ota_http_fail(void) {
    telemetry_counters_inc_field(&s_counters.ota_http_fail);
}

telemetry_counters_t telemetry_counters_get(void) {
    telemetry_counters_t snapshot;
    portENTER_CRITICAL(&s_counters_mux);
    snapshot = s_counters;
    portEXIT_CRITICAL(&s_counters_mux);
    return snapshot;
}
