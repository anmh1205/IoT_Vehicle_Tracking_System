#include "state_machine_core.h"

#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"

#include "driver/gpio.h"

#include "esp_log.h"
#include "sdkconfig.h"

#include "adc_reader.h"
#include "command_handler.h"
#include "imu_lis3dh.h"
#include "modem_lte.h"
#include "mqtt_client.h"
#include "nvs_config.h"
#include "offline_queue.h"
#include "pin_map.h"
#include "power_mgr.h"
#include "rtc_ds3231m.h"
#include "session_mgr.h"
#include "state_machine_internal.h"
#include "state_obd_runtime.h"
#include "state_ota_runtime.h"
#include "state_publish_pipeline.h"
#include "state_runtime_context.h"
#include "state_sleep_controller.h"
#include "state_wake_prelude.h"
#include "telemetry_counters.h"
#include "util.h"

/**
 * @file state_machine_core.c
 * @brief Core tracker FSM orchestration and shared runtime-policy helpers.
 */

RTC_DATA_ATTR rtc_context_t g_rtc_context = {
    .last_state = APP_STATE_INIT,
    .boot_count = 0,
    .last_heartbeat_ts = 0,
    .ble_mac = {0},
    .ign_last_known = false,
    .last_battery_v = 0.0f,
    .ota_confirm_deadline_ms = 0,
};

static const char *TAG = STATE_MACHINE_TAG;
static uint64_t s_state_entered_ms = 0;
static uint64_t s_last_health_snapshot_log_ms = 0;

#ifndef CONFIG_APP_PROJECT_VER
#define CONFIG_APP_PROJECT_VER "unknown"
#endif
#ifndef CONFIG_TRACKER_FIELD_VALIDATION_MODE
#define CONFIG_TRACKER_FIELD_VALIDATION_MODE 0
#endif

#define TRACKER_HEALTH_SNAPSHOT_INTERVAL_MS 60000ULL

static void state_machine_command_callback(const char *topic, const char *payload) {
    (void)topic;
    command_handler_process(payload);
}

uint64_t state_machine_tracking_interval_ms(void) {
    return (uint64_t)s_config.tracking_interval_s * 1000ULL;
}

uint64_t state_machine_alarm_interval_ms(void) {
    return (uint64_t)s_config.alarm_interval_s * 1000ULL;
}

uint64_t state_machine_alarm_timeout_ms(void) {
    return (uint64_t)s_config.alarm_timeout_s * 1000ULL;
}

bool state_machine_should_throttle_rawdata(void) {
    return !tracker_mqtt_is_connected() && offline_queue_should_throttle_rawdata();
}

uint64_t state_machine_ignition_off_hold_ms(void) {
    return (uint64_t)s_config.ignition_off_hold_ms;
}

uint16_t state_machine_parked_wake_interval_s(void) {
    return s_config.heartbeat_interval_s > TRACKER_PARKED_WAKE_INTERVAL_CAP_S
               ? TRACKER_PARKED_WAKE_INTERVAL_CAP_S
               : s_config.heartbeat_interval_s;
}

bool state_machine_imu_runtime_enabled(void) {
    return s_config.imu_wakeup_enabled;
}

bool state_machine_has_recent_obd_sample(uint64_t now_ms, uint32_t max_age_ms) {
    if (s_last_obd_sample_ms == 0 || now_ms < s_last_obd_sample_ms) {
        return false;
    }
    return (now_ms - s_last_obd_sample_ms) <= (uint64_t)max_age_ms;
}

static tracker_motion_state_t state_machine_resolve_motion_state(uint64_t now_ms) {
    if (s_telemetry.gnss.fix_valid) {
        return s_telemetry.gnss.speed_kmh > 3.0f ? TRACKER_MOTION_STATE_MOVING
                                                 : TRACKER_MOTION_STATE_STATIONARY;
    }
    if (s_telemetry.obd_elm_ready &&
        state_machine_has_recent_obd_sample(now_ms, TRACKER_IGNITION_OBD_LIVE_SAMPLE_MAX_AGE_MS)) {
        return s_telemetry.obd_speed > 3 ? TRACKER_MOTION_STATE_MOVING
                                         : TRACKER_MOTION_STATE_STATIONARY;
    }
    return s_telemetry.ignition ? TRACKER_MOTION_STATE_UNKNOWN : TRACKER_MOTION_STATE_STATIONARY;
}

