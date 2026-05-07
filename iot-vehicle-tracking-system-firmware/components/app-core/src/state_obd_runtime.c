#include "state_obd_runtime.h"

#include <stdlib.h>
#include <string.h>

#include "freertos/task.h"

#include "esp_log.h"

#include "ble_util.h"
#include "obd.h"
#include "state_machine_internal.h"
#include "state_publish_pipeline.h"
#include "util.h"

/**
 * @file state_obd_runtime.c
 * @brief OBD decoding and BLE OBD session orchestration for the tracker FSM.
 * This translation unit belongs to the app-core orchestration layer and keeps FSM transitions, retained runtime state, and orchestration policy centralized inside app-core.
 */

// File-local constants, retained state, and helper wiring stay private here so
// higher layers interact with this module through its exported contract.


static const char *TAG = STATE_MACHINE_TAG;
/* Flag to prevent repeated BLE skip warnings in field validation mode. */
static bool s_field_validation_ble_skip_logged = false;

/* Diagnostic query sequence for OBD DTC modes. */
static const tracker_obd_diag_query_t s_state_obd_diag_queries[] = {
    {.mode = OBD_MODE_CURRENT_DATA, .pid = OBD_PID_MONITOR_STATUS},
    {.mode = OBD_MODE_STORED_DTC, .pid = -1},
    {.mode = OBD_MODE_PENDING_DTC, .pid = -1},
    {.mode = OBD_MODE_PERMANENT_DTC, .pid = -1},
};

static bool state_machine_has_rtc_ble_mac(void) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    for (size_t i = 0; i < sizeof(g_rtc_context.ble_mac); ++i) {
        if (g_rtc_context.ble_mac[i] != 0U) {
            return true;
        }
    }
    return false;
}

static void state_machine_clear_rtc_ble_mac(void) {
    // Reset the retained adapter hint when it is proven stale so later wakes can fall back to discovery.
    memset(g_rtc_context.ble_mac, 0, sizeof(g_rtc_context.ble_mac));
}

static bool state_machine_copy_rtc_ble_mac_string(char out[TRACKER_MAC_ADDR_STR_LEN]) {
    // Translate the retained adapter bytes into a printable MAC string for BLE reconnect hints.
    if (out == NULL || !state_machine_has_rtc_ble_mac()) {
        return false;
    }

    ble_addr_t rtc_addr = {0};
    memcpy(rtc_addr.val, g_rtc_context.ble_mac, sizeof(rtc_addr.val));
    rtc_addr.type = BLE_ADDR_PUBLIC;
    return ble_addr_to_str(&rtc_addr, out) != NULL;
}

static bool state_machine_store_rtc_ble_mac_string(const char *address) {
    // Keep the last known adapter identity across sleep so parked wakes can reconnect deterministically.
    ble_addr_t parsed_addr = {0};
    if (util_string_empty(address) || !ble_addr_from_str(address, &parsed_addr)) {
        return false;
    }

    if (memcmp(g_rtc_context.ble_mac, parsed_addr.val, sizeof(parsed_addr.val)) == 0) {
        return false;
    }

    memcpy(g_rtc_context.ble_mac, parsed_addr.val, sizeof(parsed_addr.val));
    return true;
}

static bool state_machine_resolve_preferred_ble_mac(char out[TRACKER_MAC_ADDR_STR_LEN], bool *out_from_rtc) {
    // Prefer explicit config first, then reuse the last adapter discovered before sleep as a soft hint.
    if (out != NULL) {
        out[0] = '\0';
    }
    if (out_from_rtc != NULL) {
        *out_from_rtc = false;
    }

    if (!util_string_empty(s_config.obd2_ble_address)) {
        if (out != NULL) {
            util_copy_string(out, TRACKER_MAC_ADDR_STR_LEN, s_config.obd2_ble_address);
        }
        return true;
    }

    if (!state_machine_copy_rtc_ble_mac_string(out)) {
        return false;
    }

    if (out_from_rtc != NULL) {
        *out_from_rtc = true;
    }
    return true;
}

/**
 * @brief Expose the fixed diagnostic query rotation used by the FSM.
 *
 * @param[out] out_count Optional destination for the number of queries.
 * @return Pointer to the internal immutable query table.
 */
const tracker_obd_diag_query_t *state_machine_obd_diagnostic_queries(size_t *out_count) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    if (out_count != NULL) {
        *out_count = ARRAY_SIZE(s_state_obd_diag_queries);
    }
    return s_state_obd_diag_queries;
}

/**
 * @brief Reset a DTC list to a known empty state.
 *
 * @param[out] list Destination DTC list.
 * @param[in] valid Whether the empty result should be treated as authoritative.
 */
