#include "telemetry_counters.h"

#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/portmacro.h"

/**
 * @file telemetry_counters.c
 * @brief In-memory counters for storage/replay/MQTT/OBD/LTE diagnostics.
 *
 * Thread safety: portENTER_CRITICAL spinlock protects all increments.
 * Access pattern: increment on events, reset on command, read via _get().
 */

static telemetry_counters_t s_counters;
static portMUX_TYPE s_counters_mux = portMUX_INITIALIZER_UNLOCKED;

/**
 * @brief Atomically increment a single counter field.
 *
 * Counters are touched from multiple tasks/ISRs, so each increment runs inside a
 * short spinlock critical section to keep the read-modify-write indivisible.
 *
 * @param[in,out] field Pointer to the counter field inside @ref s_counters.
 */
static void telemetry_counters_inc_field(uint32_t *field) {
    portENTER_CRITICAL(&s_counters_mux); // Lock out concurrent writers for the increment.
    *field += 1U;                        // Indivisible read-modify-write of the counter.
    portEXIT_CRITICAL(&s_counters_mux);  // Release the spinlock as fast as possible.
}

void telemetry_counters_reset(void) {
    // Zero every counter as one atomic block so a snapshot can never observe a half-reset structure.
    portENTER_CRITICAL(&s_counters_mux);
    memset(&s_counters, 0, sizeof(s_counters));
    portEXIT_CRITICAL(&s_counters_mux);
}

/*
 * X-macro expansion: each COUNTER_FUNC(name) emits a public
 * telemetry_counters_inc_<name>() that forwards to the shared atomic helper.
 * This keeps every increment routine identical and avoids hand-copied boilerplate.
 */
#define COUNTER_FUNC(name) \
void telemetry_counters_inc_##name(void) { \
    telemetry_counters_inc_field(&s_counters.name); \
}

COUNTER_FUNC(sd_write_ok)
COUNTER_FUNC(sd_write_fail)
COUNTER_FUNC(sd_fsync_fail)
COUNTER_FUNC(replay_success)
COUNTER_FUNC(replay_retry)
COUNTER_FUNC(replay_drop)
COUNTER_FUNC(quota_hit)
COUNTER_FUNC(mqtt_publish_ok)
COUNTER_FUNC(mqtt_publish_fail)
COUNTER_FUNC(mqtt_publish_fallback)
COUNTER_FUNC(lte_recovery_start)
COUNTER_FUNC(lte_recovery_success)
COUNTER_FUNC(lte_recovery_fail)
COUNTER_FUNC(obd_read_ok)
COUNTER_FUNC(obd_timeout)
COUNTER_FUNC(obd_invalid_response)
COUNTER_FUNC(ota_http_start)
COUNTER_FUNC(ota_http_success)
COUNTER_FUNC(ota_http_fail)
COUNTER_FUNC(gnss_cgnsinf_fix_ok)
COUNTER_FUNC(gnss_cgnsinf_fail)
COUNTER_FUNC(gnss_cgpsinfo_fix_ok)
COUNTER_FUNC(gnss_cgpsinfo_fail)
COUNTER_FUNC(gnss_no_fix_recover)
COUNTER_FUNC(gnss_self_heal)
COUNTER_FUNC(gnss_query_mode_switched)

#undef COUNTER_FUNC

telemetry_counters_t telemetry_counters_get(void) {
    // Copy under the spinlock so the returned snapshot is internally consistent across all fields.
    telemetry_counters_t snapshot;
    portENTER_CRITICAL(&s_counters_mux);
    snapshot = s_counters; // Structure copy of the live counters.
    portEXIT_CRITICAL(&s_counters_mux);
    return snapshot;
}