static tracker_vehicle_state_t state_machine_resolve_vehicle_state(tracker_ignition_state_t ignition_state,
                                                                   tracker_motion_state_t motion_state) {
    if (ignition_state == TRACKER_IGNITION_STATE_ON && motion_state == TRACKER_MOTION_STATE_MOVING) {
        return TRACKER_VEHICLE_STATE_MOVING_ON;
    }
    if (ignition_state == TRACKER_IGNITION_STATE_ON && motion_state == TRACKER_MOTION_STATE_STATIONARY) {
        return TRACKER_VEHICLE_STATE_IDLING_ON;
    }
    if (ignition_state == TRACKER_IGNITION_STATE_OFF && motion_state == TRACKER_MOTION_STATE_MOVING) {
        return TRACKER_VEHICLE_STATE_ROLLING_IGN_OFF;
    }
    if (ignition_state == TRACKER_IGNITION_STATE_OFF && motion_state == TRACKER_MOTION_STATE_STATIONARY) {
        return TRACKER_VEHICLE_STATE_PARKED_OFF;
    }
    if (motion_state == TRACKER_MOTION_STATE_MOVING) {
        return TRACKER_VEHICLE_STATE_UNKNOWN_MOVING;
    }
    if (motion_state == TRACKER_MOTION_STATE_STATIONARY) {
        return TRACKER_VEHICLE_STATE_UNKNOWN_STATIONARY;
    }
    return TRACKER_VEHICLE_STATE_UNKNOWN;
}

static tracker_device_state_t state_machine_resolve_device_state(app_state_t app_state) {
    switch (app_state) {
        case APP_STATE_INIT:
            return TRACKER_DEVICE_STATE_BOOTING;
        case APP_STATE_CHECK_IGN:
            return TRACKER_DEVICE_STATE_WAKING;
        case APP_STATE_DRIVING:
        case APP_STATE_HEARTBEAT:
            return TRACKER_DEVICE_STATE_ACTIVE;
        case APP_STATE_PARKED:
            return TRACKER_DEVICE_STATE_SLEEP_PREPARE;
        case APP_STATE_ALARM:
            return TRACKER_DEVICE_STATE_ALARM;
        case APP_STATE_SLEEP:
            return TRACKER_DEVICE_STATE_SLEEPING;
        default:
            return TRACKER_DEVICE_STATE_ACTIVE;
    }
}

void state_machine_sync_runtime_axes(app_state_t app_state) {
    uint64_t now_ms = util_uptime_ms();
    s_telemetry.ignition_state = s_telemetry.ignition ? TRACKER_IGNITION_STATE_ON
                                                      : TRACKER_IGNITION_STATE_OFF;
    s_telemetry.motion_state = state_machine_resolve_motion_state(now_ms);
    s_telemetry.vehicle_state =
        state_machine_resolve_vehicle_state(s_telemetry.ignition_state, s_telemetry.motion_state);
    s_telemetry.device_state = state_machine_resolve_device_state(app_state);
    s_telemetry.sleep_mode = state_machine_resolve_sleep_mode(app_state);
}

bool state_machine_network_ready_for_heartbeat_publish(void) {
#if TRACKER_MQTT_RUNTIME_DISABLED
    return modem_lte_is_initialized() || s_network_retry.attempts > 0;
#else
    return tracker_mqtt_is_connected() || s_network_retry.attempts > 0;
#endif
}

static const char *state_machine_app_state_name(app_state_t state) {
    switch (state) {
        case APP_STATE_INIT:
            return "init";
        case APP_STATE_CHECK_IGN:
            return "check_ign";
        case APP_STATE_DRIVING:
            return "driving";
        case APP_STATE_PARKED:
            return "parked";
        case APP_STATE_ALARM:
            return "alarm";
        case APP_STATE_HEARTBEAT:
            return "heartbeat";
        case APP_STATE_SLEEP:
            return "sleep";
        default:
            return "unknown";
    }
}