static void state_machine_reset_dtc_list(obd_dtc_list_t *list, bool valid) {
    // Reset the DTC list here so stale fault codes never leak into a later query or publish cycle.
    if (list == NULL) {
        return;
    }

    memset(list, 0, sizeof(*list));
    list->valid = valid;
}

/**
 * @brief Convert one 2-byte OBD DTC payload item into a textual code.
 *
 * @param[in] high High byte of the DTC payload.
 * @param[in] low Low byte of the DTC payload.
 * @param[out] out Output buffer with size `TRACKER_OBD_DTC_CODE_LEN`.
 * @return true when a non-zero DTC code was produced.
 */
static bool state_machine_format_dtc_code(uint8_t high, uint8_t low, char out[TRACKER_OBD_DTC_CODE_LEN]) {
    // Build the format DTC code representation here so every caller emits the same contract.
    static const char families[] = {'P', 'C', 'B', 'U'};

    if (out == NULL) {
        return false;
    }
    if (high == 0 && low == 0) {
        return false;
    }

    snprintf(out,
             TRACKER_OBD_DTC_CODE_LEN,
             "%c%1X%1X%1X%1X",
             families[(high >> 6) & 0x03],
             (high >> 4) & 0x03,
             high & 0x0F,
             (low >> 4) & 0x0F,
             low & 0x0F);
    return true;
}

/**
 * @brief Decode an OBD DTC payload into the runtime DTC list representation.
 *
 * @param[out] list Destination list to overwrite.
 * @param[in] data Raw OBD bytes.
 * @param[in] len Number of bytes available in `data`.
 */
static void state_machine_decode_dtc_payload(obd_dtc_list_t *list, const uint8_t *data, size_t len) {
    // Decode raw decode DTC payload into the normalized form the rest of the module expects.
    if (list == NULL) {
        return;
    }

    state_machine_reset_dtc_list(list, true);
    if (data == NULL || len < 2) {
        return;
    }

    for (size_t i = 0; i + 1 < len && list->count < TRACKER_OBD_MAX_DTC_CODES; i += 2) {
        char dtc_code[TRACKER_OBD_DTC_CODE_LEN] = {0};
        if (!state_machine_format_dtc_code(data[i], data[i + 1], dtc_code)) {
            if (data[i] == 0 && data[i + 1] == 0) {
                break;
            }
            continue;
        }

        util_copy_string(list->codes[list->count], TRACKER_OBD_DTC_CODE_LEN, dtc_code);
        list->count += 1U;
    }
}

/**
 * @brief Decode one readiness monitor state from supported/incomplete bitfields.
 *
 * @param[in] supported_bits Bitmask describing which monitors the ECU supports.
 * @param[in] incomplete_bits Bitmask describing which supported monitors are incomplete.
 * @param[in] bit_index Zero-based monitor bit index.
 * @return Decoded monitor status enum.
 */
static obd_monitor_status_t state_machine_decode_monitor_status(uint8_t supported_bits,
                                                                uint8_t incomplete_bits,
                                                                uint8_t bit_index) {
    // Decode raw decode monitor status into the normalized form the rest of the module expects.
    uint8_t mask = (uint8_t)(1U << bit_index);
    if ((supported_bits & mask) == 0U) {
        return OBD_MONITOR_STATUS_UNSUPPORTED;
    }

    return (incomplete_bits & mask) != 0U ? OBD_MONITOR_STATUS_INCOMPLETE
                                          : OBD_MONITOR_STATUS_COMPLETE;
}

/**
 * @brief Decode OBD readiness payload bytes into the runtime readiness snapshot.
 *
 * @param[out] readiness Destination readiness structure.
 * @param[in] data Raw mode 01 PID 01 payload bytes.
 * @param[in] len Number of bytes available in `data`.
 */
