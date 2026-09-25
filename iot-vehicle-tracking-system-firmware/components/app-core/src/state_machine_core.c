#include "state_machine_core.h"

#include <inttypes.h>
#include <stdio.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"

#include "driver/gpio.h"

#include "esp_log.h"
#include "sdkconfig.h"

#include "adc_reader.h"
#include "command_handler.h"
#include "imu_lis3dsh.h"
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
#include "state_led_control.h"
#include "state_wake_prelude.h"
#include "telemetry_counters.h"
#include "util.h"

/**
 * @file state_machine_core.c
 * @brief Core tracker FSM orchestration and shared runtime-policy helpers.
 *
 * ## Main FSM State Transitions
 *
 *     INIT -> CHECK_IGN -> DRIVING/PARKED -> SLEEP -> (wake) -> CHECK_IGN
 *                       -> ALARM (IMU wake) -> PARKED/DRIVING
 *                       -> HEARTBEAT (periodic) -> PARKED
 *
 * ### State Definitions
 *    - INIT: Boot, initialize peripherals
 *    - CHECK_IGN: Decide ignition state, set initial transition
 *    - DRIVING: High-frequency telemetry, OBD connected
 *    - PARKED: Low-frequency, waiting for ignition-off timeout
 *    - ALARM: Motion detected, high-frequency alarm
 *    - HEARTBEAT: Periodic wake for connectivity check
 *    - SLEEP: Deep sleep with timer/IMU wake
 *
 * ### Runtime Flow Per Iteration
 *    1. Refresh telemetry (GNSS, battery, OBD)
 *    2. Check for cloud commands
 *    3. Process pending actions (OTA, config update)
 *    4. Publish telemetry
 *    5. Handle offline queue replay
 *    6. Evaluate next state transition
 *
 * ## Key Runtime Variables
 *    - g_rtc_context: RTC-retained across deep sleep (last_state, boot_count, etc.)
 *    - s_config: Cached runtime configuration from NVS
 *    - s_telemetry: Current telemetry snapshot
 *    - s_state_entered_ms: Timestamp when current state entered
 *
 * ## Health Monitoring
 *    - Periodic health snapshot logged every 60s
 *    - Tracks MQTT connection state, OBD connection state, and GNSS fix state
 *    - Used for remote diagnostics
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
/* Timestamp when current state was entered (for dwell time calculation). */
static uint64_t s_state_entered_ms = 0;
/* Timestamp of last health snapshot log. */
static uint64_t s_last_health_snapshot_log_ms = 0;

#ifndef CONFIG_APP_PROJECT_VER
#define CONFIG_APP_PROJECT_VER "unknown"
#endif
#ifndef CONFIG_TRACKER_FIELD_VALIDATION_MODE
#define CONFIG_TRACKER_FIELD_VALIDATION_MODE 0
#endif

#define TRACKER_HEALTH_SNAPSHOT_INTERVAL_MS 60000ULL

/**
 * @brief Forward incoming MQTT command payloads into the command handler.
 *
 * @param[in] topic MQTT topic string (unused because only the command topic is wired here).
 * @param[in] payload Raw command JSON payload.
 */
typedef struct {
    uint64_t command_id;
    esp_err_t process_result;
    bool execution_result;
} state_machine_command_ack_t;

#define TRACKER_COMMAND_ACK_QUEUE_LEN 16U
#define TRACKER_COMMAND_ACK_PUBLISH_BUDGET 4U

static QueueHandle_t s_command_ack_queue = NULL;

static const char *state_machine_command_ack_response(esp_err_t result, bool execution_result) {
    switch (result) {
        case ESP_OK:
            return execution_result ? "executed" : "accepted";
        case ESP_ERR_INVALID_ARG:
            return "invalid_command";
        case ESP_ERR_NOT_SUPPORTED:
            return "unsupported_command";
        case ESP_ERR_NO_MEM:
            return "command_queue_full";
        case ESP_ERR_TIMEOUT:
            return execution_result ? "execution_timeout" : "command_state_busy";
        case ESP_ERR_INVALID_STATE:
            return execution_result ? "execution_invalid_state" : "command_rejected";
        default:
            return execution_result ? "execution_failed" : "command_rejected";
    }
}

/**
 * @brief Parse/stage an incoming command and queue its ACK for the FSM task.
 *
 * The modem URC callback must stay non-blocking. In particular it must not send
 * another AT/MQTT publish while the RX parser is still handling the inbound
 * command, so ACK transport is deferred to the cooperative FSM loop.
 */
static void state_machine_command_callback(const char *topic, const char *payload) {
    (void)topic;

    /*
     * Reserve observability before accepting side effects. The action executor
     * is already gated while this queue is non-empty, so available ACK capacity
     * cannot be consumed by an execution-result ACK between this preflight and
     * the enqueue below.
     */
    if (s_command_ack_queue == NULL || uxQueueSpacesAvailable(s_command_ack_queue) == 0U) {
        ESP_LOGW(TAG, "event=command_rejected reason=ack_backpressure");
        return;
    }

    uint64_t command_id = 0U;
    bool deferred = false;
    esp_err_t process_result = command_handler_process(payload, &command_id, &deferred);
    if (command_id == 0U) {
        /*
         * Legacy/local commands can still execute, but without a cloud-issued
         * correlation ID the backend has no command row that can be updated.
         */
        ESP_LOGW(TAG,
                 "event=command_ack_skipped reason=missing_command_id process_err=%s",
                 esp_err_to_name(process_result));
        return;
    }

    state_machine_command_ack_t ack = {
        .command_id = command_id,
        .process_result = process_result,
        .execution_result = process_result == ESP_OK && !deferred,
    };
    if (s_command_ack_queue == NULL ||
        xQueueSendToBack(s_command_ack_queue, &ack, 0) != pdTRUE) {
        ESP_LOGW(TAG,
                 "event=command_ack_queue_full command_id=%" PRIu64,
                 command_id);
    }
}

/**
 * @brief Publish a bounded number of pending command ACKs outside the RX callback.
 */
