#include "state_wake_prelude.h"

#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"

#include "adc_reader.h"
#include "ble_obd.h"
#include "imu_lis3dsh.h"
#include "modem_gnss.h"
#include "modem_lte.h"
#include "mqtt_client.h"
#include "offline_queue.h"
#include "rtc_ds3231m.h"
#include "session_mgr.h"
#include "state_machine_internal.h"
#include "state_obd_runtime.h"
#include "state_ota_runtime.h"
#include "state_publish_pipeline.h"
#include "state_runtime_context.h"
#include "util.h"

/**
 * @file state_wake_prelude.c
 * @brief Wake/bootstrap/network/telemetry helpers for the tracker FSM.
 * This translation unit belongs to the app-core orchestration layer and keeps FSM transitions, retained runtime state, and orchestration policy centralized inside app-core.
 */


static const char *TAG = "WAKE_PRELUDE";

/**
 * @brief Power-cycle GNSS after repeated poll failures.
 *
 * This is the strongest GNSS recovery path used by the wake prelude. It is
 * rate-limited by `TRACKER_GNSS_REARM_COOLDOWN_MS` so a noisy modem or weak
 * antenna environment does not thrash the GNSS power domain on every loop.
 *
 * @param[in] reason Short reason string emitted in diagnostics.
 * @return true when the GNSS power cycle completed successfully.
 */
static bool state_machine_try_rearm_gnss(const char *reason) {
    uint64_t now_ms = util_uptime_ms();
    // Cooldown gate: refuse to power-cycle GNSS again until the rearm interval has elapsed.
    if (s_last_gnss_rearm_ms != 0 && (now_ms - s_last_gnss_rearm_ms) < TRACKER_GNSS_REARM_COOLDOWN_MS) {
        return false;
    }

    // Stamp the attempt time up front so a failed power-cycle still enforces the cooldown.
    s_last_gnss_rearm_ms = now_ms;
    // Full power cycle: off then on is the strongest recovery for a wedged GNSS engine.
    esp_err_t off_err = modem_gnss_power_off();
    esp_err_t on_err = modem_gnss_power_on();
    if (off_err == ESP_OK && on_err == ESP_OK) {
        // Mark GNSS live again and clear the failure streak that triggered this rearm.
        s_gnss_started = true;
        s_gnss_poll_fail_streak = 0;
        ESP_LOGW(TAG, "event=gnss_rearmed reason=%s", reason);
        return true;
    }

    ESP_LOGW(TAG,
             "event=gnss_rearm_failed reason=%s off_err=%s on_err=%s",
             reason,
             esp_err_to_name(off_err),
             esp_err_to_name(on_err));
    return false;
}

/**
 * @brief Attempt to reassert GNSS power without full power cycle.
 *
 * Differs from rearm_gnss by skipping the power-off step - only powers on.
 * Includes cooldown check to prevent rapid reassert attempts.
 *
 * @param reason Reason for reassert attempt (logging).
 * @return true if power-on succeeded, false otherwise.
 */
static bool state_machine_try_reassert_gnss_power(const char *reason) {
    uint64_t now_ms = util_uptime_ms();
    // Share the same cooldown as the full rearm path so the two recovery routes cannot thrash the power domain.
    if (s_last_gnss_rearm_ms != 0 && (now_ms - s_last_gnss_rearm_ms) < TRACKER_GNSS_REARM_COOLDOWN_MS) {
        return false;
    }

    s_last_gnss_rearm_ms = now_ms;
    // Lighter recovery: only assert power-on (no power-off) when GNSS just needs to be re-enabled, e.g. after LTE recovery.
    esp_err_t on_err = modem_gnss_power_on();
    if (on_err == ESP_OK) {
        s_gnss_started = true;
        s_gnss_poll_fail_streak = 0;
        ESP_LOGW(TAG, "event=gnss_power_reasserted reason=%s", reason);
        return true;
    }

    ESP_LOGW(TAG,
             "event=gnss_power_reassert_failed reason=%s on_err=%s",
             reason,
             esp_err_to_name(on_err));
    return false;
}

/**
 * @brief Check if GNSS can be polled.
 *
 * @return True if ready.
 */
bool state_machine_can_poll_gnss(void) {
    // GNSS is pollable only when it is powered, the modem AT channel is ready, and the GNSS query path is armed.
    return s_gnss_started && modem_lte_is_at_ready() && modem_gnss_is_query_ready();
}

/**
 * @brief Try to start GNSS non-blocking.
 */
