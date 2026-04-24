#include "state_obd_runtime.h"

#include <stdlib.h>
#include <string.h>

#include "freertos/task.h"

#include "esp_log.h"

#include "obd.h"
#include "state_machine_internal.h"
#include "state_publish_pipeline.h"
#include "util.h"

/**
 * @file state_obd_runtime.c
 * @brief OBD decoding and BLE OBD session orchestration for the tracker FSM.
 */

static const char *TAG = STATE_MACHINE_TAG;

int obd_convert_rpm(int32_t *value, const uint8_t *data, size_t len) {
    if (value == NULL || data == NULL || len < 2) {
        return -1;
    }
    *value = ((data[0] << 8) | data[1]) / 4;
    return 0;
}

int obd_convert_percent(int32_t *value, const uint8_t *data, size_t len) {
    if (value == NULL || data == NULL || len < 1) {
        return -1;
    }
    *value = (data[0] * 100) / 255;
    return 0;
}

int obd_convert_temperature(int32_t *value, const uint8_t *data, size_t len) {
    if (value == NULL || data == NULL || len < 1) {
        return -1;
    }
    *value = (int32_t)data[0] - 40;
    return 0;
}

static void state_machine_reset_dtc_list(obd_dtc_list_t *list, bool valid) {
    if (list == NULL) {
        return;
    }

    memset(list, 0, sizeof(*list));
    list->valid = valid;
}