static const char *state_machine_transition_reason(app_state_t from, app_state_t to) {
    if (from == APP_STATE_INIT && to == APP_STATE_CHECK_IGN) {
        return "boot_ready";
    }
    if (from == APP_STATE_CHECK_IGN && to == APP_STATE_DRIVING) {
        return "ignition_stable_on";
    }
    if (from == APP_STATE_CHECK_IGN && to == APP_STATE_PARKED) {
        return "ignition_stable_off";
    }
    if (from == APP_STATE_DRIVING && to == APP_STATE_PARKED) {
        return "ignition_off_hold_elapsed";
    }
    if (from == APP_STATE_PARKED && to == APP_STATE_HEARTBEAT) {
        return "parked_heartbeat_start";
    }
    if (from == APP_STATE_ALARM && to == APP_STATE_DRIVING) {
        return "ignition_on_during_alarm";
    }
    if (from == APP_STATE_ALARM && to == APP_STATE_PARKED) {
        return "alarm_window_done";
    }
    if (from == APP_STATE_HEARTBEAT && to == APP_STATE_SLEEP) {
        return "heartbeat_window_done";
    }
    if (from == APP_STATE_SLEEP && to == APP_STATE_CHECK_IGN) {
        return "sleep_blocked";
    }
    if (from == APP_STATE_SLEEP && to != APP_STATE_SLEEP) {
        return "wake_after_sleep";
    }
    return "handler_decision";
}

static void state_machine_log_health_snapshot(uint64_t now_ms, bool force) {
#if CONFIG_TRACKER_FIELD_VALIDATION_MODE
    bool due = force || s_last_health_snapshot_log_ms == 0 ||
               (now_ms - s_last_health_snapshot_log_ms) >= TRACKER_HEALTH_SNAPSHOT_INTERVAL_MS;
    if (!due) {
        return;
    }

    telemetry_counters_t counters = telemetry_counters_get();
    ESP_LOGI(TAG,
             "health snapshot uptime_s=%llu state=%s mqtt_connected=%d mqtt_ok=%lu mqtt_fail=%lu mqtt_fallback=%lu queue_depth=%lu replay_ok=%lu replay_retry=%lu replay_drop=%lu sd_fail=%lu quota_hit=%lu lte_recovery_start=%lu lte_recovery_ok=%lu lte_recovery_fail=%lu obd_ok=%lu obd_timeout=%lu obd_invalid=%lu ota_http_start=%lu ota_http_ok=%lu ota_http_fail=%lu",
             (unsigned long long)(now_ms / 1000ULL),
             state_machine_app_state_name(s_runtime_state_hint),
             tracker_mqtt_is_connected() ? 1 : 0,
             (unsigned long)counters.mqtt_publish_ok,
             (unsigned long)counters.mqtt_publish_fail,
             (unsigned long)counters.mqtt_publish_fallback,
             (unsigned long)offline_queue_depth(),
             (unsigned long)counters.replay_success,
             (unsigned long)counters.replay_retry,
             (unsigned long)counters.replay_drop,
             (unsigned long)counters.sd_write_fail,
             (unsigned long)counters.quota_hit,
             (unsigned long)counters.lte_recovery_start,
             (unsigned long)counters.lte_recovery_success,
             (unsigned long)counters.lte_recovery_fail,
             (unsigned long)counters.obd_read_ok,
             (unsigned long)counters.obd_timeout,
             (unsigned long)counters.obd_invalid_response,
             (unsigned long)counters.ota_http_start,
             (unsigned long)counters.ota_http_success,
             (unsigned long)counters.ota_http_fail);
    s_last_health_snapshot_log_ms = now_ms;
#else
    (void)now_ms;
    (void)force;
#endif
}

static void state_machine_log_transition(app_state_t from, app_state_t to, uint64_t now_ms) {
    if (from == to) {
        return;
    }

    uint64_t dwell_ms = s_state_entered_ms == 0 || now_ms < s_state_entered_ms ? 0 : now_ms - s_state_entered_ms;
    ESP_LOGI(TAG,
             "state transition from=%s to=%s reason=%s dwell_ms=%llu",
             state_machine_app_state_name(from),
             state_machine_app_state_name(to),
             state_machine_transition_reason(from, to),
             (unsigned long long)dwell_ms);
    s_state_entered_ms = now_ms;
    g_rtc_context.last_state = to;
}