void state_machine_try_start_gnss_nonblocking(void) {
    // Nothing to do if GNSS is already up, and there is no point trying before the modem AT channel is ready.
    if (s_gnss_started || !modem_lte_is_at_ready()) {
        return;
    }

    uint64_t now_ms = util_uptime_ms();
    // Respect the rearm cooldown so repeated FSM passes do not hammer GNSS power-on right after a recent attempt.
    if (s_last_gnss_rearm_ms != 0 &&
        now_ms > s_last_gnss_rearm_ms &&
        (now_ms - s_last_gnss_rearm_ms) < TRACKER_GNSS_REARM_COOLDOWN_MS) {
        return;
    }

    s_last_gnss_rearm_ms = now_ms;
    esp_err_t err = modem_gnss_power_on();
    if (err == ESP_OK) {
        s_gnss_started = true;
        s_gnss_poll_fail_streak = 0;
        ESP_LOGI(TAG, "event=gnss_power_on_ok");
        return;
    }

    // GNSS failing to start is non-fatal: publishing continues without a fix until the next attempt.
    ESP_LOGW(TAG,
             "event=gnss_power_on_failed err=%s fallback=publish_without_gnss",
             esp_err_to_name(err));
}

/**
 * @brief Bootstrap RTC hardware.
 */
void state_machine_bootstrap_rtc(void) {
    // One-shot per boot: skip once bootstrap is done or if no DS3231M is present on the bus.
    if (s_hw_bootstrap_done || !rtc_ds3231m_is_available()) {
        return;
    }

    uint64_t now_ms = util_uptime_ms();
    // Gate retries so a failing RTC does not get probed on every single FSM loop iteration.
    if (!retry_state_can_run(&s_rtc_bootstrap_retry, now_ms)) {
        return;
    }

    uint64_t rtc_ms = 0;
    // If the RTC already holds a plausible wall-clock time, accept it and finish bootstrap immediately.
    if (rtc_ds3231m_get_time_ms(&rtc_ms) == ESP_OK && rtc_ds3231m_is_time_valid_ms(rtc_ms)) {
        s_hw_bootstrap_done = true;
        retry_state_reset(&s_rtc_bootstrap_retry);
        return;
    }

    // RTC has no trusted time yet: seed it from a fresh GNSS fix when available, otherwise a fixed epoch baseline.
    uint64_t fallback_ms = s_telemetry.gnss.fix_valid && rtc_ds3231m_is_time_valid_ms(s_telemetry.gnss.timestamp_ms)
                               ? s_telemetry.gnss.timestamp_ms
                               : 1735689600000ULL;
    if (rtc_ds3231m_set_time_ms(fallback_ms) == ESP_OK) {
        uint64_t verify_ms = 0;
        // Read-back verification confirms the seed actually stuck before declaring bootstrap complete.
        if (rtc_ds3231m_get_time_ms(&verify_ms) == ESP_OK && rtc_ds3231m_is_time_valid_ms(verify_ms)) {
            ESP_LOGI(TAG,
                     "event=rtc_bootstrap_ok set_ms=%llu read_ms=%llu",
                     (unsigned long long)fallback_ms,
                     (unsigned long long)verify_ms);
            s_hw_bootstrap_done = true;
            retry_state_reset(&s_rtc_bootstrap_retry);
            return;
        }
    }

    uint32_t delay_ms = retry_state_current_delay_ms(&s_rtc_bootstrap_retry,
                                                     &g_state_rtc_bootstrap_retry_policy,
                                                     now_ms);
    if (retry_state_schedule(&s_rtc_bootstrap_retry,
                             &g_state_rtc_bootstrap_retry_policy,
                             now_ms,
                             ESP_FAIL) == ESP_OK) {
        ESP_LOGW(TAG,
                 "event=retry_scheduled step=rtc_bootstrap err=%s attempt=%lu next_delay_ms=%lu",
                 esp_err_to_name(ESP_FAIL),
                 (unsigned long)s_rtc_bootstrap_retry.attempts,
                 (unsigned long)delay_ms);
    }
}

/**
 * @brief Bootstrap IMU hardware and motion interrupt policy.
 *
 * The wake prelude keeps IMU bring-up idempotent and non-blocking by routing
 * failures through the retry manager. Once initialization succeeds, the motion
 * interrupt is configured immediately so later sleep states can rely on the
 * same runtime policy without redoing basic setup.
 */