static void state_machine_decode_readiness_payload(obd_readiness_t *readiness,
                                                   const uint8_t *data,
                                                   size_t len) {
    // Decode raw decode readiness payload into the normalized form the rest of the module expects.
    if (readiness == NULL) {
        return;
    }

    memset(readiness, 0, sizeof(*readiness));
    if (data == NULL || len < 4) {
        return;
    }

    uint8_t byte_a = data[0];
    uint8_t byte_b = data[1];
    uint8_t byte_c = data[2];
    uint8_t byte_d = data[3];

    readiness->valid = true;
    readiness->mil_on = (byte_a & 0x80U) != 0U;
    readiness->reported_dtc_count = byte_a & 0x7FU;
    readiness->compression_ignition = (byte_b & 0x08U) != 0U;

    uint8_t common_supported = byte_b & 0x07U;
    uint8_t common_incomplete = (byte_b >> 4) & 0x07U;
    readiness->misfire = state_machine_decode_monitor_status(common_supported, common_incomplete, 0);
    readiness->fuel_system = state_machine_decode_monitor_status(common_supported, common_incomplete, 1);
    readiness->comprehensive_components =
        state_machine_decode_monitor_status(common_supported, common_incomplete, 2);

    if (readiness->compression_ignition) {
        readiness->nmhc_catalyst = state_machine_decode_monitor_status(byte_c, byte_d, 0);
        readiness->nox_aftertreatment = state_machine_decode_monitor_status(byte_c, byte_d, 1);
        readiness->boost_pressure = state_machine_decode_monitor_status(byte_c, byte_d, 2);
        readiness->exhaust_gas_sensor = state_machine_decode_monitor_status(byte_c, byte_d, 3);
        readiness->pm_filter = state_machine_decode_monitor_status(byte_c, byte_d, 4);
        readiness->egr_vvt_system = state_machine_decode_monitor_status(byte_c, byte_d, 5);
        return;
    }

    readiness->catalyst = state_machine_decode_monitor_status(byte_c, byte_d, 0);
    readiness->heated_catalyst = state_machine_decode_monitor_status(byte_c, byte_d, 1);
    readiness->evaporative_system = state_machine_decode_monitor_status(byte_c, byte_d, 2);
    readiness->secondary_air_system = state_machine_decode_monitor_status(byte_c, byte_d, 3);
    readiness->ac_refrigerant = state_machine_decode_monitor_status(byte_c, byte_d, 4);
    readiness->oxygen_sensor = state_machine_decode_monitor_status(byte_c, byte_d, 5);
    readiness->oxygen_sensor_heater = state_machine_decode_monitor_status(byte_c, byte_d, 6);
    readiness->egr_vvt_system = state_machine_decode_monitor_status(byte_c, byte_d, 7);
}

/**
 * @brief Clear the runtime snapshot associated with one diagnostic query.
 *
 * This is used when the ECU explicitly reports no data for a query or when the
 * BLE stack returns an empty payload. Clearing prevents old diagnostic content
 * from leaking into later publishes after the vehicle or adapter changes state.
 *
 * @param[in] mode OBD mode that was queried.
 * @param[in] pid PID used with the mode, or `-1` for mode-only requests.
 */
static void state_machine_clear_obd_diagnostic_query(uint8_t mode, int pid) {
    // Reset clear OBD diagnostic query here so stale data does not leak into the next cycle.
    if (mode == OBD_MODE_CURRENT_DATA && pid == OBD_PID_MONITOR_STATUS) {
        memset(&s_telemetry.obd_readiness, 0, sizeof(s_telemetry.obd_readiness));
        return;
    }

    switch (mode) {
        case OBD_MODE_STORED_DTC:
            state_machine_reset_dtc_list(&s_telemetry.obd_stored_dtc, true);
            break;
        case OBD_MODE_PENDING_DTC:
            state_machine_reset_dtc_list(&s_telemetry.obd_pending_dtc, true);
            break;
        case OBD_MODE_PERMANENT_DTC:
            state_machine_reset_dtc_list(&s_telemetry.obd_permanent_dtc, true);
            break;
        default:
            break;
    }
}

/**
 * @brief Clear OBD signal snapshot.
 */
void state_machine_clear_obd_signal_snapshot(void) {
    // Reset clear OBD signal snapshot here so stale data does not leak into the next cycle.
    /*
     * OBD signal fields are scalar values, so a disconnected adapter would
     * otherwise keep publishing the last successful PID sample. Clear both live
     * signals and diagnostic snapshots whenever freshness cannot be proven.
     */
    s_telemetry.obd_rpm = 0;
    s_telemetry.obd_speed = 0;
    s_telemetry.obd_coolant_temp = 0;
    s_telemetry.obd_fuel_level = 0;
    s_telemetry.obd_engine_load = 0;
    memset(&s_telemetry.obd_readiness, 0, sizeof(s_telemetry.obd_readiness));
    memset(&s_telemetry.obd_stored_dtc, 0, sizeof(s_telemetry.obd_stored_dtc));
    memset(&s_telemetry.obd_pending_dtc, 0, sizeof(s_telemetry.obd_pending_dtc));
    memset(&s_telemetry.obd_permanent_dtc, 0, sizeof(s_telemetry.obd_permanent_dtc));
    s_last_obd_sample_ms = 0;
    s_last_obd_engine_on_evidence_ms = 0;
    s_telemetry.obd_sample_age_ms = UINT32_MAX;
}

