#include "state_wake_prelude.h"

#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"

#include "adc_reader.h"
#include "ble_obd.h"
#include "imu_lis3dh.h"
#include "modem_gnss.h"
#include "modem_lte.h"
#include "mqtt_client.h"
#include "offline_queue.h"
#include "rtc_ds3231m.h"
#include "state_machine_internal.h"
#include "state_obd_runtime.h"
#include "state_ota_runtime.h"
#include "state_publish_pipeline.h"
#include "state_runtime_context.h"
#include "util.h"

/**
 * @file state_wake_prelude.c
 * @brief Wake/bootstrap/network/telemetry helpers for the tracker FSM.
 */

static const char *TAG = STATE_MACHINE_TAG;

static bool state_machine_try_rearm_gnss(const char *reason) {
    uint64_t now_ms = util_uptime_ms();
    if (s_last_gnss_rearm_ms != 0 && (now_ms - s_last_gnss_rearm_ms) < TRACKER_GNSS_REARM_COOLDOWN_MS) {
        return false;
    }

    s_last_gnss_rearm_ms = now_ms;
    esp_err_t off_err = modem_gnss_power_off();
    esp_err_t on_err = modem_gnss_power_on();
    if (off_err == ESP_OK && on_err == ESP_OK) {
        s_gnss_started = true;
        s_gnss_poll_fail_streak = 0;
        ESP_LOGW(TAG, "GNSS re-armed reason=%s", reason);
        return true;
    }

    ESP_LOGW(TAG,
             "GNSS re-arm failed reason=%s off=%s on=%s",
             reason,
             esp_err_to_name(off_err),
             esp_err_to_name(on_err));
    return false;
}

static bool state_machine_try_reassert_gnss_power(const char *reason) {
    uint64_t now_ms = util_uptime_ms();
    if (s_last_gnss_rearm_ms != 0 && (now_ms - s_last_gnss_rearm_ms) < TRACKER_GNSS_REARM_COOLDOWN_MS) {
        return false;
    }

    s_last_gnss_rearm_ms = now_ms;
    esp_err_t on_err = modem_gnss_power_on();
    if (on_err == ESP_OK) {
        s_gnss_started = true;
        s_gnss_poll_fail_streak = 0;
        ESP_LOGW(TAG, "GNSS power reasserted reason=%s", reason);
        return true;
    }

    ESP_LOGW(TAG,
             "GNSS power reassert failed reason=%s on=%s",
             reason,
             esp_err_to_name(on_err));
    return false;
}

bool state_machine_can_poll_gnss(void) {
    return s_gnss_started && modem_lte_is_initialized() && modem_gnss_is_query_ready();
}

void state_machine_try_start_gnss_nonblocking(void) {
    if (s_gnss_started || !modem_lte_is_initialized()) {
        return;
    }

    uint64_t now_ms = util_uptime_ms();
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
        ESP_LOGI(TAG, "GNSS power-on OK");
        return;
    }

    ESP_LOGW(TAG,
             "GNSS power-on failed err=%s (continue publish path without GNSS)",
             esp_err_to_name(err));
}

void state_machine_bootstrap_rtc(void) {
    if (s_hw_bootstrap_done || !rtc_ds3231m_is_available()) {
        return;
    }

    uint64_t now_ms = util_uptime_ms();
    if (!retry_state_can_run(&s_rtc_bootstrap_retry, now_ms)) {
        return;
    }

    uint64_t rtc_ms = 0;
    if (rtc_ds3231m_get_time_ms(&rtc_ms) == ESP_OK && rtc_ds3231m_is_time_valid_ms(rtc_ms)) {
        s_hw_bootstrap_done = true;
        retry_state_reset(&s_rtc_bootstrap_retry);
        return;
    }

    uint64_t fallback_ms = s_telemetry.gnss.fix_valid && rtc_ds3231m_is_time_valid_ms(s_telemetry.gnss.timestamp_ms)
                               ? s_telemetry.gnss.timestamp_ms
                               : 1735689600000ULL;
    if (rtc_ds3231m_set_time_ms(fallback_ms) == ESP_OK) {
        uint64_t verify_ms = 0;
        if (rtc_ds3231m_get_time_ms(&verify_ms) == ESP_OK && rtc_ds3231m_is_time_valid_ms(verify_ms)) {
            ESP_LOGI(TAG,
                     "RTC bootstrap OK set=%llu read=%llu",
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
                 "retry step=rtc_bootstrap err=%s attempt=%lu next_delay_ms=%lu",
                 esp_err_to_name(ESP_FAIL),
                 (unsigned long)s_rtc_bootstrap_retry.attempts,
                 (unsigned long)delay_ms);
    }
}

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
            ESP_LOGW(TAG, "imu_configure_motion_interrupt failed: %s", esp_err_to_name(motion_cfg_err));
        } else {
            ESP_LOGI(TAG, "IMU bootstrap ready (motion interrupt configured)");
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
             "retry step=imu_init err=%s attempt=%lu next_delay_ms=%lu",
             esp_err_to_name(imu_err),
             (unsigned long)s_imu_bootstrap_retry.attempts,
             (unsigned long)delay_ms);
}