static void state_machine_publish_pending_command_acks(void) {
    if (s_command_ack_queue == NULL || !tracker_mqtt_is_connected()) {
        return;
    }

    for (uint32_t i = 0; i < TRACKER_COMMAND_ACK_PUBLISH_BUDGET; ++i) {
        state_machine_command_ack_t ack = {0};
        if (xQueuePeek(s_command_ack_queue, &ack, 0) != pdTRUE) {
            return;
        }

        const char *status =
            ack.process_result == ESP_OK
                ? (ack.execution_result ? "acknowledged" : "accepted")
                : "failed";
        const char *response =
            state_machine_command_ack_response(ack.process_result, ack.execution_result);
        char ack_payload[192] = {0};
        int written = snprintf(ack_payload,
                               sizeof(ack_payload),
                               "{\"command_id\":\"%" PRIu64
                               "\",\"status\":\"%s\",\"response\":\"%s\","
                               "\"boot_id\":\"%s\"}",
                               ack.command_id,
                               status,
                               response,
                               s_boot_id);
        if (written <= 0 || (size_t)written >= sizeof(ack_payload)) {
            ESP_LOGW(TAG,
                     "event=command_ack_encode_failed command_id=%" PRIu64,
                     ack.command_id);
            (void)xQueueReceive(s_command_ack_queue, &ack, 0);
            continue;
        }

        esp_err_t ack_err = tracker_mqtt_publish_command_ack(ack_payload);
        if (ack_err != ESP_OK) {
            ESP_LOGW(TAG,
                     "event=command_ack_publish_failed command_id=%" PRIu64
                     " status=%s err=%s",
                     ack.command_id,
                     status,
                     esp_err_to_name(ack_err));
            return; // Keep the head item queued for the next connected loop.
        }

        (void)xQueueReceive(s_command_ack_queue, &ack, 0);
        ESP_LOGI(TAG,
                 "event=command_ack_published command_id=%" PRIu64 " status=%s",
                 ack.command_id,
                 status);
    }
}

bool state_machine_has_pending_command_acks(void) {
    return s_command_ack_queue != NULL && uxQueueMessagesWaiting(s_command_ack_queue) > 0U;
}

bool state_machine_queue_command_execution_ack(uint64_t command_id, esp_err_t result) {
    if (command_id == 0U) {
        return true;
    }
    if (s_command_ack_queue == NULL) {
        ESP_LOGW(TAG,
                 "event=command_execution_ack_dropped command_id=%" PRIu64 " reason=queue_unavailable",
                 command_id);
        return false;
    }

    state_machine_command_ack_t ack = {
        .command_id = command_id,
        .process_result = result,
        .execution_result = true,
    };
    if (xQueueSendToBack(s_command_ack_queue, &ack, 0) != pdTRUE) {
        ESP_LOGW(TAG,
                 "event=command_execution_ack_dropped command_id=%" PRIu64 " reason=queue_full",
                 command_id);
        return false;
    }
    return true;
}

/**
 * @brief Return the rawdata publish cadence in milliseconds.
 *
 * @return Configured driving rawdata interval in milliseconds.
 */
uint64_t state_machine_tracking_interval_ms(void) {
    return (uint64_t)s_config.tracking_interval_s * 1000ULL;
}

/**
 * @brief Return the alarm rawdata cadence in milliseconds.
 *
 * @return Configured alarm rawdata interval in milliseconds.
 */
uint64_t state_machine_alarm_interval_ms(void) {
    return (uint64_t)s_config.alarm_interval_s * 1000ULL;
}

/**
 * @brief Return the maximum alarm dwell time in milliseconds.
 *
 * @return Configured alarm timeout in milliseconds.
 */
uint64_t state_machine_alarm_timeout_ms(void) {
    return (uint64_t)s_config.alarm_timeout_s * 1000ULL;
}

/**
 * @brief Check if rawdata should be throttled.
 *
 * Returns true when MQTT is disconnected and offline queue
 * is near capacity.
 *
 * @return true if should throttle, false otherwise.
 */
bool state_machine_should_throttle_rawdata(void) {
    return !tracker_mqtt_is_connected() && offline_queue_should_throttle_rawdata();
}

/**
 * @brief Get ignition-off hold duration.
 *
 * @return Hold duration in milliseconds.
 */
uint64_t state_machine_ignition_off_hold_ms(void) {
    return (uint64_t)util_clamp_int((int)s_config.ignition_off_hold_ms,
                                    (int)TRACKER_CONFIG_EFFECTIVE_MIN_IGNITION_OFF_HOLD_MS,
                                    (int)TRACKER_CONFIG_MAX_IGNITION_OFF_HOLD_MS);
}

/**
 * @brief Get parked wake interval with cap.
 *
 * Returns heartbeat interval capped to maximum allowed during parked.
 *
 * @return Interval in seconds.
 */
uint16_t state_machine_parked_wake_interval_s(void) {
    // Parked wake cadence must stay short enough to catch ignition changes even
    // when the general heartbeat/status cadence is configured much longer.
    return (uint16_t)util_clamp_int((int)s_config.heartbeat_interval_s,
                                    (int)TRACKER_CONFIG_MIN_HEARTBEAT_INTERVAL_S,
                                    (int)TRACKER_PARKED_WAKE_INTERVAL_CAP_S);
}

/**
 * @brief Check if IMU wake is enabled in config.
 *
 * @return true if IMU wake is enabled.
 */
bool state_machine_imu_runtime_enabled(void) {
    return s_config.imu_wakeup_enabled;
}

/**
 * @brief Check if OBD sample exists within time window.
 *
 * @param now_ms Current timestamp.
 * @param max_age_ms Maximum age in milliseconds.
 * @return true if sample is recent enough.
 */
bool state_machine_has_recent_obd_sample(uint64_t now_ms, uint32_t max_age_ms) {
    if (s_last_obd_sample_ms == 0 || now_ms < s_last_obd_sample_ms) {
        return false;
    }
    return (now_ms - s_last_obd_sample_ms) <= (uint64_t)max_age_ms;
}

/**
 * @brief Clear the current heartbeat-window bookkeeping.
 *
 * Whenever the parked heartbeat discovers fresh ignition evidence, the runtime
 * should re-enter the ignition path with a clean window instead of carrying the
 * old heartbeat timeout forward into the next state.
 */
static void state_machine_reset_heartbeat_window(void) {
    s_heartbeat_started_ms = 0;
    s_heartbeat_raw_published = false;
}

/**
 * @brief Resolve the effective ignition axis consumed by cloud/runtime state.
 *
 * Runtime payload axes must follow the same ignition semantics as the session
 * debouncer. Fresh OBD transport activity alone is not enough to say the
 * engine is ON; only the fused raw ignition candidate or the debounced
 * ignition state may elevate the cloud/runtime ignition axis.
 *
 * @param[in] now_ms Current uptime.
 * @return Effective ignition state exposed to runtime/publish consumers.
 */
static tracker_ignition_state_t state_machine_resolve_effective_ignition_state(uint64_t now_ms) {
    (void)now_ms;

    // Highest trust: the debounced session-manager verdict wins whenever it has
    // settled, because it already filtered out ignition-line chatter.
    if (session_mgr_has_stable_ignition()) {
        return session_mgr_stable_ignition() ? TRACKER_IGNITION_STATE_ON
                                             : TRACKER_IGNITION_STATE_OFF;
    }

    // No stable verdict yet: a raw fused ON candidate may elevate to ON, but a
    // raw OFF/absent signal must stay UNKNOWN (never assert OFF on weak data).
    if (s_telemetry.ignition) {
        return TRACKER_IGNITION_STATE_ON;
    }

    return TRACKER_IGNITION_STATE_UNKNOWN;
}