/**
 * @brief Mark OBD as disconnected.
 */
void state_machine_mark_obd_disconnected(void) {
    // Drive the transport or session toward a connected state while keeping retries explicit.
    /* Single exit path for BLE disconnect/failure so every caller clears stale OBD state identically. */
    s_obd_elm_ready = false;
    state_machine_clear_obd_signal_snapshot();
    s_last_obd_diagnostic_poll_ms = 0;
    s_obd_aux_pid_cursor = 0;
    s_obd_diag_query_cursor = 0;
    s_telemetry.obd_ble_connected = false;
    s_telemetry.obd_elm_ready = false;
    util_copy_string(s_telemetry.obd_ecu_state, sizeof(s_telemetry.obd_ecu_state), "disconnected");
}

/**
 * @brief Decode one OBD response callback into the shared telemetry snapshot.
 *
 * The BLE OBD layer feeds all PID/mode responses through this callback. Scalar
 * live signals update `s_last_obd_sample_ms`, while readiness and DTC payloads
 * refresh their dedicated structures without pretending to be "live RPM/speed"
 * samples.
 *
 * @param[in] mode OBD mode associated with the payload.
 * @param[in] pid PID associated with the payload, or negative for mode-only calls.
 * @param[in] data Raw payload bytes.
 * @param[in] len Number of bytes in `data`.
 * @param[in] usr_ctx Unused caller context.
 */
void state_machine_obd_response_cb(uint8_t mode, int pid, const uint8_t *data, size_t len, void *usr_ctx) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    (void)usr_ctx;

    int32_t converted = 0;
    bool updated = false;
    if (data == NULL || len == 0) {
        // Empty responses clear any matching in-flight diagnostic query so timeout recovery can move on cleanly.
        state_machine_clear_obd_diagnostic_query(mode, pid);
        return;
    }

    if (mode == OBD_MODE_CURRENT_DATA && pid >= 0 && (uint8_t)pid == OBD_PID_MONITOR_STATUS) {
        // Monitor-status payload feeds readiness bits, not the scalar live gauges below.
        state_machine_decode_readiness_payload(&s_telemetry.obd_readiness, data, len);
        return;
    }
    if (mode == OBD_MODE_STORED_DTC) {
        // DTC modes refresh their dedicated fault snapshots and do not count as a fresh live telemetry sample.
        state_machine_decode_dtc_payload(&s_telemetry.obd_stored_dtc, data, len);
        return;
    }
    if (mode == OBD_MODE_PENDING_DTC) {
        state_machine_decode_dtc_payload(&s_telemetry.obd_pending_dtc, data, len);
        return;
    }
    if (mode == OBD_MODE_PERMANENT_DTC) {
        state_machine_decode_dtc_payload(&s_telemetry.obd_permanent_dtc, data, len);
        return;
    }
    if (pid < 0) {
        return;
    }

    // Only the selected scalar PIDs below refresh the "last live OBD sample" timestamp.
    switch ((uint8_t)pid) {
        case 0x0C:
            if (obd_convert_rpm(&converted, data, len) == 0) {
                s_telemetry.obd_rpm = converted;
                updated = true;
            }
            break;
        case 0x0D:
            if (len >= 1) {
                s_telemetry.obd_speed = data[0];
                updated = true;
            }
            break;
        case 0x05:
            if (obd_convert_temperature(&converted, data, len) == 0) {
                s_telemetry.obd_coolant_temp = converted;
                updated = true;
            }
            break;
        case 0x2F:
            if (obd_convert_percent(&converted, data, len) == 0) {
                s_telemetry.obd_fuel_level = converted;
                updated = true;
            }
            break;
        case 0x04:
            if (obd_convert_percent(&converted, data, len) == 0) {
                s_telemetry.obd_engine_load = converted;
                updated = true;
            }
            break;
        default:
            break;
    }

    if (updated) {
        // Timestamp advances only after a successful decode so stale values do not look freshly sampled.
        uint64_t now_ms = util_uptime_ms();
        s_last_obd_sample_ms = now_ms;
        if (((uint8_t)pid == 0x0C && s_telemetry.obd_rpm > 0) ||
            ((uint8_t)pid == 0x04 && s_telemetry.obd_engine_load > 0)) {
            s_last_obd_engine_on_evidence_ms = now_ms;
        }
    }
}

bool state_machine_has_recent_obd_engine_on_evidence(uint64_t now_ms) {
    // Keep a short grace window so one missed RPM poll does not collapse ignition while the ECU session is still live.
    if (s_last_obd_engine_on_evidence_ms == 0 || now_ms < s_last_obd_engine_on_evidence_ms) {
        return false;
    }

    return (now_ms - s_last_obd_engine_on_evidence_ms) <= (uint64_t)TRACKER_OBD_ENGINE_ON_EVIDENCE_HOLD_MS;
}