void state_machine_refresh_telemetry(bool read_gnss, bool read_obd) {
    float vehicle_battery_raw_v = adc_read_vehicle_battery_voltage();
    float device_battery_raw_v = adc_read_device_battery_voltage();
    s_telemetry.vehicle_battery = vehicle_battery_raw_v * TRACKER_ADC_SUPPLY_CALIB_GAIN;
    s_telemetry.device_battery = device_battery_raw_v * TRACKER_ADC_BATT_CALIB_GAIN;
    s_telemetry.vibration = s_imu_available ? imu_get_vibration_composite() : 0;

    if (read_obd && s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx)) {
        uint64_t now_ms = util_uptime_ms();
        size_t diag_query_count = 0;
        const tracker_obd_diag_query_t *diag_queries = state_machine_obd_diagnostic_queries(&diag_query_count);

        if ((now_ms - s_last_obd_poll_ms) >= TRACKER_OBD_POLL_INTERVAL_MS) {
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
            const tracker_obd_diag_query_t *diag_query =
                &diag_queries[s_obd_diag_query_cursor % diag_query_count];
            state_machine_run_obd_diagnostic_query(s_ble_ctx, diag_query);
            s_obd_diag_query_cursor = (uint8_t)((s_obd_diag_query_cursor + 1U) % diag_query_count);
            s_last_obd_diagnostic_poll_ms = now_ms;
        }

        if ((now_ms - s_last_obd_debug_log_ms) >= TRACKER_OBD_DEBUG_LOG_INTERVAL_MS) {
            ESP_LOGD(TAG,
                     "OBD pid-values rpm=%ld speed=%ld coolant=%ld fuel=%ld load=%ld mil=%d dtc=%u/%u/%u",
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
        uint64_t now_ms = util_uptime_ms();
        if (s_last_gnss_poll_ms != 0 && (now_ms - s_last_gnss_poll_ms) < TRACKER_GNSS_POLL_INTERVAL_MS) {
            goto telemetry_finalize;
        }

        s_last_gnss_poll_ms = now_ms;
        gnss_data_t gnss = {0};
        if (modem_gnss_get_location(&gnss) == ESP_OK) {
            s_telemetry.gnss = gnss;
            s_gnss_poll_fail_streak = 0;
        } else {
            s_gnss_poll_fail_streak += 1;
            if (s_gnss_poll_fail_streak >= TRACKER_GNSS_FAIL_REARM_THRESHOLD &&
                state_machine_try_rearm_gnss("poll_fail_threshold")) {
                s_gnss_poll_fail_streak = 0;
            }
        }
    }

telemetry_finalize:
    if (s_telemetry.gnss.timestamp_ms == 0) {
        s_telemetry.gnss.timestamp_ms = util_uptime_ms();
    }

    uint64_t now_ms = util_uptime_ms();
    bool obd_connected = s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx);
    const char *obd_ecu_state = obd_connected ? ble_obd_get_last_ecu_state_label(s_ble_ctx) : "disconnected";
    s_telemetry.obd_ble_connected = obd_connected;
    s_telemetry.obd_elm_ready = s_obd_elm_ready && obd_connected;
    util_copy_string(s_telemetry.obd_ecu_state, sizeof(s_telemetry.obd_ecu_state), obd_ecu_state);

    bool obd_signal_fresh =
        s_telemetry.obd_elm_ready &&
        state_machine_has_recent_obd_sample(now_ms, TRACKER_OBD_LIVE_SIGNAL_MAX_AGE_MS);
    if (!obd_signal_fresh) {
        state_machine_clear_obd_signal_snapshot();
    }

    if (s_last_obd_sample_ms == 0 || now_ms < s_last_obd_sample_ms) {
        s_telemetry.obd_sample_age_ms = UINT32_MAX;
    } else {
        uint64_t age_ms = now_ms - s_last_obd_sample_ms;
        s_telemetry.obd_sample_age_ms = age_ms > UINT32_MAX ? UINT32_MAX : (uint32_t)age_ms;
    }

    float ignition_threshold_v = (float)s_config.ignition_adc_threshold_mv / 1000.0f;
    bool adc_ignition = s_telemetry.vehicle_battery >= ignition_threshold_v;
    bool obd_live_ignition = obd_connected &&
                             strcmp(obd_ecu_state, "live") == 0 &&
                             state_machine_has_recent_obd_sample(now_ms, TRACKER_IGNITION_OBD_LIVE_SAMPLE_MAX_AGE_MS);
    bool rpm_ignition = obd_live_ignition && s_telemetry.obd_rpm > 0;
    bool ignition_next = rpm_ignition || adc_ignition || obd_live_ignition;
    if (!s_ignition_log_initialized || ignition_next != s_last_ignition_state) {
        ESP_LOGI(TAG,
                 "ignition transition prev=%d next=%d rpm=%ld adc=%d vehicle_battery=%.2f threshold=%.2f obd_live=%d sample_age_ms=%lu ecu=%s",
                 s_ignition_log_initialized ? (s_last_ignition_state ? 1 : 0) : -1,
                 ignition_next ? 1 : 0,
                 (long)s_telemetry.obd_rpm,
                 adc_ignition ? 1 : 0,
                 s_telemetry.vehicle_battery,
                 ignition_threshold_v,
                 obd_live_ignition ? 1 : 0,
                 (unsigned long)s_telemetry.obd_sample_age_ms,
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
        UBaseType_t stack_hwm_words = uxTaskGetStackHighWaterMark(NULL);
        ESP_LOGI(TAG,
                "HW diag vehicle_battery=%.2fV device_battery=%.2fV ign=%d vibration=%u lte=%d mqtt=%d ble=%d gnss_fix=%d stack_hwm_words=%lu",
                 s_telemetry.vehicle_battery,
                 s_telemetry.device_battery,
                 s_telemetry.ignition ? 1 : 0,
                 (unsigned)s_telemetry.vibration,
                 modem_lte_is_connected() ? 1 : 0,
                 tracker_mqtt_is_connected() ? 1 : 0,
                 obd_connected ? 1 : 0,
                 s_telemetry.gnss.fix_valid ? 1 : 0,
                 (unsigned long)stack_hwm_words);
        s_last_hw_diag_log_ms = now_ms;
    }
}

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
             "retry step=rtc_read err=%s attempt=%lu next_delay_ms=%lu",
             esp_err_to_name(ESP_FAIL),
             (unsigned long)s_rtc_read_retry.attempts,
             (unsigned long)delay_ms);
    return false;
}

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