bool state_machine_ota_start_is_safe(void) {
    if (!tracker_mqtt_is_connected()) {
        ESP_LOGW(TAG, "OTA blocked reason=mqtt_not_connected");
        return false;
    }
    if (s_telemetry.device_battery <= 0.0f) {
        ESP_LOGW(TAG, "OTA blocked reason=device_battery_unavailable");
        return false;
    }

    float threshold_v = (float)s_config.ota_min_battery_mv / 1000.0f;
    if (s_telemetry.device_battery < threshold_v) {
        ESP_LOGW(TAG,
                 "OTA blocked reason=device_battery_unsafe device_battery=%.2f threshold=%.2f",
                 (double)s_telemetry.device_battery,
                 (double)threshold_v);
        return false;
    }
    return true;
}

static void state_machine_set_user_led(bool on) {
    if (PIN_USER_LED == GPIO_NUM_NC) {
        return;
    }

#if TRACKER_USER_LED_ACTIVE_LEVEL
    gpio_set_level(PIN_USER_LED, on ? 1 : 0);
#else
    gpio_set_level(PIN_USER_LED, on ? 0 : 1);
#endif
}

static void state_machine_update_user_led(void) {
    if (PIN_USER_LED == GPIO_NUM_NC) {
        return;
    }
    if (!s_user_led_initialized) {
        gpio_config_t user_led_cfg = {
            .pin_bit_mask = (1ULL << (uint32_t)PIN_USER_LED),
            .mode = GPIO_MODE_OUTPUT,
            .pull_up_en = GPIO_PULLUP_DISABLE,
            .pull_down_en = GPIO_PULLDOWN_DISABLE,
            .intr_type = GPIO_INTR_DISABLE,
        };
        ESP_ERROR_CHECK(gpio_config(&user_led_cfg));
        s_user_led_initialized = true;
        s_user_led_cycle_started_ms = util_uptime_ms();
        state_machine_set_user_led(false);
        ESP_LOGI(TAG,
                 "User LED initialized pin=%d active_level=%d blink_period_ms=%llu on_ms=%llu",
                 (int)PIN_USER_LED,
                 (int)TRACKER_USER_LED_ACTIVE_LEVEL,
                 (unsigned long long)TRACKER_USER_LED_BLINK_PERIOD_MS,
                 (unsigned long long)TRACKER_USER_LED_ON_MS);
    }

    uint64_t now_ms = util_uptime_ms();
    if (s_user_led_cycle_started_ms == 0 || now_ms < s_user_led_cycle_started_ms) {
        s_user_led_cycle_started_ms = now_ms;
    }
    while ((now_ms - s_user_led_cycle_started_ms) >= TRACKER_USER_LED_BLINK_PERIOD_MS) {
        s_user_led_cycle_started_ms += TRACKER_USER_LED_BLINK_PERIOD_MS;
    }
    state_machine_set_user_led((now_ms - s_user_led_cycle_started_ms) < TRACKER_USER_LED_ON_MS);
}

uint32_t state_machine_next_seq_no(void) {
    s_metadata_seq_no += 1U;
    if (s_metadata_seq_no == 0U) {
        s_metadata_seq_no = 1U;
    }
    return s_metadata_seq_no;
}

void state_machine_fill_message_id(char *out, size_t out_size) {
    util_generate_uuid_v4(out, out_size);
}

void state_machine_init_boot_metadata(void) {
    util_generate_boot_id(s_boot_id, sizeof(s_boot_id), g_rtc_context.boot_count);
    s_metadata_seq_no = 0;
    ESP_LOGI(TAG,
             "metadata boot initialized boot_id=%s boot_count=%lu",
             s_boot_id,
             (unsigned long)g_rtc_context.boot_count);
}

static app_state_t state_machine_handle_check_ign_state(void) {
    s_runtime_state_hint = APP_STATE_CHECK_IGN;
    if (!s_startup_system_check_log_once) {
        ESP_LOGI(TAG, "Startup system check: ADC/BLE/RTC/LTE/MQTT");
        s_startup_system_check_log_once = true;
    }

    state_machine_run_wake_prelude(false);
    session_mgr_on_ignition_sample(s_telemetry.ignition, util_uptime_ms());
    if (!session_mgr_has_stable_ignition()) {
        return APP_STATE_CHECK_IGN;
    }

    g_rtc_context.ign_last_known = session_mgr_stable_ignition();
    return session_mgr_stable_ignition() ? APP_STATE_DRIVING : APP_STATE_PARKED;
}

