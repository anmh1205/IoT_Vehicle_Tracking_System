#include "tracker_feature_self_test.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_sleep.h"
#include "adc_reader.h"
#include "app_state.h"
#include "imu_lis3dh.h"
#include "modem_lte.h"
#include "mqtt_client.h"
#include "mqtt_internal.h"
#include "nvs_config.h"
#include "offline_queue.h"
#include "power_mgr.h"
#include "rtc_ds3231m.h"
#include "sd_log_store.h"
#include "state_runtime_context.h"
#include "state_wake_prelude.h"
#include "util.h"

#define TRACKER_SELF_TEST_WINDOW_MS 45000ULL
#define TRACKER_SELF_TEST_STEP_MS 200U
#define TRACKER_SELF_TEST_LOG_INTERVAL_MS 1000ULL

static const char *TAG = "TRACKER_SELF_TEST";

typedef enum {
    TRACKER_SELF_TEST_SKIP = 0,
    TRACKER_SELF_TEST_WAIT,
    TRACKER_SELF_TEST_PASS,
    TRACKER_SELF_TEST_FAIL,
} tracker_self_test_status_t;

typedef struct {
    tracker_self_test_status_t adc;
    tracker_self_test_status_t rtc;
    tracker_self_test_status_t sd;
    tracker_self_test_status_t offline_queue;
    tracker_self_test_status_t imu;
    tracker_self_test_status_t power_io;
    tracker_self_test_status_t lte;
    tracker_self_test_status_t mqtt;
    tracker_self_test_status_t commands;
    tracker_self_test_status_t gnss;
    tracker_self_test_status_t gnss_fix;
    tracker_self_test_status_t obd_ble;
    tracker_self_test_status_t obd_elm;
    tracker_self_test_status_t ota_context;
    tracker_self_test_status_t rtc_rw;
    tracker_self_test_status_t sd_rw;
    tracker_self_test_status_t sleep_cfg;
    tracker_self_test_status_t imu_wake_cfg;
} tracker_feature_self_test_result_t;

static const char *tracker_self_test_status_label(tracker_self_test_status_t status) {
    switch (status) {
        case TRACKER_SELF_TEST_PASS:
            return "PASS";
        case TRACKER_SELF_TEST_FAIL:
            return "FAIL";
        case TRACKER_SELF_TEST_SKIP:
            return "SKIP";
        default:
            return "WAIT";
    }
}
static void tracker_self_test_set_if_worse(tracker_self_test_status_t *target, tracker_self_test_status_t next) {
    if (*target == TRACKER_SELF_TEST_PASS || *target == TRACKER_SELF_TEST_FAIL) {
        return;
    }
    *target = next;
}