void state_machine_bootstrap_imu(void) {
    if (!state_machine_imu_runtime_enabled() || s_imu_available) {
        return;
    }

    uint64_t now_ms = util_uptime_ms();
    if (!retry_state_can_run(&s_imu_bootstrap_retry, now_ms)) {
        return;
    }

    esp_err_t imu_err = imu_init();
    if (imu_err == ESP_OK) {
        s_imu_available = true;
        retry_state_reset(&s_imu_bootstrap_retry);
        esp_err_t motion_cfg_err = imu_configure_motion_interrupt(120, 200);
        if (motion_cfg_err != ESP_OK) {
            ESP_LOGW(TAG, "event=imu_motion_interrupt_config_failed err=%s", esp_err_to_name(motion_cfg_err));
        } else {
            ESP_LOGI(TAG, "event=imu_bootstrap_ready motion_interrupt=1");
        }
        return;
    }

    uint32_t delay_ms = retry_state_current_delay_ms(&s_imu_bootstrap_retry,
                                                     &g_state_imu_bootstrap_retry_policy,
                                                     now_ms);
    (void)retry_state_schedule(&s_imu_bootstrap_retry,
                               &g_state_imu_bootstrap_retry_policy,
                               now_ms,
                               imu_err);
    ESP_LOGW(TAG,
             "event=retry_scheduled step=imu_init err=%s attempt=%lu next_delay_ms=%lu",
             esp_err_to_name(imu_err),
             (unsigned long)s_imu_bootstrap_retry.attempts,
             (unsigned long)delay_ms);
}

/**
 * @brief Refresh the shared telemetry snapshot from ADC, OBD, and GNSS.
 *
 * This function is the main sensor-fusion pass for the FSM loop. It updates
 * battery rails, IMU vibration magnitude, optional OBD telemetry, GNSS fixes,
 * and the synthesized ignition signal that downstream state handlers consume.
 *
 * @param[in] read_gnss True to poll GNSS when the modem/GNSS path is ready.
 * @param[in] read_obd True to poll OBD when a BLE session is connected.
 */