/**
 * @brief Check whether the effective ignition axis currently resolves to ON.
 *
 * @param[in] now_ms Current uptime.
 * @return true when runtime/cloud semantics should treat the engine as ON.
 */
static bool state_machine_effective_ignition_on(uint64_t now_ms) {
    return state_machine_resolve_effective_ignition_state(now_ms) == TRACKER_IGNITION_STATE_ON;
}

/**
 * @brief Resolve current motion state from available sensor inputs.
 *
 * Resolution priority order:
 * 1. GNSS speed: If valid fix exists, use speed > 3 km/h as MOVING threshold
 * 2. OBD speed: If BLE OBD is connected and sample is recent (<30s), use speed > 3 km/h
 * 3. Fallback: If no ignition signal, assume STATIONARY; otherwise return UNKNOWN
 *
 * @param now_ms Current timestamp in milliseconds (from esp_log_timestamp()).
 * @return tracker_motion_state_t: MOVING, STATIONARY, or UNKNOWN based on sensor fusion.
 */
static tracker_motion_state_t state_machine_resolve_motion_state(uint64_t now_ms) {
    // Priority 1: a valid GNSS fix is the most direct speed source. 3 km/h is
    // the MOVING threshold that rejects GPS jitter while a vehicle is stopped.
    if (s_telemetry.gnss.fix_valid) {
        return s_telemetry.gnss.speed_kmh > 3.0f ? TRACKER_MOTION_STATE_MOVING
                                                 : TRACKER_MOTION_STATE_STATIONARY;
    }
    // Priority 2: fall back to OBD speed, but only while the ELM327 is ready and
    // the last live sample is still fresh enough to trust.
    if (s_telemetry.obd_elm_ready &&
        state_machine_has_recent_obd_sample(now_ms, TRACKER_IGNITION_OBD_LIVE_SAMPLE_MAX_AGE_MS)) {
        return s_telemetry.obd_speed > 3 ? TRACKER_MOTION_STATE_MOVING
                                         : TRACKER_MOTION_STATE_STATIONARY;
    }
    // Priority 3: no speed source. If the engine is off we can safely assume the
    // vehicle is stationary; otherwise motion is genuinely UNKNOWN.
    return state_machine_effective_ignition_on(now_ms) ? TRACKER_MOTION_STATE_UNKNOWN
                                                        : TRACKER_MOTION_STATE_STATIONARY;
}

/**
 * @brief Resolve vehicle state from ignition and motion state combination.
 *
 * State resolution logic maps ignition+motion pairs to vehicle states:
 * - ON + MOVING -> MOVING_ON (driving with ignition on)
 * - ON + STATIONARY -> IDLING_ON (ignition on but not moving)
 * - OFF + MOVING -> ROLLING_IGN_OFF (coasting with ignition off - rare)
 * - OFF + STATIONARY -> PARKED_OFF (properly parked)
 * - UNKNOWN motion + any ignition -> UNKNOWN (insufficient data)
 *
 * This 2D state resolution replaces simple ignition-only state machine,
 * enabling differentiation between idling and parked states for telemetry.
 *
 * @param ignition_state Current ignition state from FSM sensor inputs.
 * @param motion_state Current motion state (MOVING/STATIONARY/UNKNOWN).
 * @return tracker_vehicle_state_t Resolved vehicle state enum.
 */
static tracker_vehicle_state_t state_machine_resolve_vehicle_state(tracker_ignition_state_t ignition_state,
                                                                   tracker_motion_state_t motion_state) {
    // ON + MOVING => actively driving.
    if (ignition_state == TRACKER_IGNITION_STATE_ON && motion_state == TRACKER_MOTION_STATE_MOVING) {
        return TRACKER_VEHICLE_STATE_MOVING_ON;
    }
    // ON + STATIONARY => engine running but not moving (idling at a stop).
    if (ignition_state == TRACKER_IGNITION_STATE_ON && motion_state == TRACKER_MOTION_STATE_STATIONARY) {
        return TRACKER_VEHICLE_STATE_IDLING_ON;
    }
    // OFF + MOVING => coasting/being towed with ignition off (rare but real).
    if (ignition_state == TRACKER_IGNITION_STATE_OFF && motion_state == TRACKER_MOTION_STATE_MOVING) {
        return TRACKER_VEHICLE_STATE_ROLLING_IGN_OFF;
    }
    // OFF + STATIONARY => the normal parked-and-off condition.
    if (ignition_state == TRACKER_IGNITION_STATE_OFF && motion_state == TRACKER_MOTION_STATE_STATIONARY) {
        return TRACKER_VEHICLE_STATE_PARKED_OFF;
    }
    // Ignition is UNKNOWN below: classify by motion alone so the cloud still gets
    // a useful hint instead of a bare UNKNOWN.
    if (motion_state == TRACKER_MOTION_STATE_MOVING) {
        return TRACKER_VEHICLE_STATE_UNKNOWN_MOVING;
    }
    if (motion_state == TRACKER_MOTION_STATE_STATIONARY) {
        return TRACKER_VEHICLE_STATE_UNKNOWN_STATIONARY;
    }
    // Neither ignition nor motion could be resolved.
    return TRACKER_VEHICLE_STATE_UNKNOWN;
}

/**
 * @brief Map FSM application state to device-level state for cloud reporting.
 *
 * This mapping provides a simplified device state for backend/UI consumption,
 * abstracting away the internal FSM states into meaningful device conditions:
 * - INIT -> BOOTING (device is starting up)
 * - CHECK_IGN -> WAKING (sensors initializing, checking ignition)
 * - DRIVING/HEARTBEAT -> ACTIVE (normal tracking operation)
 * - PARKED -> SLEEP_PREPARE (vehicle parked, preparing for sleep)
 * - ALARM -> ALARM (triggered by motion/ignition event)
 * - SLEEP -> SLEEP (deep sleep low-power mode)
 *
 * The cloud device state differs from internal FSM state - it's optimized
 * for UI display and backend analytics rather than internal control flow.
 *
 * @param app_state Current FSM application state (APP_STATE_*).
 * @return tracker_device_state_t Mapped device state for cloud reporting.
 */
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

/**
 * @brief Synchronize high-level runtime axes derived from the current snapshot.
 *
 * This helper keeps ignition, motion, vehicle, device, and sleep axes aligned
 * before payload formatting or state-based decisions consume them.
 *
 * @param[in] app_state Current FSM state hint.
 */
