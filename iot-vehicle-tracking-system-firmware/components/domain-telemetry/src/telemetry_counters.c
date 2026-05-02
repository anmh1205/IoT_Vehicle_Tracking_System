#include "telemetry_counters.h"

#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/portmacro.h"

/**
 * @file telemetry_counters.c
 * @brief In-memory counters for storage/replay/MQTT diagnostics.
 *
 * ## Telemetry Counters Flow
 *
 * ### Purpose
 *    - Runtime metrics for remote diagnostics
 *    - Track publish/replay success/failure
 *    - Monitor queue depth and replay rates
 *    - Expose via health snapshot
 *
 * ### Counter Categories
 *    - MQTT: publish_attempts, publish_success, publish_fail
 *    - Offline Queue: enqueue_total, replay_success, replay_fail
 *    - OBD: query_success, query_fail, connect_fail
 *    - LTE: connect_attempts, connect_success, connect_fail
 *
 * ### Thread Safety
 *    - Uses FreeRTOS portENTER_CRITICAL
 *    - Atomic increment operations
 *    - Safe from ISR and task context
 *
 * ### Access Pattern
 *    - Increment on events (success/failure paths)
 *    - Reset on config change or command
 *    - Read via telemetry_counters_get()
 *    - Exposed in health snapshot JSON
 *
 * ## Key Counters
 *    - publish_fail due to MQTT disconnect -> indicates network issues
 *    - replay_fail after successful connect -> indicates payload issues
 *    - connect_fail count -> BLE OBD reliability
 */

/* Telemetry counters instance for runtime diagnostics. */
static telemetry_counters_t s_counters;
/* Spinlock for thread-safe counter updates. */
static portMUX_TYPE s_counters_mux = portMUX_INITIALIZER_UNLOCKED;

static void telemetry_counters_inc_field(uint32_t *field) {
    portENTER_CRITICAL(&s_counters_mux);
    *field += 1U;
    portEXIT_CRITICAL(&s_counters_mux);
}

/**
 * @file telemetry_counters.c
 * @brief Runtime telemetry metrics for diagnostics.
 */

/**
 * @brief Reset all counters to zero.
 */
void telemetry_counters_reset(void) {
    portENTER_CRITICAL(&s_counters_mux);
    memset(&s_counters, 0, sizeof(s_counters));
    portEXIT_CRITICAL(&s_counters_mux);
}

/**
 * @brief Increment SD write OK counter.
 */
void telemetry_counters_inc_sd_write_ok(void) {
    telemetry_counters_inc_field(&s_counters.sd_write_ok);
}

/**
 * @brief Increment SD write fail counter.
 */
void telemetry_counters_inc_sd_write_fail(void) {
    telemetry_counters_inc_field(&s_counters.sd_write_fail);
}

/**
 * @brief Increment SD fsync fail counter.
 */
void telemetry_counters_inc_sd_fsync_fail(void) {
    telemetry_counters_inc_field(&s_counters.sd_fsync_fail);
}

/**
 * @brief Increment replay success counter.
 */
void telemetry_counters_inc_replay_success(void) {
    telemetry_counters_inc_field(&s_counters.replay_success);
}

/**
 * @brief Increment replay retry counter.
 */
void telemetry_counters_inc_replay_retry(void) {
    telemetry_counters_inc_field(&s_counters.replay_retry);
}

/**
 * @brief Increment replay drop counter.
 */
void telemetry_counters_inc_replay_drop(void) {
    telemetry_counters_inc_field(&s_counters.replay_drop);
}

/**
 * @brief Increment quota hit counter.
 */
void telemetry_counters_inc_quota_hit(void) {
    telemetry_counters_inc_field(&s_counters.quota_hit);
}

/**
 * @brief Increment MQTT connected counter.
 */
void telemetry_counters_inc_mqtt_connected(void) {
    telemetry_counters_inc_field(&s_counters.mqtt_connected);
}

/**
 * @brief Increment MQTT disconnected counter.
 */
void telemetry_counters_inc_mqtt_disconnected(void) {
    telemetry_counters_inc_field(&s_counters.mqtt_disconnected);
}

/**
 * @brief Increment MQTT publish OK counter.
 */
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