void state_machine_refresh_telemetry(bool read_gnss, bool read_obd) {
    // Raw ADC voltages from the vehicle supply rail and the device's own battery rail.
    float vehicle_battery_raw_v = adc_read_vehicle_battery_voltage();
    float device_battery_raw_v = adc_read_device_battery_voltage();
    // Apply per-rail calibration gains so reported volts match the physical divider/reference.
    s_telemetry.vehicle_battery = vehicle_battery_raw_v * TRACKER_ADC_SUPPLY_CALIB_GAIN;
    s_telemetry.device_battery = device_battery_raw_v * TRACKER_ADC_BATT_CALIB_GAIN;
    // Vibration magnitude is only meaningful when the IMU is present; otherwise report zero motion.
    s_telemetry.imu_accel_delta_mps2 = s_imu_available ? imu_get_peak_accel_delta_mps2() : 0.0f;

    uint64_t now_ms = util_uptime_ms();
    if (read_obd && s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx)) {
        size_t diag_query_count = 0;
        const tracker_obd_diag_query_t *diag_queries = state_machine_obd_diagnostic_queries(&diag_query_count);

        if ((now_ms - s_last_obd_poll_ms) >= TRACKER_OBD_POLL_INTERVAL_MS) {
            // Poll the live-drive PIDs first, then rotate one auxiliary PID so the BLE link stays responsive.
            /* Interleave a few auxiliary PIDs instead of requesting every signal every loop. */
            static const uint8_t s_aux_pids[] = {0x05, 0x2F, 0x04};
            (void)ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x0C, TRACKER_OBD_PID_TIMEOUT_MS);
            (void)ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x0D, TRACKER_OBD_PID_TIMEOUT_MS);
            uint8_t aux_pid = s_aux_pids[s_obd_aux_pid_cursor % ARRAY_SIZE(s_aux_pids)];
            (void)ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, aux_pid, TRACKER_OBD_PID_TIMEOUT_MS);
            s_obd_aux_pid_cursor = (uint8_t)((s_obd_aux_pid_cursor + 1U) % ARRAY_SIZE(s_aux_pids));
            s_last_obd_poll_ms = now_ms;
        }

        if (diag_queries != NULL &&
            diag_query_count > 0 &&
            (now_ms - s_last_obd_diagnostic_poll_ms) >= TRACKER_OBD_DIAGNOSTIC_POLL_INTERVAL_MS) {
            // Diagnostic readiness/DTC queries run on their own slower cadence so they do not starve live signals.
            const tracker_obd_diag_query_t *diag_query =
                &diag_queries[s_obd_diag_query_cursor % diag_query_count];
            state_machine_run_obd_diagnostic_query(s_ble_ctx, diag_query);
            s_obd_diag_query_cursor = (uint8_t)((s_obd_diag_query_cursor + 1U) % diag_query_count);
            s_last_obd_diagnostic_poll_ms = now_ms;
        }

        if ((now_ms - s_last_obd_debug_log_ms) >= TRACKER_OBD_DEBUG_LOG_INTERVAL_MS) {
            ESP_LOGD(TAG,
                     "event=obd_pid_values rpm=%ld speed=%ld coolant=%ld fuel=%ld load=%ld mil=%d dtc=%u/%u/%u",
                     (long)s_telemetry.obd_rpm,
                     (long)s_telemetry.obd_speed,
                     (long)s_telemetry.obd_coolant_temp,
                     (long)s_telemetry.obd_fuel_level,
                     (long)s_telemetry.obd_engine_load,
                     s_telemetry.obd_readiness.mil_on ? 1 : 0,
                     (unsigned)s_telemetry.obd_stored_dtc.count,
                     (unsigned)s_telemetry.obd_pending_dtc.count,
                     (unsigned)s_telemetry.obd_permanent_dtc.count);
            s_last_obd_debug_log_ms = now_ms;
        }
    }

    if (read_gnss && state_machine_can_poll_gnss()) {
        bool poll_due = (s_last_gnss_poll_ms == 0) ||
                        ((now_ms - s_last_gnss_poll_ms) >= TRACKER_GNSS_POLL_INTERVAL_MS);
        if (poll_due) {
            s_last_gnss_poll_ms = now_ms;
            gnss_data_t gnss = {0};
            if (modem_gnss_get_location(&gnss) == ESP_OK) {
                s_telemetry.gnss = gnss;
                s_gnss_poll_fail_streak = 0;
            } else {
                s_gnss_poll_fail_streak += 1;
                s_telemetry.gnss.fix_valid = false;
                s_telemetry.gnss.timestamp_ms = 0;
                if (s_gnss_poll_fail_streak >= TRACKER_GNSS_FAIL_REARM_THRESHOLD &&
                    state_machine_try_rearm_gnss("poll_fail_threshold")) {
                    s_gnss_poll_fail_streak = 0;
                }
            }
        }
    }

    if (s_telemetry.gnss.timestamp_ms == 0) {
        s_telemetry.gnss.timestamp_ms = now_ms;
    }
    bool obd_connected = s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx);
    const char *obd_ecu_state = obd_connected ? ble_obd_get_last_ecu_state_label(s_ble_ctx) : "disconnected";
    s_telemetry.obd_ble_connected = obd_connected;
    s_telemetry.obd_elm_ready = s_obd_elm_ready && obd_connected;
    util_copy_string(s_telemetry.obd_ecu_state, sizeof(s_telemetry.obd_ecu_state), obd_ecu_state);

    bool obd_signal_fresh =
        s_telemetry.obd_elm_ready &&
        state_machine_has_recent_obd_sample(now_ms, TRACKER_OBD_LIVE_SIGNAL_MAX_AGE_MS);
    if (!obd_signal_fresh) {
        // Once the OBD sample ages out, clear the cached signal snapshot before publish code can reuse stale values.
        state_machine_clear_obd_signal_snapshot();
    }

    if (s_last_obd_sample_ms == 0 || now_ms < s_last_obd_sample_ms) {
        s_telemetry.obd_sample_age_ms = UINT32_MAX;
    } else {
        uint64_t age_ms = now_ms - s_last_obd_sample_ms;
        s_telemetry.obd_sample_age_ms = age_ms > UINT32_MAX ? UINT32_MAX : (uint32_t)age_ms;
    }

    float ignition_threshold_v = (float)s_config.ignition_adc_threshold_mv / 1000.0f;
    // ADC evidence: vehicle supply rail at/above the configured ignition threshold suggests key-on.
    bool adc_ignition = s_telemetry.vehicle_battery >= ignition_threshold_v;
    // OBD sample must be recent enough to be trusted as ignition evidence at all.
    bool obd_sample_fresh =
        state_machine_has_recent_obd_sample(now_ms, TRACKER_IGNITION_OBD_LIVE_SAMPLE_MAX_AGE_MS);
    // Debounced session-level ignition state, the authoritative "stable on" signal.
    bool stable_ignition_on =
        session_mgr_has_stable_ignition() &&
        session_mgr_stable_ignition();
    // OBD live evidence requires a connected adapter reporting a "live" ECU and a fresh sample.
    bool obd_live_ignition = obd_connected &&
                             strcmp(obd_ecu_state, "live") == 0 &&
                             obd_sample_fresh;
    // Strongest positive: live OBD plus recent engine-on evidence (non-zero RPM/load within hold window).
    bool obd_engine_on_evidence = obd_live_ignition &&
                                  state_machine_has_recent_obd_engine_on_evidence(now_ms);
    // Non-zero RPM under a live session is direct proof the engine is running.
    bool rpm_ignition = obd_live_ignition && s_telemetry.obd_rpm > 0;
    // Ambiguous case: live link and stable-on, yet RPM/speed/load all read zero (possible key-on-engine-off or stall).
    bool obd_live_zero_candidate =
        obd_live_ignition &&
        stable_ignition_on &&
        s_telemetry.obd_rpm == 0 &&
        s_telemetry.obd_speed == 0 &&
        s_telemetry.obd_engine_load == 0;
    if (obd_live_zero_candidate) {
        // Start (or keep) the debounce timer that decides whether the all-zero reading really means OFF.
        if (s_obd_live_zero_started_ms == 0 || now_ms < s_obd_live_zero_started_ms) {
            s_obd_live_zero_started_ms = now_ms;
        }
    } else {
        // Any non-zero signal clears the all-zero debounce so a brief idle dip cannot trip an OFF.
        s_obd_live_zero_started_ms = 0;
    }
    // Only confirm OFF after the all-zero condition has persisted past the confirmation window.
    bool obd_live_zero_confirmed_off =
        obd_live_zero_candidate &&
        s_obd_live_zero_started_ms != 0 &&
        now_ms >= s_obd_live_zero_started_ms &&
        (now_ms - s_obd_live_zero_started_ms) >= (uint64_t)TRACKER_OBD_LIVE_ZERO_OFF_CONFIRM_MS;
    // While all-zero is still within its grace window, hold ignition ON rather than flapping it off.
    bool hold_live_zero_on = obd_live_zero_candidate && !obd_live_zero_confirmed_off;
    // Grace bridge: keep ON briefly after the last engine-on evidence so one missed poll does not drop the session.
    bool confirmed_obd_live_grace =
        stable_ignition_on &&
        obd_live_ignition &&
        !obd_live_zero_confirmed_off &&
        s_last_obd_engine_on_evidence_ms != 0 &&
        now_ms >= s_last_obd_engine_on_evidence_ms &&
        (now_ms - s_last_obd_engine_on_evidence_ms) <=
            (uint64_t)TRACKER_OBD_ENGINE_ON_CONFIRMED_GRACE_MS;
    // Degraded-quality hold: ADC says off and OBD evidence is merely absent (not proven off) while session was stable-on.
    bool preserve_degraded_ignition_on =
        !adc_ignition &&
        !obd_live_ignition &&
        stable_ignition_on &&
        (!obd_connected || !obd_sample_fresh);
    // Combine positive ignition evidence into the single ignition bit consumed by the FSM.
    /*
     * Treat temporary OBD loss as degraded quality, not an automatic boundary.
     * If stable ignition was already ON and current evidence is merely absent,
     * the session remains open until OFF is confirmed elsewhere.
     * A debounced ON edge still comes from `session_mgr_on_ignition_sample()`.
     * Here we only expose the raw ignition candidate so the debounce path can
     * actually observe sustained OBD/RPM evidence during wake windows.
     */
    bool ignition_next =
        rpm_ignition ||
        obd_engine_on_evidence ||
        adc_ignition ||
        confirmed_obd_live_grace ||
        hold_live_zero_on ||
        preserve_degraded_ignition_on;
    if (!s_ignition_log_initialized || ignition_next != s_last_ignition_state) {
        uint32_t evidence_age_ms = UINT32_MAX;
        uint32_t live_zero_age_ms = UINT32_MAX;
        if (s_last_obd_engine_on_evidence_ms != 0 && now_ms >= s_last_obd_engine_on_evidence_ms) {
            uint64_t age_ms = now_ms - s_last_obd_engine_on_evidence_ms;
            evidence_age_ms = age_ms > UINT32_MAX ? UINT32_MAX : (uint32_t)age_ms;
        }
        if (s_obd_live_zero_started_ms != 0 && now_ms >= s_obd_live_zero_started_ms) {
            uint64_t age_ms = now_ms - s_obd_live_zero_started_ms;
            live_zero_age_ms = age_ms > UINT32_MAX ? UINT32_MAX : (uint32_t)age_ms;
        }
        ESP_LOGI(TAG,
                 "event=ignition_transition prev=%d next=%d rpm=%ld load=%ld adc=%d rpm_ign=%d obd_hold=%d stable_on=%d vehicle_battery=%.2f threshold=%.2f obd_live=%d confirmed_live_grace=%d hold_on=%d live_zero_hold=%d live_zero_confirmed_off=%d sample_age_ms=%lu evidence_age_ms=%lu live_zero_age_ms=%lu ecu=%s",
                 s_ignition_log_initialized ? (s_last_ignition_state ? 1 : 0) : -1,
                 ignition_next ? 1 : 0,
                 (long)s_telemetry.obd_rpm,
                 (long)s_telemetry.obd_engine_load,
                 adc_ignition ? 1 : 0,
                 rpm_ignition ? 1 : 0,
                 obd_engine_on_evidence ? 1 : 0,
                 stable_ignition_on ? 1 : 0,
                 s_telemetry.vehicle_battery,
                 ignition_threshold_v,
                 obd_live_ignition ? 1 : 0,
                 confirmed_obd_live_grace ? 1 : 0,
                 preserve_degraded_ignition_on ? 1 : 0,
                 hold_live_zero_on ? 1 : 0,
                 obd_live_zero_confirmed_off ? 1 : 0,
                 (unsigned long)s_telemetry.obd_sample_age_ms,
                 (unsigned long)evidence_age_ms,
                 (unsigned long)live_zero_age_ms,
                 obd_ecu_state);
        s_last_ignition_state = ignition_next;
        s_ignition_log_initialized = true;
    }

    s_telemetry.ignition = ignition_next;
    s_telemetry.error_code = 0;
    state_machine_sync_runtime_axes(s_runtime_state_hint);
    state_machine_obd_refresh_fail_window(now_ms);
    s_telemetry.obd_connect_fail_count_5m = s_obd_fail_window_count;

    if (s_last_hw_diag_log_ms == 0 || (now_ms - s_last_hw_diag_log_ms) >= TRACKER_HW_DIAG_LOG_INTERVAL_MS) {
        // Periodic hardware diagnostics summarize the fused runtime picture without waiting for a state transition.
        UBaseType_t stack_hwm_words = uxTaskGetStackHighWaterMark(NULL);
        ESP_LOGI(TAG,
                "event=hw_diag vehicle_battery=%.2fV device_battery=%.2fV ign=%d imu_accel_delta=%.3fm/s2 lte=%d mqtt=%d ble=%d gnss_fix=%d stack_hwm_words=%lu",
                 s_telemetry.vehicle_battery,
                 s_telemetry.device_battery,
                 s_telemetry.ignition ? 1 : 0,
                 (double)s_telemetry.imu_accel_delta_mps2,
                 modem_lte_is_connected() ? 1 : 0,
                 tracker_mqtt_is_connected() ? 1 : 0,
                 obd_connected ? 1 : 0,
                 s_telemetry.gnss.fix_valid ? 1 : 0,
                 (unsigned long)stack_hwm_words);
        s_last_hw_diag_log_ms = now_ms;
    }
}