static app_state_t state_machine_handle_driving_state(void) {
    s_runtime_state_hint = APP_STATE_DRIVING;
    state_machine_run_wake_prelude(true);
    session_mgr_on_ignition_sample(s_telemetry.ignition, util_uptime_ms());
    if (session_mgr_should_start()) {
        session_mgr_mark_started();
        s_session_id = session_mgr_current_session_id();
        offline_queue_set_session(s_session_id);
    }

    if (s_publish_status != TRACKER_PUBLISH_STATUS_RUNNING) {
        state_machine_publish_status("running");
        s_publish_status = TRACKER_PUBLISH_STATUS_RUNNING;
    }

    uint64_t now_ms = util_uptime_ms();
    bool should_publish_raw = ((now_ms - s_last_raw_publish_ms) >= state_machine_tracking_interval_ms()) ||
                              command_handler_consume_location_request();
    if (should_publish_raw && !state_machine_should_throttle_rawdata()) {
        state_machine_publish_rawdata();
    }

    if (modem_lte_is_initialized()) {
        state_machine_try_connect_ble();
    }

    bool debounced_ignition_on =
        session_mgr_has_stable_ignition() ? session_mgr_stable_ignition() : s_telemetry.ignition;
    bool ignition_active = debounced_ignition_on && command_handler_is_tracking_enabled();
    if (!ignition_active && s_ignition_off_started_ms == 0) {
        s_ignition_off_started_ms = now_ms;
        state_machine_publish_status("stopped");
        s_publish_status = TRACKER_PUBLISH_STATUS_STOPPED;
    }
    if (ignition_active) {
        s_ignition_off_started_ms = 0;
    }
    if (s_ignition_off_started_ms != 0 &&
        (now_ms - s_ignition_off_started_ms) >= state_machine_ignition_off_hold_ms()) {
        offline_queue_stop_session(true);
        session_mgr_mark_stopped();
        s_ignition_off_started_ms = 0;
        return APP_STATE_PARKED;
    }
    return APP_STATE_DRIVING;
}

static app_state_t state_machine_handle_alarm_state(void) {
    s_runtime_state_hint = APP_STATE_ALARM;
    state_machine_run_wake_prelude(true);
    if (s_alarm_enter_ms == 0) {
        s_alarm_enter_ms = util_uptime_ms();
        s_imu_wake_count += 1U;
        state_machine_publish_event("warning", 1001, "motion_detected");
    }

    uint64_t now_ms = util_uptime_ms();
    if ((now_ms - s_last_raw_publish_ms) >= state_machine_alarm_interval_ms()) {
        state_machine_publish_rawdata();
    }
    if (modem_lte_is_initialized()) {
        state_machine_try_connect_ble();
    }
    if (s_telemetry.ignition) {
        s_alarm_enter_ms = 0;
        return APP_STATE_DRIVING;
    }

    bool alarm_timeout = (now_ms - s_alarm_enter_ms) >= state_machine_alarm_timeout_ms();
    if (!state_machine_imu_runtime_enabled() || !s_imu_available || !imu_motion_detected() || alarm_timeout) {
        if (!alarm_timeout) {
            s_imu_false_wake_count += 1U;
        }
        s_alarm_enter_ms = 0;
        return APP_STATE_PARKED;
    }
    return APP_STATE_ALARM;
}

static app_state_t state_machine_handle_heartbeat_state(void) {
    s_runtime_state_hint = APP_STATE_HEARTBEAT;
    if (s_heartbeat_started_ms == 0) {
        s_heartbeat_started_ms = util_uptime_ms();
        s_heartbeat_raw_published = false;
        s_timer_wake_count += 1U;
    }

    state_machine_run_wake_prelude(false);
    uint64_t now_ms = util_uptime_ms();
    bool heartbeat_timeout = (now_ms - s_heartbeat_started_ms) >= TRACKER_HEARTBEAT_ACTIVE_WINDOW_MS;
    bool obd_connected = s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx);
    bool gnss_publish_ready = !s_gnss_started || s_telemetry.gnss.fix_valid || heartbeat_timeout;
    bool network_ready = state_machine_network_ready_for_heartbeat_publish();
    if (!s_heartbeat_raw_published &&
        (!s_ble_connect_inflight || heartbeat_timeout) &&
        (network_ready || heartbeat_timeout) &&
        gnss_publish_ready) {
        if (!state_machine_should_throttle_rawdata()) {
            state_machine_publish_rawdata();
        } else {
            ESP_LOGW(TAG, "heartbeat rawdata throttled while offline queue is near quota; publishing status only");
        }

        if (!state_machine_has_recent_obd_sample(now_ms, TRACKER_HEARTBEAT_OBD_STALE_WARN_MS)) {
            if (strcmp(s_telemetry.obd_ecu_state, "stopped") == 0) {
                ESP_LOGI(TAG,
                         "heartbeat publish without fresh OBD sample because ECU state=%s",
                         s_telemetry.obd_ecu_state);
            } else {
                ESP_LOGW(TAG,
                         "heartbeat publish without fresh OBD sample connected=%d state=%s age_ms=%lu",
                         obd_connected ? 1 : 0,
                         s_telemetry.obd_ecu_state,
                         (unsigned long)s_telemetry.obd_sample_age_ms);
            }
        }

        state_machine_publish_status("heartbeat");
        s_heartbeat_raw_published = true;
    }

    if (s_heartbeat_raw_published || heartbeat_timeout) {
        s_heartbeat_started_ms = 0;
        s_heartbeat_raw_published = false;
        return APP_STATE_SLEEP;
    }
    return APP_STATE_HEARTBEAT;
}