void state_machine_sync_runtime_axes(app_state_t app_state) {
    uint64_t now_ms = util_uptime_ms();
    // Resolve ignition first because both motion and vehicle state derive from it.
    tracker_ignition_state_t ignition_state = state_machine_resolve_effective_ignition_state(now_ms);
    s_telemetry.ignition_state = ignition_state;
    // Motion is fused from GNSS/OBD/ignition; vehicle state then combines the two axes.
    s_telemetry.motion_state = state_machine_resolve_motion_state(now_ms);
    s_telemetry.vehicle_state = state_machine_resolve_vehicle_state(s_telemetry.ignition_state,
                                                                    s_telemetry.motion_state);
    // Device/sleep axes are derived purely from the FSM state hint for cloud reporting.
    s_telemetry.device_state = state_machine_resolve_device_state(app_state);
    s_telemetry.sleep_mode = state_machine_resolve_sleep_mode(app_state);
}

/**
 * @brief Check whether heartbeat publish prerequisites are met.
 *
 * @return true when the network is currently ready for heartbeat publishing.
 */
bool state_machine_network_ready_for_heartbeat_publish(void) {
    return !s_modem_low_power_pending_wakeup && tracker_mqtt_is_connected();
}

/**
 * @brief Convert app_state enum to human-readable string for logging.
 *
 * Used throughout FSM to produce consistent, readable state names in logs.
 * Ensures debug output is uniform regardless of which state transition occurs.
 *
 * @param state Application state enum value (APP_STATE_*).
 * @return const char* String representation of state name.
 */
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