static void state_machine_schedule_network_retry(uint64_t now_ms, const char *step, esp_err_t err) {
    uint32_t delay_ms = retry_state_current_delay_ms(&s_network_retry, &g_state_network_retry_policy, now_ms);
    if (retry_state_schedule(&s_network_retry, &g_state_network_retry_policy, now_ms, err) != ESP_OK) {
        return;
    }

    ESP_LOGE(TAG,
             "retry step=%s err=%s attempt=%lu next_delay_ms=%lu",
             step,
             esp_err_to_name(err),
             (unsigned long)s_network_retry.attempts,
             (unsigned long)delay_ms);
}

static void state_machine_try_connect_network(void) {
    uint64_t now_ms = util_uptime_ms();
    if (!retry_state_can_run(&s_network_retry, now_ms)) {
        return;
    }

    modem_lte_request_connect();
    esp_err_t err = modem_lte_tick(now_ms);
    bool lte_now_initialized = modem_lte_is_initialized();
    if (err == ESP_ERR_NOT_FINISHED) {
        return;
    }
    if (err != ESP_OK) {
        s_prev_lte_initialized = false;
        state_machine_schedule_network_retry(now_ms, "modem_lte_tick", err);
        return;
    }

    if (lte_now_initialized) {
        state_machine_try_start_gnss_nonblocking();
    }

#if !TRACKER_MQTT_RUNTIME_DISABLED
    if (lte_now_initialized && (!s_mqtt_started || !tracker_mqtt_is_connected())) {
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
            (void)state_machine_try_reassert_gnss_power("lte_recovered");
        }
        s_lte_ever_initialized = true;
    }
    s_prev_lte_initialized = lte_now_initialized;

#if !TRACKER_MQTT_RUNTIME_DISABLED
    if (s_config.command_subscribe_enabled && tracker_mqtt_is_connected()) {
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

    state_machine_try_flush_deferred_firmware_report();
    retry_state_reset(&s_network_retry);
}

void state_machine_run_wake_prelude(bool allow_replay) {
    state_machine_handle_pending_action();
    bool ble_result_handled = state_machine_handle_ble_connect_result();
    state_machine_try_connect_network();
    state_machine_try_connect_ble();
    state_machine_bootstrap_rtc();
    state_machine_bootstrap_imu();
    state_machine_refresh_telemetry(true, true);
    ble_result_handled = state_machine_handle_ble_connect_result() || ble_result_handled;
    if (ble_result_handled && s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx)) {
        state_machine_refresh_telemetry(true, true);
    }

    state_machine_handle_pending_action();
    offline_queue_set_online(tracker_mqtt_is_connected());
    if (allow_replay) {
        offline_queue_replay_tick();
    }
}