static app_state_t state_machine_handle_sleep_state(void) {
    s_runtime_state_hint = APP_STATE_SLEEP;
    (void)state_machine_handle_ble_connect_result();

    const char *reason = "ok";
    if (!state_machine_can_enter_sleep(&reason)) {
        s_sleep_blocked_count += 1U;
        uint64_t now_ms = util_uptime_ms();
        if (s_last_sleep_reject_log_ms == 0 ||
            (now_ms - s_last_sleep_reject_log_ms) >= TRACKER_SLEEP_REJECT_LOG_INTERVAL_MS) {
            ESP_LOGW(TAG,
                     "Sleep blocked reason=%s blocked_count=%lu",
                     reason,
                     (unsigned long)s_sleep_blocked_count);
            s_last_sleep_reject_log_ms = now_ms;
        }
        return APP_STATE_CHECK_IGN;
    }

    s_sleep_enter_count += 1U;
    ESP_LOGI(TAG,
             "Sleep accepted enter_count=%lu timer_wake_count=%lu imu_wake_count=%lu false_wake_count=%lu",
             (unsigned long)s_sleep_enter_count,
             (unsigned long)s_timer_wake_count,
             (unsigned long)s_imu_wake_count,
             (unsigned long)s_imu_false_wake_count);
    state_machine_shutdown_for_sleep();
    return state_machine_enter_configured_sleep();
}