/**
 * @brief Refresh OBD fail window.
 *
 * @param now_ms Current timestamp.
 */
void state_machine_obd_refresh_fail_window(uint64_t now_ms) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    if (s_obd_fail_window_started_ms == 0 ||
        now_ms < s_obd_fail_window_started_ms ||
        (now_ms - s_obd_fail_window_started_ms) >= TRACKER_OBD_FAIL_WINDOW_MS) {
        s_obd_fail_window_started_ms = now_ms;
        s_obd_fail_window_count = 0;
    }
}

static const retry_policy_t *state_machine_current_ble_retry_policy(void) {
    // Keep this public facade thin and forward the real work to the focused implementation below.
    return s_telemetry.ignition ? &g_state_ble_retry_policy : &g_state_ble_retry_parked_policy;
}

/**
 * @brief Schedule the next BLE reconnect attempt using the active retry policy.
 *
 * @param[in] now_ms Current uptime.
 * @param[in] reason Log label for the failed step.
 * @param[in] policy Optional policy override; defaults to driving policy.
 */
static void state_machine_schedule_ble_retry(uint64_t now_ms, const char *reason, const retry_policy_t *policy) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    const retry_policy_t *active_policy = policy != NULL ? policy : &g_state_ble_retry_policy;
    uint32_t delay_ms = retry_state_current_delay_ms(&s_ble_retry, active_policy, now_ms);
    esp_err_t sched_err = retry_state_schedule(&s_ble_retry, active_policy, now_ms, ESP_FAIL);
    if (sched_err != ESP_OK) {
        return;
    }

    if ((s_ble_retry.attempts % 10U) == 1U) {
        ESP_LOGE(TAG,
                 "event=retry_scheduled step=%s err=%s attempt=%lu next_delay_ms=%lu",
                 reason,
                 esp_err_to_name(ESP_FAIL),
                 (unsigned long)s_ble_retry.attempts,
                 (unsigned long)delay_ms);
    }
}

/**
 * @brief Increment the rolling OBD connect-failure window.
 *
 * @param[in] now_ms Current uptime.
 */
static void state_machine_obd_record_connect_failure(uint64_t now_ms) {
    // Drive the transport or session toward a connected state while keeping retries explicit.
    state_machine_obd_refresh_fail_window(now_ms);
    s_obd_fail_window_count += 1U;
}

/**
 * @brief Emit a throttled OBD failure event when recent failures warrant it.
 *
 * @param[in] now_ms Current uptime.
 * @param[in] code Firmware event code to publish.
 * @param[in] message Event message string to publish.
 */
static void state_machine_publish_obd_failure_event_if_needed(uint64_t now_ms,
                                                              int code,
                                                              const char *message) {
    // Publish an OBD failure event here when the current fault should be surfaced beyond local retries.
    state_machine_obd_record_connect_failure(now_ms);

    bool is_new_error_type = !s_obd_fail_alert_emitted || (s_last_obd_fail_alert_code != code);
    bool cooldown_elapsed = (now_ms - s_last_obd_fail_alert_ms) >= TRACKER_OBD_FAIL_ALERT_COOLDOWN_MS;
    if (is_new_error_type || cooldown_elapsed) {
        state_machine_publish_event("warning", code, message);
        s_obd_fail_alert_emitted = true;
        s_last_obd_fail_alert_code = code;
        s_last_obd_fail_alert_ms = now_ms;
    }
}

/**
 * @brief Prime a newly connected ECU with a few key PIDs.
 *
 * The goal is not full polling coverage; it is only to prove that the adapter
 * can return at least one fresh PID quickly enough for the rest of the driving
 * loop to trust the session as live.
 *
 * @param[in] ctx Connected BLE OBD context.
 * @return true when at least one fresh PID sample was observed.
 */
static bool state_machine_prime_obd_after_connect(ble_obd_ctx_t *ctx) {
    // Drive the transport or session toward a connected state while keeping retries explicit.
    if (ctx == NULL) {
        return false;
    }

    static const uint8_t s_prime_pids[] = {0x0C, 0x04, 0x0D, 0x05};
    uint64_t sample_before_ms = s_last_obd_sample_ms;
    for (size_t attempt = 0; attempt < 3U; ++attempt) {
        for (size_t i = 0; i < ARRAY_SIZE(s_prime_pids); ++i) {
            uint8_t pid = s_prime_pids[i];
            if (ble_obd_rxtx(ctx, OBD_MODE_CURRENT_DATA, pid, TRACKER_OBD_PID_TIMEOUT_MS) == 0 &&
                s_last_obd_sample_ms != 0 &&
                s_last_obd_sample_ms != sample_before_ms) {
                ESP_LOGI(TAG, "event=obd_prime_sample_ready pid=0x%02X", pid);
                return true;
            }
            vTaskDelay(pdMS_TO_TICKS(75));
        }
    }

    ESP_LOGW(TAG,
             "event=obd_prime_sample_missing ecu=%s",
             ble_obd_get_last_ecu_state_label(ctx));
    return false;
}