static void tracker_self_test_run_sync_checks(const config_t *config,
                                              tracker_feature_self_test_result_t *result,
                                              sd_log_stats_t *out_sd_stats) {
    float battery_v = adc_read_battery_voltage();
    float supply_v = adc_read_supply_voltage();
    result->adc = (battery_v > 0.0f || supply_v > 0.0f) ? TRACKER_SELF_TEST_PASS : TRACKER_SELF_TEST_FAIL;
    bool rtc_available = false;
    bool rtc_time_valid = false;
    esp_err_t rtc_err = rtc_ds3231m_get_health(&rtc_available, &rtc_time_valid);
    result->rtc = rtc_err != ESP_OK ? TRACKER_SELF_TEST_FAIL
                                    : (rtc_available ? TRACKER_SELF_TEST_PASS : TRACKER_SELF_TEST_WAIT);
    uint64_t rtc_time_ms = 0;
    esp_err_t rtc_read_err = rtc_ds3231m_get_time_ms(&rtc_time_ms);
    esp_err_t rtc_write_err = rtc_read_err == ESP_OK ? rtc_ds3231m_set_time_ms(rtc_time_ms) : ESP_FAIL;
    if (!rtc_available) {
        result->rtc_rw = TRACKER_SELF_TEST_SKIP;
    } else if (rtc_read_err == ESP_OK && rtc_write_err == ESP_OK) {
        result->rtc_rw = TRACKER_SELF_TEST_PASS;
    } else if (rtc_read_err == ESP_OK) {
        result->rtc_rw = TRACKER_SELF_TEST_WAIT;
    } else {
        result->rtc_rw = TRACKER_SELF_TEST_FAIL;
    }
    esp_err_t sd_err = sd_log_store_get_stats(out_sd_stats);
    result->sd = sd_err != ESP_OK ? TRACKER_SELF_TEST_FAIL
                                  : (out_sd_stats->mounted ? TRACKER_SELF_TEST_PASS : TRACKER_SELF_TEST_WAIT);
    result->offline_queue = sd_err == ESP_OK ? TRACKER_SELF_TEST_PASS : TRACKER_SELF_TEST_FAIL;
    sd_log_meta_t sd_meta = {0};
    esp_err_t sd_meta_err = sd_log_store_get_meta(&sd_meta);
    esp_err_t sd_replay_write_err = sd_meta_err == ESP_OK ? sd_log_store_set_replay_seq(sd_meta.replay_seq) : ESP_FAIL;
    esp_err_t sd_ack_write_err =
        sd_meta_err == ESP_OK ? sd_log_store_set_ack_seq_critical(sd_meta.ack_seq_critical) : ESP_FAIL;
    if (sd_meta_err == ESP_OK && sd_replay_write_err == ESP_OK && sd_ack_write_err == ESP_OK) {
        result->sd_rw = TRACKER_SELF_TEST_PASS;
    } else if (out_sd_stats->mounted) {
        result->sd_rw = TRACKER_SELF_TEST_WAIT;
    } else {
        result->sd_rw = TRACKER_SELF_TEST_SKIP;
    }
    esp_err_t imu_err = imu_init();
    int16_t accel_x = 0;
    int16_t accel_y = 0;
    int16_t accel_z = 0;
    if (imu_err == ESP_OK && imu_read_accel(&accel_x, &accel_y, &accel_z) == ESP_OK) {
        result->imu = TRACKER_SELF_TEST_PASS;
    } else if (imu_err == ESP_OK) {
        result->imu = TRACKER_SELF_TEST_WAIT;
    } else {
        result->imu = TRACKER_SELF_TEST_FAIL;
    }
    ota_persist_context_t ota_context = {0};
    bool ota_found = false;
    result->ota_context = nvs_config_load_ota_context(&ota_context, &ota_found) == ESP_OK
                              ? TRACKER_SELF_TEST_PASS
                              : TRACKER_SELF_TEST_FAIL;
    bool modem_status_level = false;
    bool modem_netlight_level = false;
    esp_err_t modem_status_err = modem_read_status(&modem_status_level);
    esp_err_t modem_netlight_err = modem_read_netlight(&modem_netlight_level);
    bool status_ok = modem_status_err == ESP_OK || modem_status_err == ESP_ERR_NOT_SUPPORTED;
    bool netlight_ok = modem_netlight_err == ESP_OK || modem_netlight_err == ESP_ERR_NOT_SUPPORTED;
    result->power_io = (status_ok && netlight_ok) ? TRACKER_SELF_TEST_PASS : TRACKER_SELF_TEST_FAIL;
    result->sleep_cfg = config->sleep_enabled ? TRACKER_SELF_TEST_PASS : TRACKER_SELF_TEST_SKIP;
    result->imu_wake_cfg = config->imu_wakeup_enabled ? TRACKER_SELF_TEST_PASS : TRACKER_SELF_TEST_SKIP;

    ESP_LOGI(TAG,
             "sync adc=%s batt=%.2fV supply=%.2fV rtc=%s rtc_rw=%s available=%d valid=%d sd=%s sd_rw=%s mounted=%d queue=%s depth=%lu imu=%s accel=[%d,%d,%d] power_io=%s status_err=%s status_lv=%d netlight_err=%s netlight_lv=%d ota_ctx=%s ota_found=%d sleep_cfg=%s imu_wake_cfg=%s",
             tracker_self_test_status_label(result->adc),
             (double)battery_v,
             (double)supply_v,
             tracker_self_test_status_label(result->rtc),
             tracker_self_test_status_label(result->rtc_rw),
             rtc_available ? 1 : 0,
             rtc_time_valid ? 1 : 0,
             tracker_self_test_status_label(result->sd),
             tracker_self_test_status_label(result->sd_rw),
             out_sd_stats->mounted ? 1 : 0,
             tracker_self_test_status_label(result->offline_queue),
             (unsigned long)offline_queue_depth(),
             tracker_self_test_status_label(result->imu),
             (int)accel_x,
             (int)accel_y,
             (int)accel_z,
             tracker_self_test_status_label(result->power_io),
             esp_err_to_name(modem_status_err),
             modem_status_level ? 1 : 0,
             esp_err_to_name(modem_netlight_err),
             modem_netlight_level ? 1 : 0,
             tracker_self_test_status_label(result->ota_context),
             ota_found ? 1 : 0,
             tracker_self_test_status_label(result->sleep_cfg),
             tracker_self_test_status_label(result->imu_wake_cfg));
}
static void tracker_self_test_log_runtime(uint64_t elapsed_ms,
                                          const tracker_feature_self_test_result_t *result,
                                          const telemetry_t *telemetry,
                                          const sd_log_stats_t *sd_stats) {
    ESP_LOGI(TAG,
             "runtime t=%llums lte=%s mqtt=%s commands=%s gnss=%s gnss_fix=%s obd_ble=%s obd_elm=%s time_trusted=%d queue_depth=%lu sd_mounted=%d rssi=%d gps_fix=%d sats=%u obd_state=%s batt=%.2fV speed=%ld",
             (unsigned long long)elapsed_ms,
             tracker_self_test_status_label(result->lte),
             tracker_self_test_status_label(result->mqtt),
             tracker_self_test_status_label(result->commands),
             tracker_self_test_status_label(result->gnss),
             tracker_self_test_status_label(result->gnss_fix),
             tracker_self_test_status_label(result->obd_ble),
             tracker_self_test_status_label(result->obd_elm),
             s_time_trusted ? 1 : 0,
             (unsigned long)offline_queue_depth(),
             sd_stats->mounted ? 1 : 0,
             modem_lte_get_rssi(),
             telemetry->gnss.fix_valid ? 1 : 0,
             (unsigned)telemetry->gnss.satellites,
             telemetry->obd_ecu_state,
             (double)telemetry->battery_top,
             (long)telemetry->obd_speed);
}