/**
 * @brief Explain a state transition using the current FSM policy semantics.
 *
 * @param[in] from Previous FSM state.
 * @param[in] to Next FSM state.
 * @return Short reason label for logs.
 */
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
    if (from == APP_STATE_HEARTBEAT && to == APP_STATE_DRIVING) {
        return "ignition_stable_on_during_heartbeat";
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

/**
 * @brief Emit a periodic health snapshot for field-validation diagnostics.
 *
 * @param[in] now_ms Current uptime.
 * @param[in] force True to bypass the normal snapshot cadence.
 */
static void state_machine_log_health_snapshot(uint64_t now_ms, bool force) {
#if CONFIG_TRACKER_FIELD_VALIDATION_MODE
    bool due = force || s_last_health_snapshot_log_ms == 0 ||
               (now_ms - s_last_health_snapshot_log_ms) >= TRACKER_HEALTH_SNAPSHOT_INTERVAL_MS;
    if (!due) {
        return;
    }

    telemetry_counters_t counters = telemetry_counters_get();
    ESP_LOGI(TAG,
             "event=health_snapshot uptime_s=%llu state=%s mqtt_connected=%d mqtt_ok=%lu mqtt_fail=%lu mqtt_fallback=%lu queue_depth=%lu replay_ok=%lu replay_retry=%lu replay_drop=%lu sd_fail=%lu quota_hit=%lu lte_recovery_start=%lu lte_recovery_ok=%lu lte_recovery_fail=%lu obd_ok=%lu obd_timeout=%lu obd_invalid=%lu ota_http_start=%lu ota_http_ok=%lu ota_http_fail=%lu",
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

/**
 * @brief Log an FSM state transition together with dwell time.
 *
 * @param[in] from Previous state.
 * @param[in] to Next state.
 * @param[in] now_ms Current uptime.
 */
static void state_machine_log_transition(app_state_t from, app_state_t to, uint64_t now_ms) {
    if (from == to) {
        return;
    }

    uint64_t dwell_ms = s_state_entered_ms == 0 || now_ms < s_state_entered_ms ? 0 : now_ms - s_state_entered_ms;
    ESP_LOGI(TAG,
             "event=state_transition from=%s to=%s reason=%s dwell_ms=%llu",
             state_machine_app_state_name(from),
             state_machine_app_state_name(to),
             state_machine_transition_reason(from, to),
             (unsigned long long)dwell_ms);
    s_state_entered_ms = now_ms;
    g_rtc_context.last_state = to;
}

/**
 * @brief Check whether the current runtime window is safe to start OTA.
 *
 * @return true when MQTT is connected and device battery is above the OTA threshold.
 */
bool state_machine_ota_start_is_safe(void) {
    if (!tracker_mqtt_is_connected()) {
        ESP_LOGW(TAG, "event=ota_start_blocked reason=mqtt_not_connected");
        return false;
    }
    if (s_telemetry.device_battery <= 0.0f) {
        ESP_LOGW(TAG, "event=ota_start_blocked reason=device_battery_unavailable");
        return false;
    }

    float threshold_v = (float)s_config.ota_min_battery_mv / 1000.0f;
    if (s_telemetry.device_battery < threshold_v) {
        ESP_LOGW(TAG,
                 "event=ota_start_blocked reason=device_battery_unsafe device_battery=%.2f threshold=%.2f",
                 (double)s_telemetry.device_battery,
                 (double)threshold_v);
        return false;
    }
    return true;
}

void state_machine_force_user_led_on(void) {
    state_led_force_on();
}

void state_machine_force_user_led_off(void) {
    state_led_force_off();
}

void state_machine_resume_user_led_pattern(void) {
    state_led_resume_pattern();
}

/**
 * @brief Advance the outbound metadata sequence number while keeping zero reserved.
 *
 * @return Next non-zero sequence number.
 */
uint32_t state_machine_next_seq_no(void) {
    s_metadata_seq_no += 1U;
    if (s_metadata_seq_no == 0U) {
        s_metadata_seq_no = 1U;
    }
    return s_metadata_seq_no;
}

/**
 * @brief Fill a new outbound message identifier.
 *
 * @param[out] out Destination buffer.
 * @param[in] out_size Capacity of `out`.
 */
void state_machine_fill_message_id(char *out, size_t out_size) {
    util_generate_uuid_v4(out, out_size);
}

/**
 * @brief Initialize boot-scoped metadata used by outbound payloads.
 */
void state_machine_init_boot_metadata(void) {
    util_generate_boot_id(s_boot_id, sizeof(s_boot_id), g_rtc_context.boot_count);
    util_copy_string(s_session_boot_id, sizeof(s_session_boot_id), s_boot_id);
    s_metadata_seq_no = 0;
    ESP_LOGI(TAG,
             "event=boot_metadata_initialized boot_id=%s boot_count=%lu",
             s_boot_id,
             (unsigned long)g_rtc_context.boot_count);
}

/**
 * @brief Reset the current session-related runtime fields back to "no session".
 */
static void state_machine_reset_session_runtime(void) {
    // Reset the session-runtime snapshot here so a new drive or reconnect starts from clean state.
    s_session_id = 0;
    s_canonical_session_id = 0;
    util_copy_string(s_session_boot_id, sizeof(s_session_boot_id), s_boot_id);
    s_session_restore_pending = false;
}

/**
 * @brief Persist the active session identity for reboot-in-place recovery.
 */
static void state_machine_persist_active_session(void) {
    session_persist_context_t context = {
        .active = true,
        .local_session_key = s_session_id,
        .canonical_session_id = s_canonical_session_id,
    };
    util_copy_string(context.boot_id, sizeof(context.boot_id), s_session_boot_id);
    esp_err_t err = nvs_config_save_session_context(&context);
    if (err != ESP_OK) {
        ESP_LOGW(TAG,
                 "event=session_persist_failed local=%lu canonical=%llu err=%s",
                 (unsigned long)s_session_id,
                 (unsigned long long)s_canonical_session_id,
                 esp_err_to_name(err));
    }
}

/**
 * @brief Clear any persisted session candidate from NVS.
 */
static void state_machine_clear_persisted_session(void) {
    esp_err_t err = nvs_config_clear_session_context();
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "event=session_persist_clear_failed err=%s", esp_err_to_name(err));
    }
}

/**
 * @brief Restore a persisted session candidate from NVS.
 *
 * The candidate remains provisional until the current ignition sample confirms
 * the vehicle is still ON. Otherwise the caller drops the stale context.
 */
static void state_machine_restore_session_context_from_nvs(void) {
    session_persist_context_t context = {0};
    bool found = false;
    esp_err_t err = nvs_config_load_session_context(&context, &found);
    if (err != ESP_OK || !found || !context.active || context.local_session_key == 0U) {
        if (err != ESP_OK) {
            ESP_LOGW(TAG, "event=session_context_load_failed err=%s", esp_err_to_name(err));
        }
        return;
    }

    s_session_id = context.local_session_key;
    s_canonical_session_id = context.canonical_session_id;
    util_copy_string(s_session_boot_id, sizeof(s_session_boot_id), context.boot_id);
    if (util_string_empty(s_session_boot_id)) {
        util_copy_string(s_session_boot_id, sizeof(s_session_boot_id), s_boot_id);
    }
    s_session_restore_pending = true;
    ESP_LOGI(TAG,
             "event=session_candidate_restored local=%lu canonical=%llu boot_id=%s",
             (unsigned long)s_session_id,
             (unsigned long long)s_canonical_session_id,
             s_session_boot_id);
}

/**
 * @brief Open a new local session after the FSM accepts a start boundary.
 */
static void state_machine_start_new_session(void) {
    session_mgr_mark_started();
    s_session_id = session_mgr_current_session_id();
    // A fresh local session must drop any canonical ID left over from a prior drive.
    s_canonical_session_id = 0;
    util_copy_string(s_session_boot_id, sizeof(s_session_boot_id), s_boot_id);
    s_session_restore_pending = false;
    offline_queue_set_session(s_session_id);
    state_machine_persist_active_session();
}

/**
 * @brief Resume an already active session after reboot-time recovery.
 */
static void state_machine_resume_active_session(void) {
    if (s_session_id == 0U) {
        return;
    }

    session_mgr_restore_active(s_session_id);
    offline_queue_set_session(s_session_id);
    s_session_restore_pending = false;
    ESP_LOGI(TAG,
             "event=session_resumed local=%lu canonical=%llu boot_id=%s",
             (unsigned long)s_session_id,
             (unsigned long long)s_canonical_session_id,
             s_session_boot_id);
}

/**
 * @brief Drop a restored session candidate that no longer matches live ignition.
 */
static bool state_machine_reconcile_stale_restored_session(void) {
    if (!s_session_restore_pending || s_session_id == 0U) {
        return true;
    }

    ESP_LOGI(TAG,
             "event=session_restore_reconcile_attempt local=%lu canonical=%llu boot_id=%s outcome=ended",
             (unsigned long)s_session_id,
             (unsigned long long)s_canonical_session_id,
             s_session_boot_id);

    /*
     * The persisted identity is historical truth for the interrupted drive.
     * Expose it only for this authoritative closing boundary. If neither MQTT
     * nor durable SD fallback accepts the payload, restore the provisional flag
     * and leave NVS untouched so a later wake can retry.
     */
    offline_queue_set_session(s_session_id);
    s_session_restore_pending = false;
    bool accepted = state_machine_publish_status("stopped", "ended");
    if (!accepted) {
        s_session_restore_pending = true;
        offline_queue_set_session(0);
        ESP_LOGW(TAG,
                 "event=session_restore_reconcile_deferred local=%lu canonical=%llu boot_id=%s reason=publish_not_durable",
                 (unsigned long)s_session_id,
                 (unsigned long long)s_canonical_session_id,
                 s_session_boot_id);
        return false;
    }

    offline_queue_stop_session(true);
    offline_queue_set_session(0);
    session_mgr_mark_stopped();
    state_machine_clear_persisted_session();
    state_machine_reset_session_runtime();
    s_publish_status = TRACKER_PUBLISH_STATUS_STOPPED;

    ESP_LOGI(TAG, "event=session_restore_reconciled outcome=ended");
    return true;
}

/**
 * @brief Emit the final session boundary, then tear down runtime session state.
 *
 * A final rawdata snapshot and the final `stopped` status must be published
 * before queue/session metadata is cleared so the closing boundary still
 * carries the active identifiers.
 */
static bool state_machine_commit_session_end(void) {
    if (state_machine_should_throttle_rawdata()) {
        ESP_LOGW(TAG,
                 "event=session_end_rawdata_force reason=closing_session action=throttle_bypass");
    }
    (void)state_machine_publish_rawdata();

    /*
     * The authoritative end boundary owns session teardown. If neither MQTT nor
     * durable SD fallback accepts it, retain the complete active identity (RAM,
     * session manager, offline queue and NVS) so the next hold interval can
     * retry. Forgetting the identity here would make the cloud session
     * impossible to close after a transport+storage outage.
     */
    if (!state_machine_publish_status("stopped", "ended")) {
        ESP_LOGW(TAG,
                 "event=session_end_deferred local=%lu canonical=%llu boot_id=%s reason=publish_not_durable",
                 (unsigned long)s_session_id,
                 (unsigned long long)s_canonical_session_id,
                 s_session_boot_id);
        return false;
    }

    offline_queue_stop_session(true);
    offline_queue_set_session(0);
    session_mgr_mark_stopped();
    state_machine_clear_persisted_session();
    state_machine_reset_session_runtime();
    s_publish_status = TRACKER_PUBLISH_STATUS_STOPPED;
    return true;
}

/**
 * @brief Bind the active local session to the canonical cloud session ID.
 *
 * The assignment is accepted only when local session key and boot ID still
 * match the active runtime session. That prevents stale downlink commands from
 * overwriting a newer session after reconnect or reboot.
 */
esp_err_t state_machine_apply_session_assignment(uint32_t local_session_key,
                                                 uint64_t canonical_session_id,
                                                 const char *session_boot_id) {
    if (local_session_key == 0U || canonical_session_id == 0U || util_string_empty(session_boot_id)) {
        return ESP_ERR_INVALID_ARG;
    }

    if (s_session_id != local_session_key || strcmp(s_session_boot_id, session_boot_id) != 0) {
        ESP_LOGW(TAG,
                 "event=session_assignment_ignored local=%lu canonical=%llu boot_id=%s current_local=%lu current_boot=%s reason=active_session_mismatch",
                 (unsigned long)local_session_key,
                 (unsigned long long)canonical_session_id,
                 session_boot_id,
                 (unsigned long)s_session_id,
                 s_session_boot_id);
        return ESP_ERR_INVALID_STATE;
    }

    if (s_canonical_session_id == canonical_session_id) {
        return ESP_OK;
    }

    s_canonical_session_id = canonical_session_id;
    state_machine_persist_active_session();
    ESP_LOGI(TAG,
             "event=session_canonical_assigned local=%lu canonical=%llu boot_id=%s",
             (unsigned long)s_session_id,
             (unsigned long long)s_canonical_session_id,
             s_session_boot_id);
    return ESP_OK;
}

/**
 * @brief Resume a persisted session once ignition is confirmed ON again.
 *
 * Mid-session reboots keep the session identity in NVS. The state machine only
 * resumes that identity after the debounced ignition path confirms the vehicle
 * is still in the same logical drive.
 */
static void state_machine_resume_restored_session_if_needed(bool ignition_on) {
    if (!s_session_restore_pending || !ignition_on) {
        return;
    }

    state_machine_resume_active_session();
}

/**
 * @brief Publish the authoritative running status once per active session phase.
 *
 * `boundary_event=started` is emitted only when the current loop actually
 * opened a new local session. Subsequent loops keep the session open without
 * repeating the start boundary.
 */
static void state_machine_publish_running_status_if_needed(bool started_session) {
    if (started_session) {
        state_machine_publish_status("running", "started");
        s_publish_status = TRACKER_PUBLISH_STATUS_RUNNING;
        return;
    }

    if (s_publish_status == TRACKER_PUBLISH_STATUS_RUNNING) {
        return;
    }

    state_machine_publish_status("running", "none");
    s_publish_status = TRACKER_PUBLISH_STATUS_RUNNING;
}

/**
 * @brief Publish the first rawdata snapshot immediately after a new session starts.
 *
 * The server treats session boundaries and rawdata as separate streams. If a
 * session opens just after a heartbeat rawdata publish, the normal driving
 * cadence can delay the next rawdata long enough for the whole session to end
 * with zero points. Emit one rawdata snapshot immediately so every real
 * engine-on window carries at least one telemetry point under the new session.
 *
 * @param[in] started_session True when the current driving loop opened a fresh session.
 * @return true when an immediate session-start rawdata publish was attempted.
 */
static bool state_machine_publish_session_start_rawdata_if_needed(bool started_session) {
    if (!started_session) {
        return false;
    }

    if (state_machine_should_throttle_rawdata()) {
        ESP_LOGW(TAG,
                 "event=session_start_rawdata_force reason=new_session action=throttle_bypass");
    }

    state_machine_publish_rawdata();
    return true;
}

/**
 * @brief Check whether driving rawdata should publish in the current loop.
 *
 * Cloud-requested one-shot snapshots are executed through the deferred command path;
 * this helper now represents only the normal driving cadence.
 */
static bool state_machine_should_publish_driving_rawdata(uint64_t now_ms) {
    return (now_ms - s_last_raw_publish_ms) >= state_machine_tracking_interval_ms();
}

/**
 * @brief Evaluate whether the session should still stay logically active.
 *
 * Tracking disable is treated like an ignition-inactive condition for the
 * publish/session boundary policy, but the session still closes only after the
 * configured ignition-off hold window elapses.
 */
static bool state_machine_driving_ignition_active(void) {
    bool stable_ignition_on = session_mgr_has_stable_ignition() && session_mgr_stable_ignition();
    return command_handler_is_tracking_enabled() && (s_telemetry.ignition || stable_ignition_on);
}

/**
 * @brief Apply the ignition-off hold policy for the current driving loop.
 *
 * The first OFF sample only arms a pending timer. The session closes exactly
 * once when the hold window really elapses; transient OFF chatter keeps the
 * session open and clears the pending timer when ignition returns.
 *
 * @param now_ms Current monotonic uptime in milliseconds.
 *
 * @return true when the session end committed and the FSM should leave driving.
 */
static bool state_machine_handle_driving_ignition_boundary(uint64_t now_ms) {
    bool ignition_active = state_machine_driving_ignition_active();
    if (!ignition_active && s_ignition_off_started_ms == 0U) {
        s_ignition_off_started_ms = now_ms;
        ESP_LOGI(TAG,
                 "event=ignition_off_pending hold_ms=%llu",
                 (unsigned long long)state_machine_ignition_off_hold_ms());
    }

    if (ignition_active) {
        s_ignition_off_started_ms = 0U;
        return false;
    }

    if (s_ignition_off_started_ms == 0U ||
        (now_ms - s_ignition_off_started_ms) < state_machine_ignition_off_hold_ms()) {
        return false;
    }

    if (!state_machine_commit_session_end()) {
        /*
         * Back off end-boundary retries by the same OFF hold interval. The
         * session remains logically active; if ignition returns in the meantime
         * the normal branch above cancels this close attempt and tracking
         * continues under the same still-open cloud session.
         */
        s_ignition_off_started_ms = now_ms;
        return false;
    }

    s_ignition_off_started_ms = 0U;
    return true;
}

/**
 * @brief Run one CHECK_IGN state iteration.
 *
 * @return Next FSM state.
 */
static app_state_t state_machine_handle_check_ign_state(void) {
    s_runtime_state_hint = APP_STATE_CHECK_IGN;
    if (!s_startup_system_check_log_once) {
        ESP_LOGI(TAG, "event=startup_system_check subsystems=ADC,BLE,RTC,LTE,MQTT");
        s_startup_system_check_log_once = true;
    }

    // Refresh wake-time peripherals first so the debounce path sees a current ignition sample.
    state_machine_run_wake_prelude(false);
    uint64_t now_ms = util_uptime_ms();
    session_mgr_on_ignition_sample(s_telemetry.ignition, now_ms);
    if (!session_mgr_has_stable_ignition()) {
        // Stay in CHECK_IGN until ignition chatter settles and the debounce window closes.
        return APP_STATE_CHECK_IGN;
    }
    if (s_telemetry.ignition != session_mgr_stable_ignition()) {
        // A previously stable OFF level can remain latched while a fresh ON
        // sample is still inside the debounce window. Hold CHECK_IGN here so
        // the FSM does not bounce through PARKED before the new level settles.
        return APP_STATE_CHECK_IGN;
    }

    bool ignition_on = session_mgr_stable_ignition();
    // Resume a recovered session only after ignition is confirmed to be ON on this boot.
    state_machine_resume_restored_session_if_needed(ignition_on);

    // Cache the debounced ignition result for later parked/sleep decisions.
    g_rtc_context.ign_last_known = ignition_on;
    return ignition_on ? APP_STATE_DRIVING : APP_STATE_PARKED;
}

/**
 * @brief Run one DRIVING state iteration.
 *
 * @return Next FSM state.
 */
static app_state_t state_machine_handle_driving_state(void) {
    s_runtime_state_hint = APP_STATE_DRIVING;
    // Driving keeps the full wake prelude active so connectivity and telemetry stay warm.
    state_machine_run_wake_prelude(true);
    session_mgr_on_ignition_sample(s_telemetry.ignition, util_uptime_ms());
    bool started_session = false;
    if (session_mgr_should_start()) {
        // Open the local session exactly once after the debouncer raises a clean ON edge.
        state_machine_start_new_session();
        started_session = true;
    }

    // Emit the authoritative running boundary once per active driving phase.
    state_machine_publish_running_status_if_needed(started_session);
    bool published_session_start_rawdata =
        state_machine_publish_session_start_rawdata_if_needed(started_session);

    uint64_t now_ms = util_uptime_ms();
    if (!published_session_start_rawdata &&
        state_machine_should_publish_driving_rawdata(now_ms) &&
        !state_machine_should_throttle_rawdata()) {
        // Normal driving cadence still respects offline-queue throttling.
        (void)state_machine_publish_rawdata();
    }

    if (modem_lte_is_initialized()) {
        // BLE OBD retries are meaningful only after modem/LTE bring-up reached a usable baseline.
        state_machine_try_connect_ble();
    }

    if (state_machine_handle_driving_ignition_boundary(now_ms)) {
        // Once the ignition-off hold commits, the next steady state becomes parked behavior.
        return APP_STATE_PARKED;
    }
    return APP_STATE_DRIVING;
}

/**
 * @brief Run one ALARM state iteration.
 *
 * @return Next FSM state.
 */
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

/**
 * @brief Run one HEARTBEAT state iteration.
 *
 * @return Next FSM state.
 */
static app_state_t state_machine_handle_heartbeat_state(void) {
    s_runtime_state_hint = APP_STATE_HEARTBEAT;
    if (s_heartbeat_started_ms == 0) {
        // First entry into the heartbeat window resets the one-shot publish guard.
        s_heartbeat_started_ms = util_uptime_ms();
        s_heartbeat_raw_published = false;
        s_timer_wake_count += 1U;
    }

    // Heartbeat wake uses the lightweight prelude instead of the full driving bootstrap.
    state_machine_run_wake_prelude(false);
    uint64_t now_ms = util_uptime_ms();
    session_mgr_on_ignition_sample(s_telemetry.ignition, now_ms);
    if (s_telemetry.ignition && command_handler_is_tracking_enabled()) {
        // Raw ignition evidence should keep the tracker awake and re-enter the
        // debounce path immediately instead of falling through to a sleep-blocked loop.
        state_machine_reset_heartbeat_window();
        return APP_STATE_CHECK_IGN;
    }
    if (session_mgr_has_stable_ignition() &&
        session_mgr_stable_ignition() &&
        command_handler_is_tracking_enabled()) {
        // A stable ignition-on during heartbeat immediately promotes the device back to driving mode.
        state_machine_resume_restored_session_if_needed(true);
        state_machine_reset_heartbeat_window();
        return APP_STATE_DRIVING;
    }
    bool heartbeat_timeout = (now_ms - s_heartbeat_started_ms) >= TRACKER_HEARTBEAT_ACTIVE_WINDOW_MS;
    bool obd_connected = s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx);
    bool gnss_publish_ready = !s_gnss_started || s_telemetry.gnss.fix_valid || heartbeat_timeout;
    bool network_ready = state_machine_network_ready_for_heartbeat_publish();
    if (!s_heartbeat_raw_published &&
        (!s_ble_connect_inflight || heartbeat_timeout) &&
        (network_ready || heartbeat_timeout) &&
        gnss_publish_ready) {
        // Publish exactly once per heartbeat window after GNSS/network gates are satisfied or timed out.
        if (!state_machine_should_throttle_rawdata()) {
            state_machine_publish_rawdata();
        } else {
            ESP_LOGW(TAG, "event=heartbeat_rawdata_throttled reason=offline_queue_near_quota action=status_only");
        }

        if (!state_machine_has_recent_obd_sample(now_ms, TRACKER_HEARTBEAT_OBD_STALE_WARN_MS)) {
            if (strcmp(s_telemetry.obd_ecu_state, "stopped") == 0) {
                ESP_LOGI(TAG,
                         "event=heartbeat_obd_sample_stale reason=ecu_state_stopped ecu=%s",
                         s_telemetry.obd_ecu_state);
            } else {
                ESP_LOGW(TAG,
                         "event=heartbeat_obd_sample_stale connected=%d ecu=%s age_ms=%lu",
                         obd_connected ? 1 : 0,
                         s_telemetry.obd_ecu_state,
                         (unsigned long)s_telemetry.obd_sample_age_ms);
            }
        }

        state_machine_publish_status("heartbeat", "none");
        s_heartbeat_raw_published = true;
    }

    if (s_heartbeat_raw_published || heartbeat_timeout) {
        /*
         * A restored session that did not revalidate as ignition-ON still
         * represents a drive the cloud may know as running. Reconcile it with
         * an authoritative end boundary before forgetting the persisted
         * identity. Failed delivery keeps NVS intact and sleep is still allowed;
         * the next wake will retry without burning parked power continuously.
         */
        if (s_session_restore_pending) {
            (void)state_machine_reconcile_stale_restored_session();
        }
        state_machine_reset_heartbeat_window();
        return APP_STATE_SLEEP;
    }
    return APP_STATE_HEARTBEAT;
}