/**
 * @brief Execute one diagnostic query from the fixed OBD diagnostic rotation.
 *
 * @param[in] ctx Connected BLE OBD context.
 * @param[in] query Query descriptor containing mode and optional PID.
 */
void state_machine_run_obd_diagnostic_query(ble_obd_ctx_t *ctx, const tracker_obd_diag_query_t *query) {
    // Advance one cooperative step here using the current state, time gates, and retry policy.
    if (ctx == NULL || query == NULL) {
        return;
    }

    int rc = query->pid >= 0
                 ? ble_obd_rxtx(ctx, query->mode, (uint8_t)query->pid, TRACKER_OBD_PID_TIMEOUT_MS)
                 : ble_obd_request_mode(ctx, query->mode, TRACKER_OBD_PID_TIMEOUT_MS);
    if (rc == 0) {
        return;
    }

    const char *ecu_state = ble_obd_get_last_ecu_state_label(ctx);
    bool no_data = strcmp(ecu_state, "no_data") == 0;
    if (no_data) {
        state_machine_clear_obd_diagnostic_query(query->mode, query->pid);
    }

    ESP_LOGW(TAG,
             "event=obd_diag_query_failed mode=0x%02X pid=%d ecu=%s cleared=%d",
             (unsigned)query->mode,
             query->pid,
             ecu_state,
             no_data ? 1 : 0);
}

/**
 * @brief Prime the full diagnostic snapshot after BLE/ELM327 connect succeeds.
 *
 * @param[in] ctx Connected BLE OBD context.
 */
static void state_machine_prime_obd_diagnostics_after_connect(ble_obd_ctx_t *ctx) {
    // Drive the transport or session toward a connected state while keeping retries explicit.
    if (ctx == NULL) {
        return;
    }

    size_t query_count = 0;
    const tracker_obd_diag_query_t *diag_queries = state_machine_obd_diagnostic_queries(&query_count);
    for (size_t i = 0; i < query_count; ++i) {
        state_machine_run_obd_diagnostic_query(ctx, &diag_queries[i]);
        vTaskDelay(pdMS_TO_TICKS(75));
    }
}

/**
 * @brief Background task that performs BLE OBD connect and ELM327 init.
 *
 * The FSM never blocks on BLE discovery. Instead it launches this task, which
 * optionally applies a preferred MAC address, attempts connect + ELM327 init,
 * primes initial PID/diagnostic data, and publishes the final result through a
 * one-slot queue consumed by the main loop.
 *
 * @param[in] arg Pointer to `tracker_ble_connect_task_args_t`.
 */
static void state_machine_ble_connect_task(void *arg) {
    // Drive the transport or session toward a connected state while keeping retries explicit.
    tracker_ble_connect_task_args_t *task_args = (tracker_ble_connect_task_args_t *)arg;
    tracker_ble_connect_result_t result = {
        .ctx = NULL,
        .code = TRACKER_BLE_CONNECT_RESULT_CONNECT_FAILED,
        .started_ms = task_args != NULL ? task_args->started_ms : util_uptime_ms(),
        .prime_sample_ready = false,
        .preferred_from_rtc = task_args != NULL ? task_args->preferred_from_rtc : false,
    };

    if (task_args != NULL) {
        bool use_preferred_mac = !util_string_empty(task_args->preferred_mac) &&
                                 ble_obd_set_preferred_address(task_args->preferred_mac) == ESP_OK;
        if (!use_preferred_mac) {
            ble_obd_set_preferred_address("");
        }

        ble_obd_ctx_t *ctx = ble_obd_connect(state_machine_obd_response_cb, NULL, TRACKER_BLE_CONNECT_TIMEOUT_MS);
        if (ctx != NULL) {
            if (ble_obd_elm327_init(ctx) == ESP_OK) {
                result.prime_sample_ready = state_machine_prime_obd_after_connect(ctx);
                state_machine_prime_obd_diagnostics_after_connect(ctx);
                result.ctx = ctx;
                result.code = TRACKER_BLE_CONNECT_RESULT_OK;
            } else {
                result.code = TRACKER_BLE_CONNECT_RESULT_ELM327_INIT_FAILED;
                ble_obd_disconnect(ctx);
            }
        }

        free(task_args);
    }

    if (s_ble_connect_result_queue != NULL) {
        (void)xQueueOverwrite(s_ble_connect_result_queue, &result);
    }

    vTaskDelete(NULL);
}

