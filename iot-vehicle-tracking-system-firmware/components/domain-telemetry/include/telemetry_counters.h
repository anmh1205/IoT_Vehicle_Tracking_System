#pragma once

#include <stdint.h>

/**
 * @file telemetry_counters.h
 * @brief Lightweight runtime counters for SD queue/replay diagnostics.
 * This header belongs to the telemetry domain layer and defines the diagnostics boundary that other components use without duplicating counter semantics.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


typedef struct {
    /** Successful SD append + metadata sync operations. */
    uint32_t sd_write_ok;
    /** Failed SD append or metadata write attempts. */
    uint32_t sd_write_fail;
    /** Failed fsync operations after SD writes. */
    uint32_t sd_fsync_fail;
    /** Replay records accepted by the transport or auto-advanced. */
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
    /** Live MQTT publishes accepted by the modem path. */
    uint32_t mqtt_publish_ok;
    /** Live MQTT publish attempts that failed. */
    uint32_t mqtt_publish_fail;
    /** Publish attempts routed through offline queue fallback. */
    uint32_t mqtt_publish_fallback;
    /** LTE hardware/software recovery attempts started. */
    uint32_t lte_recovery_start;
    /** LTE recovery attempts that reached connected state. */
    uint32_t lte_recovery_success;
    /** LTE recovery attempts that fell back after reset/startup failure. */
    uint32_t lte_recovery_fail;
    /** OBD transactions that returned valid decoded payloads. */
    uint32_t obd_read_ok;
    /** OBD transactions that timed out. */
    uint32_t obd_timeout;
    /** OBD transactions that returned invalid/error payloads. */
    uint32_t obd_invalid_response;
    /** OTA HTTP downloads started. */
    uint32_t ota_http_start;
    /** OTA HTTP downloads accepted with HTTP 200. */
    uint32_t ota_http_success;
    /** OTA HTTP downloads failed before payload streaming. */
    uint32_t ota_http_fail;
    /** GNSS primary CGNSINF query attempts that returned a valid fix. */
    uint32_t gnss_cgnsinf_fix_ok;
    /** GNSS primary CGNSINF query attempts that failed (transport or parse). */
    uint32_t gnss_cgnsinf_fail;
    /** GNSS fallback CGPSINFO query attempts that returned a valid fix. */
    uint32_t gnss_cgpsinfo_fix_ok;
    /** GNSS fallback CGPSINFO query attempts that returned no fix or failed. */
    uint32_t gnss_cgpsinfo_fail;
    /** GNSS no-fix recovery attempts (power off + power on cycle). */
    uint32_t gnss_no_fix_recover;
    /** GNSS self-heal attempts (faster recovery using mode switch). */
    uint32_t gnss_self_heal;
    /** Times the firmware switched from CGNSINF primary to CGPSINFO fallback. */
    uint32_t gnss_query_mode_switched;
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
/** @brief Increment MQTT disconnected counter. */
/** @brief Increment successful live MQTT publish counter. */
void telemetry_counters_inc_mqtt_publish_ok(void);
/** @brief Increment failed live MQTT publish counter. */
void telemetry_counters_inc_mqtt_publish_fail(void);
/** @brief Increment MQTT offline fallback counter. */
void telemetry_counters_inc_mqtt_publish_fallback(void);
/** @brief Increment LTE recovery-start counter. */
void telemetry_counters_inc_lte_recovery_start(void);
/** @brief Increment LTE recovery-success counter. */
void telemetry_counters_inc_lte_recovery_success(void);
/** @brief Increment LTE recovery-fail counter. */
void telemetry_counters_inc_lte_recovery_fail(void);
/** @brief Increment successful OBD read counter. */
void telemetry_counters_inc_obd_read_ok(void);
/** @brief Increment OBD timeout counter. */
void telemetry_counters_inc_obd_timeout(void);
/** @brief Increment invalid OBD response counter. */
void telemetry_counters_inc_obd_invalid_response(void);
/** @brief Increment OTA HTTP start counter. */
void telemetry_counters_inc_ota_http_start(void);
/** @brief Increment OTA HTTP success counter. */
void telemetry_counters_inc_ota_http_success(void);
/** @brief Increment OTA HTTP failure counter. */
void telemetry_counters_inc_ota_http_fail(void);
/** @brief Increment GNSS CGNSINF (primary) success counter. */
void telemetry_counters_inc_gnss_cgnsinf_fix_ok(void);
/** @brief Increment GNSS CGNSINF (primary) failure counter. */
void telemetry_counters_inc_gnss_cgnsinf_fail(void);
/** @brief Increment GNSS CGPSINFO (fallback) success counter. */
void telemetry_counters_inc_gnss_cgpsinfo_fix_ok(void);
/** @brief Increment GNSS CGPSINFO (fallback) failure counter. */
void telemetry_counters_inc_gnss_cgpsinfo_fail(void);
/** @brief Increment GNSS no-fix recovery counter. */
void telemetry_counters_inc_gnss_no_fix_recover(void);
/** @brief Increment GNSS self-heal counter. */
void telemetry_counters_inc_gnss_self_heal(void);
/** @brief Increment GNSS query mode switch counter. */
void telemetry_counters_inc_gnss_query_mode_switched(void);

/**
 * @brief Return a copy of the current counters snapshot.
 *
 * @return Current counter values collected since the last reset.
 */
telemetry_counters_t telemetry_counters_get(void);