/**
 * @brief Check whether GNSS currently provides a trusted wall-clock time.
 *
 * @param[out] out_time_ms Optional destination for the GNSS timestamp.
 * @return true when GNSS has a valid fix and its timestamp passes RTC validity checks.
 */
static bool state_machine_network_time_valid(uint64_t *out_time_ms) {
    if (!s_telemetry.gnss.fix_valid) {
        return false;
    }

    uint64_t gnss_ts = s_telemetry.gnss.timestamp_ms;
    if (!rtc_ds3231m_is_time_valid_ms(gnss_ts)) {
        return false;
    }

    if (out_time_ms != NULL) {
        *out_time_ms = gnss_ts;
    }
    return true;
}

/**
 * @brief Try reading a trusted time from the external RTC with retry gating.
 *
 * @param[in] now_ms Current uptime used for retry policy bookkeeping.
 * @param[out] out_rtc_ms Optional destination for the RTC timestamp.
 * @return true when a valid RTC timestamp was obtained.
 */
static bool state_machine_try_get_rtc_time(uint64_t now_ms, uint64_t *out_rtc_ms) {
    if (!rtc_ds3231m_is_available() || !retry_state_can_run(&s_rtc_read_retry, now_ms)) {
        return false;
    }

    uint64_t rtc_time_ms = 0;
    if (rtc_ds3231m_get_time_ms(&rtc_time_ms) == ESP_OK && rtc_ds3231m_is_time_valid_ms(rtc_time_ms)) {
        retry_state_reset(&s_rtc_read_retry);
        if (out_rtc_ms != NULL) {
            *out_rtc_ms = rtc_time_ms;
        }
        return true;
    }

    uint32_t delay_ms = retry_state_current_delay_ms(&s_rtc_read_retry,
                                                     &g_state_rtc_read_retry_policy,
                                                     now_ms);
    (void)retry_state_schedule(&s_rtc_read_retry,
                               &g_state_rtc_read_retry_policy,
                               now_ms,
                               ESP_FAIL);
    ESP_LOGW(TAG,
             "event=retry_scheduled step=rtc_read err=%s attempt=%lu next_delay_ms=%lu",
             esp_err_to_name(ESP_FAIL),
             (unsigned long)s_rtc_read_retry.attempts,
             (unsigned long)delay_ms);
    return false;
}