/**
 * @brief Run one SLEEP state iteration.
 *
 * @return Next FSM state.
 */
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
                     "event=sleep_blocked reason=%s blocked_count=%lu",
                     reason,
                     (unsigned long)s_sleep_blocked_count);
            s_last_sleep_reject_log_ms = now_ms;
        }
        return APP_STATE_CHECK_IGN;
    }

    s_sleep_enter_count += 1U;
    ESP_LOGI(TAG,
             "event=sleep_accepted enter_count=%lu timer_wake_count=%lu imu_wake_count=%lu false_wake_count=%lu",
             (unsigned long)s_sleep_enter_count,
             (unsigned long)s_timer_wake_count,
             (unsigned long)s_imu_wake_count,
             (unsigned long)s_imu_false_wake_count);
    state_machine_shutdown_for_sleep();
    return state_machine_enter_configured_sleep();
}

/**
 * @brief Initialize the split tracker FSM and its shared subsystem runtime.
 *
 * @param[in] config Runtime configuration snapshot.
 * @return ESP_OK when the tracker runtime initialized successfully.
 */
esp_err_t state_machine_core_init(const config_t *config) {
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");

    // Reset every shared runtime singleton before adapters start filling live state back in.
    state_runtime_context_reset(config);
    util_copy_string(s_telemetry.obd_ecu_state, sizeof(s_telemetry.obd_ecu_state), "unknown");
    ESP_LOGI(TAG,
             "event=runtime_config device=%s mqtt_configured=%d mqtt_port=%u apn_configured=%d tracking=%us heartbeat=%us parked_wake=%us alarm=%us ign_hold_ms=%u sleep=%d imu_wake=%d ota_min_mv=%u",
             s_config.device_id,
             util_string_empty(s_config.mqtt_host) ? 0 : 1,
             (unsigned int)s_config.mqtt_port,
             util_string_empty(s_config.apn) ? 0 : 1,
             (unsigned int)s_config.tracking_interval_s,
             (unsigned int)s_config.heartbeat_interval_s,
             (unsigned int)state_machine_parked_wake_interval_s(),
             (unsigned int)s_config.alarm_interval_s,
             (unsigned int)s_config.ignition_off_hold_ms,
             s_config.sleep_enabled ? 1 : 0,
             s_config.imu_wakeup_enabled ? 1 : 0,
             (unsigned int)s_config.ota_min_battery_mv);

    // Recreate the async BLE connect result channel on every init attempt.
    if (s_ble_connect_result_queue == NULL) {
        s_ble_connect_result_queue = xQueueCreate(1, sizeof(tracker_ble_connect_result_t));
    } else {
        xQueueReset(s_ble_connect_result_queue);
    }
    ESP_RETURN_ON_FALSE(s_ble_connect_result_queue != NULL, ESP_ERR_NO_MEM, TAG, "BLE result queue init failed");

    // Command ACKs are staged by the modem RX callback and published later by the FSM task.
    if (s_command_ack_queue == NULL) {
        s_command_ack_queue = xQueueCreate(TRACKER_COMMAND_ACK_QUEUE_LEN,
                                           sizeof(state_machine_command_ack_t));
    } else {
        xQueueReset(s_command_ack_queue);
    }
    ESP_RETURN_ON_FALSE(s_command_ack_queue != NULL,
                        ESP_ERR_NO_MEM,
                        TAG,
                        "command ACK queue init failed");

    util_set_sleep_enabled(s_config.sleep_enabled);
    if (!util_string_empty(CONFIG_APP_PROJECT_VER)) {
        util_copy_string(s_current_version, sizeof(s_current_version), CONFIG_APP_PROJECT_VER);
    }
    // Boot metadata must exist before any publish path emits message IDs or firmware version fields.
    state_machine_init_boot_metadata();
    s_state_entered_ms = util_uptime_ms();
    s_last_health_snapshot_log_ms = 0;

    // Board-facing drivers come up first because later subsystems depend on battery, power, and wake wiring.
    ESP_RETURN_ON_FALSE(adc_reader_init() == ESP_OK, ESP_FAIL, TAG, "adc_reader_init failed");
    if (!state_machine_imu_runtime_enabled()) {
        ESP_LOGW(TAG, "event=imu_wake_disabled reason=config fallback=timer_only");
    }
    ESP_RETURN_ON_FALSE(power_mgr_init() == ESP_OK, ESP_FAIL, TAG, "power_mgr_init failed");

    // RTC failure is non-fatal because uptime-based fallback timestamps still let the tracker run.
    esp_err_t rtc_init_err = rtc_ds3231m_init();
    if (rtc_init_err != ESP_OK) {
        ESP_LOGW(TAG, "event=rtc_init_failed err=%s fallback=uptime_timebase", esp_err_to_name(rtc_init_err));
    }

    bool rtc_available = false;
    bool rtc_time_valid = false;
    if (rtc_ds3231m_get_health(&rtc_available, &rtc_time_valid) == ESP_OK) {
        ESP_LOGI(TAG, "event=rtc_health available=%d valid=%d", rtc_available ? 1 : 0, rtc_time_valid ? 1 : 0);
    }

    // Seed modem, MQTT, and offline buffering before the FSM starts publishing or consuming commands.
    modem_lte_set_apn(s_config.apn);
    modem_lte_request_connect();
    ESP_RETURN_ON_FALSE(tracker_mqtt_init(&s_config) == ESP_OK, ESP_FAIL, TAG, "tracker_mqtt_init failed");
    ESP_RETURN_ON_FALSE(offline_queue_init() == ESP_OK, ESP_FAIL, TAG, "offline_queue_init failed");
    // Session, command, and metrics subsystems reset after transport setup so they share the same boot baseline.
    telemetry_counters_reset();
    session_mgr_init();
    state_machine_restore_session_context_from_nvs();
    ESP_RETURN_ON_FALSE(command_handler_init(&s_config) == ESP_OK, ESP_FAIL, TAG, "command_handler_init failed");
    tracker_mqtt_set_command_callback(state_machine_command_callback);

    // Confirmation owns persisted-context restore and fresh-boot status.
    // If NVS is temporarily unreadable, later FSM iterations retry safely.
    state_machine_try_confirm_running_firmware();
    return ESP_OK;
}