void tracker_feature_self_test_run(const config_t *config) {
    if (config == NULL) {
        ESP_LOGE(TAG, "skip self-test because config is NULL");
        return;
    }
    tracker_feature_self_test_result_t result = {
        .commands = config->command_subscribe_enabled ? TRACKER_SELF_TEST_WAIT : TRACKER_SELF_TEST_SKIP,
        .gnss = TRACKER_SELF_TEST_WAIT,
        .gnss_fix = TRACKER_SELF_TEST_WAIT,
        .obd_ble = TRACKER_SELF_TEST_WAIT,
        .obd_elm = TRACKER_SELF_TEST_WAIT,
        .lte = TRACKER_SELF_TEST_WAIT,
        .mqtt = TRACKER_SELF_TEST_WAIT,
    };
    sd_log_stats_t sd_stats = {0};
    tracker_self_test_run_sync_checks(config, &result, &sd_stats);
    ESP_LOGW(TAG,
             "begin full feature self-test window_ms=%llu wakeup=%d mqtt_host=%s commands=%d sleep=%d imu_wake=%d",
             (unsigned long long)TRACKER_SELF_TEST_WINDOW_MS,
             (int)esp_sleep_get_wakeup_cause(),
             config->mqtt_host,
             config->command_subscribe_enabled ? 1 : 0,
             config->sleep_enabled ? 1 : 0,
             config->imu_wakeup_enabled ? 1 : 0);
    uint64_t started_ms = util_uptime_ms();
    uint64_t next_log_ms = started_ms;
    while ((util_uptime_ms() - started_ms) < TRACKER_SELF_TEST_WINDOW_MS) {
        state_machine_run_wake_prelude(true);
        telemetry_t telemetry = state_machine_get_telemetry();
        if (sd_log_store_get_stats(&sd_stats) != ESP_OK) {
            result.sd = TRACKER_SELF_TEST_FAIL;
            result.offline_queue = TRACKER_SELF_TEST_FAIL;
        } else if (sd_stats.mounted) {
            tracker_self_test_set_if_worse(&result.sd, TRACKER_SELF_TEST_PASS);
            tracker_self_test_set_if_worse(&result.offline_queue, TRACKER_SELF_TEST_PASS);
        }

        if (modem_lte_is_initialized()) {
            tracker_self_test_set_if_worse(&result.lte, TRACKER_SELF_TEST_PASS);
        }
        if (tracker_mqtt_is_connected()) {
            tracker_self_test_set_if_worse(&result.mqtt, TRACKER_SELF_TEST_PASS);
        }
        if (config->command_subscribe_enabled && s_commands_subscribed) {
            tracker_self_test_set_if_worse(&result.commands, TRACKER_SELF_TEST_PASS);
        }
        if (s_gnss_started) {
            tracker_self_test_set_if_worse(&result.gnss, TRACKER_SELF_TEST_PASS);
        }
        if (telemetry.gnss.fix_valid) {
            tracker_self_test_set_if_worse(&result.gnss_fix, TRACKER_SELF_TEST_PASS);
        }
        if (telemetry.obd_ble_connected) {
            tracker_self_test_set_if_worse(&result.obd_ble, TRACKER_SELF_TEST_PASS);
        }
        if (telemetry.obd_elm_ready) {
            tracker_self_test_set_if_worse(&result.obd_elm, TRACKER_SELF_TEST_PASS);
        }
        if (s_imu_available) {
            tracker_self_test_set_if_worse(&result.imu, TRACKER_SELF_TEST_PASS);
        }
        uint64_t now_ms = util_uptime_ms();
        if (now_ms >= next_log_ms) {
            tracker_self_test_log_runtime(now_ms - started_ms, &result, &telemetry, &sd_stats);
            next_log_ms = now_ms + TRACKER_SELF_TEST_LOG_INTERVAL_MS;
        }
        vTaskDelay(pdMS_TO_TICKS(TRACKER_SELF_TEST_STEP_MS));
    }
    telemetry_t final_telemetry = state_machine_get_telemetry();
    ESP_LOGW(TAG,
             "summary adc=%s rtc=%s rtc_rw=%s sd=%s sd_rw=%s queue=%s imu=%s power_io=%s lte=%s mqtt=%s commands=%s gnss=%s gnss_fix=%s obd_ble=%s obd_elm=%s ota_ctx=%s sleep_cfg=%s imu_wake_cfg=%s final_obd=%s final_fix=%d final_queue_depth=%lu",
             tracker_self_test_status_label(result.adc),
             tracker_self_test_status_label(result.rtc),
             tracker_self_test_status_label(result.rtc_rw),
             tracker_self_test_status_label(result.sd),
             tracker_self_test_status_label(result.sd_rw),
             tracker_self_test_status_label(result.offline_queue),
             tracker_self_test_status_label(result.imu),
             tracker_self_test_status_label(result.power_io),
             tracker_self_test_status_label(result.lte),
             tracker_self_test_status_label(result.mqtt),
             tracker_self_test_status_label(result.commands),
             tracker_self_test_status_label(result.gnss),
             tracker_self_test_status_label(result.gnss_fix),
             tracker_self_test_status_label(result.obd_ble),
             tracker_self_test_status_label(result.obd_elm),
             tracker_self_test_status_label(result.ota_context),
             tracker_self_test_status_label(result.sleep_cfg),
             tracker_self_test_status_label(result.imu_wake_cfg),
             final_telemetry.obd_ecu_state,
             final_telemetry.gnss.fix_valid ? 1 : 0,
             (unsigned long)offline_queue_depth());
}