esp_err_t state_machine_core_init(const config_t *config) {
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");

    state_runtime_context_reset(config);
    util_copy_string(s_telemetry.obd_ecu_state, sizeof(s_telemetry.obd_ecu_state), "unknown");
    ESP_LOGI(TAG,
             "runtime config device=%s mqtt_configured=%d mqtt_port=%u apn_configured=%d tracking=%us heartbeat=%us alarm=%us ign_hold_ms=%u sleep=%d imu_wake=%d ota_min_mv=%u",
             s_config.device_id,
             util_string_empty(s_config.mqtt_host) ? 0 : 1,
             (unsigned int)s_config.mqtt_port,
             util_string_empty(s_config.apn) ? 0 : 1,
             (unsigned int)s_config.tracking_interval_s,
             (unsigned int)s_config.heartbeat_interval_s,
             (unsigned int)s_config.alarm_interval_s,
             (unsigned int)s_config.ignition_off_hold_ms,
             s_config.sleep_enabled ? 1 : 0,
             s_config.imu_wakeup_enabled ? 1 : 0,
             (unsigned int)s_config.ota_min_battery_mv);

    if (s_ble_connect_result_queue == NULL) {
        s_ble_connect_result_queue = xQueueCreate(1, sizeof(tracker_ble_connect_result_t));
    } else {
        xQueueReset(s_ble_connect_result_queue);
    }
    ESP_RETURN_ON_FALSE(s_ble_connect_result_queue != NULL, ESP_ERR_NO_MEM, TAG, "BLE result queue init failed");

    util_set_sleep_enabled(s_config.sleep_enabled);
    if (!util_string_empty(CONFIG_APP_PROJECT_VER)) {
        util_copy_string(s_current_version, sizeof(s_current_version), CONFIG_APP_PROJECT_VER);
    }
    state_machine_init_boot_metadata();
    s_state_entered_ms = util_uptime_ms();
    s_last_health_snapshot_log_ms = 0;

    ESP_RETURN_ON_FALSE(adc_reader_init() == ESP_OK, ESP_FAIL, TAG, "adc_reader_init failed");
    if (!state_machine_imu_runtime_enabled()) {
        ESP_LOGW(TAG, "IMU wake disabled by config (timer-only parked sleep fallback)");
    }
    ESP_RETURN_ON_FALSE(power_mgr_init() == ESP_OK, ESP_FAIL, TAG, "power_mgr_init failed");

    esp_err_t rtc_init_err = rtc_ds3231m_init();
    if (rtc_init_err != ESP_OK) {
        ESP_LOGW(TAG, "rtc_ds3231m_init failed: %s (continue with fallback time)", esp_err_to_name(rtc_init_err));
    }

    bool rtc_available = false;
    bool rtc_time_valid = false;
    if (rtc_ds3231m_get_health(&rtc_available, &rtc_time_valid) == ESP_OK) {
        ESP_LOGI(TAG, "RTC health available=%d valid=%d", rtc_available ? 1 : 0, rtc_time_valid ? 1 : 0);
    }

    modem_lte_set_apn(s_config.apn);
    modem_lte_request_connect();
    ESP_RETURN_ON_FALSE(tracker_mqtt_init(&s_config) == ESP_OK, ESP_FAIL, TAG, "tracker_mqtt_init failed");
    ESP_RETURN_ON_FALSE(offline_queue_init() == ESP_OK, ESP_FAIL, TAG, "offline_queue_init failed");
    telemetry_counters_reset();
    session_mgr_init();
    ESP_RETURN_ON_FALSE(command_handler_init(&s_config) == ESP_OK, ESP_FAIL, TAG, "command_handler_init failed");
    tracker_mqtt_set_command_callback(state_machine_command_callback);

    state_machine_restore_ota_context_from_nvs();
    bool had_pending_confirm = g_rtc_context.ota_pending_confirm;
    state_machine_try_confirm_running_firmware();
    if (!had_pending_confirm) {
        state_machine_publish_firmware_status(TRACKER_OTA_STATUS_SUCCESS,
                                              TRACKER_OTA_PROGRESS_DONE,
                                              s_current_version,
                                              "",
                                              "",
                                              "");
    }
    return ESP_OK;
}

app_state_t state_machine_core_run(app_state_t current_state) {
    state_machine_update_user_led();
    util_set_sleep_enabled(s_config.sleep_enabled);

    app_state_t next_state = current_state;
    switch (current_state) {
        case APP_STATE_INIT:
            s_runtime_state_hint = APP_STATE_INIT;
            offline_queue_set_online(tracker_mqtt_is_connected());
            next_state = APP_STATE_CHECK_IGN;
            break;
        case APP_STATE_CHECK_IGN:
            next_state = state_machine_handle_check_ign_state();
            break;
        case APP_STATE_DRIVING:
            next_state = state_machine_handle_driving_state();
            break;
        case APP_STATE_PARKED:
            s_runtime_state_hint = APP_STATE_PARKED;
            if (s_publish_status != TRACKER_PUBLISH_STATUS_STOPPED) {
                state_machine_publish_status("stopped");
                s_publish_status = TRACKER_PUBLISH_STATUS_STOPPED;
            }
            if (s_heartbeat_started_ms == 0) {
                s_heartbeat_started_ms = util_uptime_ms();
                s_heartbeat_raw_published = false;
            }
            next_state = APP_STATE_HEARTBEAT;
            break;
        case APP_STATE_ALARM:
            next_state = state_machine_handle_alarm_state();
            break;
        case APP_STATE_HEARTBEAT:
            next_state = state_machine_handle_heartbeat_state();
            break;
        case APP_STATE_SLEEP:
            next_state = state_machine_handle_sleep_state();
            break;
        default:
            next_state = APP_STATE_INIT;
            break;
    }

    uint64_t now_ms = util_uptime_ms();
    bool state_changed = next_state != current_state;
    state_machine_log_transition(current_state, next_state, now_ms);
    state_machine_log_health_snapshot(now_ms, state_changed || current_state == APP_STATE_INIT);
    return next_state;
}

telemetry_t state_machine_core_get_telemetry(void) {
    return s_telemetry;
}