/**
 * @brief Drain and apply any completed BLE connect result from the worker task.
 *
 * @return true when at least one result item was consumed.
 */
bool state_machine_handle_ble_connect_result(void) {
    // Drive the transport or session toward a connected state while keeping retries explicit.
    if (s_ble_connect_result_queue == NULL) {
        return false;
    }

    bool handled = false;
    tracker_ble_connect_result_t result = {0};
    while (xQueueReceive(s_ble_connect_result_queue, &result, 0) == pdTRUE) {
        handled = true;
        s_ble_connect_inflight = false;
        s_ble_connect_started_ms = 0;

        if (result.code == TRACKER_BLE_CONNECT_RESULT_OK && result.ctx != NULL) {
            /* Accept the new connection atomically so stale contexts never survive. */
            if (s_ble_ctx != NULL && s_ble_ctx != result.ctx) {
                ble_obd_disconnect(s_ble_ctx);
            }
            s_ble_ctx = result.ctx;
            s_obd_elm_ready = true;
            s_last_obd_poll_ms = 0;
            s_last_obd_diagnostic_poll_ms = 0;
            s_obd_aux_pid_cursor = 0;
            s_obd_diag_query_cursor = 0;
            s_obd_fail_alert_emitted = false;
            s_last_obd_fail_alert_code = 0;
            s_last_obd_fail_alert_ms = 0;
            retry_state_reset(&s_ble_retry);
            ESP_LOGI(TAG,
                     "event=ble_obd_connected duration_ms=%llu",
                     (unsigned long long)(util_uptime_ms() - result.started_ms));
            char peer_addr[BLE_ADDR_STR_LEN] = {0};
            if (ble_obd_get_peer_address_string(result.ctx, peer_addr) &&
                state_machine_store_rtc_ble_mac_string(peer_addr)) {
                ESP_LOGI(TAG, "event=ble_reconnect_hint_retained addr=%s", peer_addr);
            }
            if (!result.prime_sample_ready) {
                ESP_LOGW(TAG,
                         "event=ble_obd_connected_without_fresh_pid");
            }
            continue;
        }

        /* Any failure path must converge through the same disconnect + retry logic. */
        s_ble_ctx = NULL;
        state_machine_mark_obd_disconnected();
        if (result.preferred_from_rtc && result.code == TRACKER_BLE_CONNECT_RESULT_CONNECT_FAILED) {
            char stale_addr[TRACKER_MAC_ADDR_STR_LEN] = {0};
            bool had_stale_addr = state_machine_copy_rtc_ble_mac_string(stale_addr);
            state_machine_clear_rtc_ble_mac();
            ESP_LOGW(TAG,
                     "event=ble_reconnect_hint_cleared reason=connect_failed addr=%s",
                     had_stale_addr ? stale_addr : "unknown");
        }
        uint64_t now_ms = util_uptime_ms();
        int event_code = result.code == TRACKER_BLE_CONNECT_RESULT_ELM327_INIT_FAILED
                             ? TRACKER_EVENT_CODE_OBD_ELM327_INIT_FAILED
                             : TRACKER_EVENT_CODE_OBD_CONNECT_FAILED;
        const char *event_reason = result.code == TRACKER_BLE_CONNECT_RESULT_ELM327_INIT_FAILED
                                       ? "obd_elm327_init_failed"
                                       : "obd_connect_failed";
        state_machine_publish_obd_failure_event_if_needed(now_ms, event_code, event_reason);
        state_machine_schedule_ble_retry(now_ms,
                                         "connect_or_ble_stack_or_elm327_init_failed",
                                         state_machine_current_ble_retry_policy());
    }

    return handled;
}

/**
 * @brief Start a BLE OBD connect attempt when runtime policy allows it.
 *
 * This function enforces OTA exclusions, retry cadence, preferred-MAC policy,
 * and asynchronous task launch. It intentionally does not block the main FSM.
 */