static bool state_machine_format_dtc_code(uint8_t high, uint8_t low, char out[TRACKER_OBD_DTC_CODE_LEN]) {
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

static void state_machine_decode_dtc_payload(obd_dtc_list_t *list, const uint8_t *data, size_t len) {
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

static obd_monitor_status_t state_machine_decode_monitor_status(uint8_t supported_bits,
                                                                uint8_t incomplete_bits,
                                                                uint8_t bit_index) {
    uint8_t mask = (uint8_t)(1U << bit_index);
    if ((supported_bits & mask) == 0U) {
        return OBD_MONITOR_STATUS_UNSUPPORTED;
    }

    return (incomplete_bits & mask) != 0U ? OBD_MONITOR_STATUS_INCOMPLETE
                                          : OBD_MONITOR_STATUS_COMPLETE;
}

static void state_machine_decode_readiness_payload(obd_readiness_t *readiness,
                                                   const uint8_t *data,
                                                   size_t len) {
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

static void state_machine_clear_obd_diagnostic_query(uint8_t mode, int pid) {
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

void state_machine_obd_response_cb(uint8_t mode, int pid, const uint8_t *data, size_t len, void *usr_ctx) {
    (void)usr_ctx;

    int32_t converted = 0;
    bool updated = false;
    if (data == NULL || len == 0) {
        state_machine_clear_obd_diagnostic_query(mode, pid);
        return;
    }

    if (mode == OBD_MODE_CURRENT_DATA && pid >= 0 && (uint8_t)pid == OBD_PID_MONITOR_STATUS) {
        state_machine_decode_readiness_payload(&s_telemetry.obd_readiness, data, len);
        return;
    }
    if (mode == OBD_MODE_STORED_DTC) {
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
        s_last_obd_sample_ms = util_uptime_ms();
    }
}

void state_machine_obd_refresh_fail_window(uint64_t now_ms) {
    if (s_obd_fail_window_started_ms == 0 ||
        now_ms < s_obd_fail_window_started_ms ||
        (now_ms - s_obd_fail_window_started_ms) >= TRACKER_OBD_FAIL_WINDOW_MS) {
        s_obd_fail_window_started_ms = now_ms;
        s_obd_fail_window_count = 0;
    }
}

static const retry_policy_t *state_machine_current_ble_retry_policy(void) {
    return s_telemetry.ignition ? &g_state_ble_retry_policy : &g_state_ble_retry_parked_policy;
}

static void state_machine_schedule_ble_retry(uint64_t now_ms, const char *reason, const retry_policy_t *policy) {
    const retry_policy_t *active_policy = policy != NULL ? policy : &g_state_ble_retry_policy;
    uint32_t delay_ms = retry_state_current_delay_ms(&s_ble_retry, active_policy, now_ms);
    esp_err_t sched_err = retry_state_schedule(&s_ble_retry, active_policy, now_ms, ESP_FAIL);
    if (sched_err != ESP_OK) {
        return;
    }

    if ((s_ble_retry.attempts % 10U) == 1U) {
        ESP_LOGE(TAG,
                 "retry step=%s err=%s attempt=%lu next_delay_ms=%lu",
                 reason,
                 esp_err_to_name(ESP_FAIL),
                 (unsigned long)s_ble_retry.attempts,
                 (unsigned long)delay_ms);
    }
}

static void state_machine_obd_record_connect_failure(uint64_t now_ms) {
    state_machine_obd_refresh_fail_window(now_ms);
    s_obd_fail_window_count += 1U;
}

static void state_machine_publish_obd_failure_event_if_needed(uint64_t now_ms,
                                                              int code,
                                                              const char *message) {
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

static bool state_machine_prime_obd_after_connect(ble_obd_ctx_t *ctx) {
    if (ctx == NULL) {
        return false;
    }

    static const uint8_t s_prime_pids[] = {0x00, 0x0D, 0x0C, 0x05};
    uint64_t sample_before_ms = s_last_obd_sample_ms;
    for (size_t attempt = 0; attempt < 3U; ++attempt) {
        for (size_t i = 0; i < ARRAY_SIZE(s_prime_pids); ++i) {
            uint8_t pid = s_prime_pids[i];
            if (ble_obd_rxtx(ctx, OBD_MODE_CURRENT_DATA, pid, TRACKER_OBD_PID_TIMEOUT_MS) == 0 &&
                s_last_obd_sample_ms != 0 &&
                s_last_obd_sample_ms != sample_before_ms) {
                ESP_LOGI(TAG, "OBD prime sample ready pid=0x%02X", pid);
                return true;
            }
            vTaskDelay(pdMS_TO_TICKS(75));
        }
    }

    ESP_LOGW(TAG,
             "OBD prime finished without fresh PID sample after connect state=%s",
             ble_obd_get_last_ecu_state_label(ctx));
    return false;
}

void state_machine_run_obd_diagnostic_query(ble_obd_ctx_t *ctx, const tracker_obd_diag_query_t *query) {
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
             "OBD diagnostic query failed mode=0x%02X pid=%d state=%s clear=%d",
             (unsigned)query->mode,
             query->pid,
             ecu_state,
             no_data ? 1 : 0);
}

static void state_machine_prime_obd_diagnostics_after_connect(ble_obd_ctx_t *ctx) {
    static const tracker_obd_diag_query_t s_diag_queries[] = {
        {.mode = OBD_MODE_CURRENT_DATA, .pid = OBD_PID_MONITOR_STATUS},
        {.mode = OBD_MODE_STORED_DTC, .pid = -1},
        {.mode = OBD_MODE_PENDING_DTC, .pid = -1},
        {.mode = OBD_MODE_PERMANENT_DTC, .pid = -1},
    };

    if (ctx == NULL) {
        return;
    }

    for (size_t i = 0; i < ARRAY_SIZE(s_diag_queries); ++i) {
        state_machine_run_obd_diagnostic_query(ctx, &s_diag_queries[i]);
        vTaskDelay(pdMS_TO_TICKS(75));
    }
}

static void state_machine_ble_connect_task(void *arg) {
    tracker_ble_connect_task_args_t *task_args = (tracker_ble_connect_task_args_t *)arg;
    tracker_ble_connect_result_t result = {
        .ctx = NULL,
        .code = TRACKER_BLE_CONNECT_RESULT_CONNECT_FAILED,
        .started_ms = task_args != NULL ? task_args->started_ms : util_uptime_ms(),
        .prime_sample_ready = false,
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

bool state_machine_handle_ble_connect_result(void) {
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
                     "BLE OBD connected + ELM327 ready duration_ms=%llu",
                     (unsigned long long)(util_uptime_ms() - result.started_ms));
            if (!result.prime_sample_ready) {
                ESP_LOGW(TAG,
                         "BLE OBD connected but ECU has not returned a fresh PID sample yet");
            }
            continue;
        }

        s_obd_elm_ready = false;
        s_ble_ctx = NULL;
        s_last_obd_sample_ms = 0;
        s_last_obd_diagnostic_poll_ms = 0;
        s_obd_diag_query_cursor = 0;
        util_copy_string(s_telemetry.obd_ecu_state, sizeof(s_telemetry.obd_ecu_state), "disconnected");
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

void state_machine_try_connect_ble(void) {
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
        retry_state_reset(&s_ble_retry);
    }
    s_ble_retry_last_ignition = s_telemetry.ignition;

    if (!retry_state_can_run(&s_ble_retry, now_ms)) {
        return;
    }
    if ((s_ble_retry.attempts % 5U) == 0U) {
        const char *mode = s_telemetry.ignition ? "driving" : "parked";
        ESP_LOGI(TAG,
                 "BLE connect attempt=%lu mode=%s timeout_ms=%u",
                 (unsigned long)(s_ble_retry.attempts + 1U),
                 mode,
                 (unsigned int)TRACKER_BLE_CONNECT_TIMEOUT_MS);
    }

    if (s_ble_ctx != NULL) {
        ble_obd_disconnect(s_ble_ctx);
        s_ble_ctx = NULL;
        s_obd_elm_ready = false;
        s_last_obd_sample_ms = 0;
    }

    bool has_preferred_mac = !util_string_empty(s_config.obd2_ble_address);
    if (!has_preferred_mac) {
        if ((s_ble_retry.attempts % 10U) == 0U) {
            ESP_LOGW(TAG, "BLE connect mode: auto-discover (preferred MAC missing/invalid)");
        }
    } else if ((s_ble_retry.attempts % 10U) == 0U) {
        ESP_LOGI(TAG, "BLE connect mode: preferred-mac (%s)", s_config.obd2_ble_address);
    }

    tracker_ble_connect_task_args_t *task_args = calloc(1, sizeof(*task_args));
    if (task_args == NULL) {
        s_obd_elm_ready = false;
        state_machine_publish_obd_failure_event_if_needed(now_ms,
                                                          TRACKER_EVENT_CODE_OBD_CONNECT_FAILED,
                                                          "obd_connect_failed");
        state_machine_schedule_ble_retry(now_ms,
                                         "connect_or_ble_stack_or_elm327_init_failed",
                                         ble_retry_policy);
        return;
    }

    task_args->started_ms = now_ms;
    util_copy_string(task_args->preferred_mac, sizeof(task_args->preferred_mac), s_config.obd2_ble_address);
    if (xTaskCreate(state_machine_ble_connect_task,
                    "ble_obd_conn",
                    TRACKER_BLE_CONNECT_TASK_STACK_BYTES,
                    task_args,
                    5,
                    NULL) != pdPASS) {
        free(task_args);
        s_obd_elm_ready = false;
        state_machine_publish_obd_failure_event_if_needed(now_ms,
                                                          TRACKER_EVENT_CODE_OBD_CONNECT_FAILED,
                                                          "obd_connect_failed");
        state_machine_schedule_ble_retry(now_ms,
                                         "connect_or_ble_stack_or_elm327_init_failed",
                                         ble_retry_policy);
        return;
    }

    s_ble_connect_inflight = true;
    s_ble_connect_started_ms = now_ms;
}