/**
 * @brief Execute one cooperative FSM iteration.
 *
 * @param[in] current_state Current FSM state.
 * @return Next FSM state.
 */
app_state_t state_machine_core_run(app_state_t current_state) {
    state_led_update(current_state);
    util_set_sleep_enabled(s_config.sleep_enabled);
    state_machine_publish_pending_command_acks();
    state_machine_try_confirm_running_firmware();

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
            // Fresh ignition evidence while parked short-circuits straight back to
            // the debounce path so a real engine-on edge is never missed.
            if (s_telemetry.ignition && command_handler_is_tracking_enabled()) {
                next_state = APP_STATE_CHECK_IGN;
                break;
            }
            // Otherwise arm a new heartbeat window (once) and hand off to it.
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

    // Transition and health logs are emitted after the handler decides the next state.
    uint64_t now_ms = util_uptime_ms();
    bool state_changed = next_state != current_state;
    state_machine_log_transition(current_state, next_state, now_ms);
    state_machine_log_health_snapshot(now_ms, state_changed || current_state == APP_STATE_INIT);
    return next_state;
}

/**
 * @brief Return the latest telemetry snapshot maintained by app-core.
 *
 * @return Current telemetry structure.
 */
telemetry_t state_machine_core_get_telemetry(void) {
    return s_telemetry;
}