void state_machine_try_connect_ble(void) {
    // Drive the transport or session toward a connected state while keeping retries explicit.
    // Always consume the previous async connect result first so retry policy reflects the latest BLE outcome.
    (void)state_machine_handle_ble_connect_result();
    if (s_ota_in_progress || g_rtc_context.ota_pending_confirm) {
        return;
    }
    if (s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx)) {
        return;
    }
    if (s_ble_connect_inflight) {
        return;
    }

    uint64_t now_ms = util_uptime_ms();
    const retry_policy_t *ble_retry_policy = state_machine_current_ble_retry_policy();
    if (s_telemetry.ignition && !s_ble_retry_last_ignition) {
        // Ignition-on is treated as a stronger reconnect hint, so parked backoff is cleared on that edge.
        retry_state_reset(&s_ble_retry);
    }
    s_ble_retry_last_ignition = s_telemetry.ignition;

    if (!retry_state_can_run(&s_ble_retry, now_ms)) {
        return;
    }
    if ((s_ble_retry.attempts % 5U) == 0U) {
        const char *mode = s_telemetry.ignition ? "driving" : "parked";
        ESP_LOGI(TAG,
                 "event=ble_connect_attempt attempt=%lu mode=%s timeout_ms=%u",
                 (unsigned long)(s_ble_retry.attempts + 1U),
                 mode,
                 (unsigned int)TRACKER_BLE_CONNECT_TIMEOUT_MS);
    }

    if (s_ble_ctx != NULL) {
        // Drop any half-open adapter handle before starting a fresh connect task against the BLE stack.
        ble_obd_disconnect(s_ble_ctx);
        s_ble_ctx = NULL;
        state_machine_mark_obd_disconnected();
    }

    char preferred_mac[TRACKER_MAC_ADDR_STR_LEN] = {0};
    bool preferred_from_rtc = false;
    bool has_preferred_mac =
        state_machine_resolve_preferred_ble_mac(preferred_mac, &preferred_from_rtc);
#if defined(CONFIG_TRACKER_FIELD_VALIDATION_SKIP_OBD_AUTODISCOVER) && CONFIG_TRACKER_FIELD_VALIDATION_SKIP_OBD_AUTODISCOVER
    if (!has_preferred_mac) {
        if (!s_field_validation_ble_skip_logged) {
            ESP_LOGW(TAG,
                     "event=field_validation_ble_autodiscover_skipped reason=preferred_mac_missing");
            s_field_validation_ble_skip_logged = true;
        }
        state_machine_mark_obd_disconnected();
        retry_state_reset(&s_ble_retry);
        return;
    }
#endif
    s_field_validation_ble_skip_logged = false;

    if (!has_preferred_mac) {
        if ((s_ble_retry.attempts % 10U) == 0U) {
            ESP_LOGW(TAG, "event=ble_connect_mode mode=auto_discover reason=preferred_mac_missing_or_invalid");
        }
    } else if (preferred_from_rtc && (s_ble_retry.attempts % 10U) == 0U) {
        ESP_LOGI(TAG, "event=ble_connect_mode mode=retained_mac addr=%s", preferred_mac);
    } else if ((s_ble_retry.attempts % 10U) == 0U) {
        ESP_LOGI(TAG, "event=ble_connect_mode mode=preferred_mac addr=%s", preferred_mac);
    }

    // The task owns the blocking connect and ELM327 init path so the main FSM loop can stay cooperative.
    tracker_ble_connect_task_args_t *task_args = calloc(1, sizeof(*task_args));
    if (task_args == NULL) {
        state_machine_mark_obd_disconnected();
        state_machine_publish_obd_failure_event_if_needed(now_ms,
                                                          TRACKER_EVENT_CODE_OBD_CONNECT_FAILED,
                                                          "obd_connect_failed");
        state_machine_schedule_ble_retry(now_ms,
                                         "connect_or_ble_stack_or_elm327_init_failed",
                                         ble_retry_policy);
        return;
    }

    task_args->started_ms = now_ms;
    task_args->preferred_from_rtc = preferred_from_rtc;
    util_copy_string(task_args->preferred_mac, sizeof(task_args->preferred_mac), preferred_mac);
    if (xTaskCreate(state_machine_ble_connect_task,
                    "ble_obd_conn",
                    TRACKER_BLE_CONNECT_TASK_STACK_BYTES,
                    task_args,
                    5,
                    NULL) != pdPASS) {
        free(task_args);
        state_machine_mark_obd_disconnected();
        state_machine_publish_obd_failure_event_if_needed(now_ms,
                                                          TRACKER_EVENT_CODE_OBD_CONNECT_FAILED,
                                                          "obd_connect_failed");
        state_machine_schedule_ble_retry(now_ms,
                                         "connect_or_ble_stack_or_elm327_init_failed",
                                         ble_retry_policy);
        return;
    }

    // Mark the attempt in-flight only after task creation succeeds so timeout logic watches a real worker.
    s_ble_connect_inflight = true;
    s_ble_connect_started_ms = now_ms;
}