/**
 * @brief Refresh the event timestamp source used by status/event publishing.
 *
 * Priority order:
 * 1. Trusted GNSS time when a fresh fix is available.
 * 2. Trusted RTC time when GNSS time is unavailable.
 * 3. Local uptime as an untrusted fallback.
 *
 * Successful GNSS time also backfills the RTC periodically so deep-sleep boots
 * can recover a trusted clock earlier in the next cycle.
 */
void state_machine_update_time_source(void) {
    uint64_t now_ms = util_uptime_ms();
    uint64_t selected_time_ms = now_ms;
    bool trusted = false;

    uint64_t network_time_ms = 0;
    if (state_machine_network_time_valid(&network_time_ms)) {
        selected_time_ms = network_time_ms;
        trusted = true;
        if (rtc_ds3231m_is_available() && (now_ms - s_last_rtc_sync_ms) >= TRACKER_RTC_SYNC_MIN_INTERVAL_MS) {
            if (rtc_ds3231m_set_time_ms(network_time_ms) == ESP_OK) {
                s_last_rtc_sync_ms = now_ms;
            }
        }
    } else {
        uint64_t rtc_time_ms = 0;
        if (state_machine_try_get_rtc_time(now_ms, &rtc_time_ms)) {
            selected_time_ms = rtc_time_ms;
            trusted = true;
        }
    }

    s_event_timestamp_ms = selected_time_ms;
    s_time_trusted = trusted;
}

/**
 * @brief Schedule the shared LTE/MQTT retry state and emit one diagnostic line.
 *
 * @param[in] now_ms Current uptime.
 * @param[in] step Subsystem step name used in logs.
 * @param[in] err Failure code that triggered the retry.
 */
static void state_machine_schedule_network_retry(uint64_t now_ms, const char *step, esp_err_t err) {
    uint32_t delay_ms = retry_state_current_delay_ms(&s_network_retry, &g_state_network_retry_policy, now_ms);
    if (retry_state_schedule(&s_network_retry, &g_state_network_retry_policy, now_ms, err) != ESP_OK) {
        return;
    }

    ESP_LOGE(TAG,
             "event=retry_scheduled step=%s err=%s attempt=%lu next_delay_ms=%lu",
             step,
             esp_err_to_name(err),
             (unsigned long)s_network_retry.attempts,
             (unsigned long)delay_ms);
}

/**
 * @brief Wake a modem that was left warm but low-power during parked sleep.
 *
 * When GNSS is kept warm across parked windows the modem is not power-cycled,
 * so the wake prelude only needs to restore the AT channel before GNSS/LTE/MQTT
 * work resumes. Failures stay on the normal network retry rail.
 */
static bool state_machine_wakeup_low_power_modem_if_needed(void) {
    if (!s_modem_low_power_pending_wakeup) {
        return true;
    }

    uint64_t now_ms = util_uptime_ms();
    if (!retry_state_can_run(&s_network_retry, now_ms)) {
        return false;
    }

    esp_err_t err = modem_lte_wakeup();
    if (err != ESP_OK) {
        state_machine_schedule_network_retry(now_ms, "modem_lte_wakeup", err);
        return false;
    }

    s_modem_low_power_pending_wakeup = false;
    retry_state_reset(&s_network_retry);
    ESP_LOGI(TAG, "event=parked_modem_wakeup_ok");
    return true;
}

/**
 * @brief Advance the LTE, MQTT, GNSS, and command-subscribe connection path.
 *
 * This helper is intentionally non-blocking. Each subsystem gets one chance to
 * progress per FSM loop and failures feed the shared network retry state. Once
 * LTE recovers after an earlier outage, GNSS power is reasserted so location
 * polling resumes without waiting for a full reboot.
 */
static void state_machine_try_connect_network(void) {
    uint64_t now_ms = util_uptime_ms();
    if (!retry_state_can_run(&s_network_retry, now_ms)) {
        return;
    }

    // Keep the LTE FSM hot each pass; it owns dial-up, registration, PDP, and modem recovery sequencing.
    modem_lte_request_connect();
    esp_err_t err = modem_lte_tick(now_ms);
    bool lte_now_initialized = modem_lte_is_initialized();
    if (err == ESP_ERR_NOT_FINISHED) {
        state_machine_try_start_gnss_nonblocking();
        return;
    }
    if (err != ESP_OK) {
        s_prev_lte_initialized = false;
        state_machine_schedule_network_retry(now_ms, "modem_lte_tick", err);
        return;
    }

    // GNSS startup is decoupled from LTE so location can warm while PDP/MQTT continue.
    state_machine_try_start_gnss_nonblocking();

#if !TRACKER_MQTT_RUNTIME_DISABLED
    if (lte_now_initialized && (!s_mqtt_started || !tracker_mqtt_is_connected())) {
        // MQTT connection only starts once LTE is up; otherwise failures would mix transport and broker states together.
        err = tracker_mqtt_connect();
        if (err != ESP_OK) {
            state_machine_schedule_network_retry(now_ms, "tracker_mqtt_connect", err);
            return;
        }
        s_mqtt_started = true;
    }
#endif

    retry_state_reset(&s_network_retry);
    if (lte_now_initialized && !s_prev_lte_initialized) {
        if (s_lte_ever_initialized) {
            // LTE recovery after an earlier outage can leave GNSS unpowered, so explicitly reassert it on the rising edge.
            (void)state_machine_try_reassert_gnss_power("lte_recovered");
        }
        s_lte_ever_initialized = true;
    }
    s_prev_lte_initialized = lte_now_initialized;

#if !TRACKER_MQTT_RUNTIME_DISABLED
    if (s_config.command_subscribe_enabled && tracker_mqtt_is_connected()) {
        // Command subscription is retried separately so publish-path recovery is not blocked by one failed SUB command.
        err = tracker_mqtt_subscribe_commands();
        if (err == ESP_ERR_NOT_FINISHED) {
            return;
        }
        if (err != ESP_OK) {
            state_machine_schedule_network_retry(now_ms, "tracker_mqtt_subscribe_commands", err);
            return;
        }
    }
#endif

    // Deferred firmware status flush is attempted only after LTE/MQTT path is known-good for this iteration.
    state_machine_try_flush_deferred_firmware_report();
    retry_state_reset(&s_network_retry);
}

/**
 * @brief Run the full wake-prelude service loop for a single FSM iteration.
 *
 * The prelude centralizes:
 * - pending command/action handling
 * - asynchronous BLE connect completion
 * - LTE/MQTT/GNSS bootstrap and recovery
 * - RTC and IMU bootstrap
 * - telemetry refresh
 * - optional offline replay once the publish path is online
 *
 * @param[in] allow_replay True to let the offline queue drain during this pass.
 */
void state_machine_run_wake_prelude(bool allow_replay) {
    state_machine_handle_pending_action();
    bool ble_result_handled = state_machine_handle_ble_connect_result();
    bool modem_ready = state_machine_wakeup_low_power_modem_if_needed();
    if (modem_ready) {
        state_machine_try_connect_network();
    }
    state_machine_try_connect_ble();
    state_machine_bootstrap_rtc();
    state_machine_bootstrap_imu();
    state_machine_refresh_telemetry(modem_ready, true);
    ble_result_handled = state_machine_handle_ble_connect_result() || ble_result_handled;
    if (ble_result_handled && s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx)) {
        state_machine_refresh_telemetry(modem_ready, true);
    }

    state_machine_handle_pending_action();
    offline_queue_set_online(modem_ready && tracker_mqtt_is_connected());
    if (allow_replay) {
        offline_queue_replay_tick();
    }
}
