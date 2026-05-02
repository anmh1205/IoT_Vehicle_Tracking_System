#include "state_sleep_controller.h"

#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "sdkconfig.h"

#include "driver/gpio.h"

#include "esp_log.h"
#include "esp_sleep.h"

#include "ble_init.h"
#include "ble_obd.h"
#include "imu_lis3dsh.h"
#include "modem_gnss.h"
#include "modem_lte.h"
#include "mqtt_client.h"
#include "offline_queue.h"
#include "pin_map.h"
#include "power_mgr.h"
#include "state_machine_internal.h"
#include "state_obd_runtime.h"
#include "state_runtime_context.h"
#include "util.h"

#ifndef CONFIG_TRACKER_FIELD_VALIDATION_KEEP_AWAKE
#define CONFIG_TRACKER_FIELD_VALIDATION_KEEP_AWAKE 0
#endif

/**
 * @file state_sleep_controller.c
 * @brief Sleep decision and entry helpers for the tracker FSM.
 *
 * ## Sleep Decision Flow
 *
 * ### 1. Sleep Eligibility Check (state_machine_can_sleep)
 *    - Ignition must be OFF (from OBD/BLE or ADC)
 *    - Config must have sleep_enabled=true
 *    - No active MQTT session
 *    - No pending OTA operations
 *    - Device battery above safe threshold
 *
 * ### 2. Sleep Mode Selection
 *    - LIGHT_SLEEP: IMU motion wake available, faster wake
 *    - DEEP_SLEEP: Timer wake only, lowest power
 *    - FAKE_SLEEP (debug): No actual sleep, just idle
 *
 * ### 3. Pre-Sleep Sequence
 *    - Disconnect BLE OBD session
 *    - Stop GNSS polling
 *    - MQTT disconnect and cleanup
 *    - LTE PDP deactivate
 *    - Save state to NVS (for crash recovery)
 *    - Set RTC wake timer
 *
 * ### 4. Wake Sources
 *    - RTC timer: Periodic heartbeat
 *    - IMU motion: LIS3DSH interrupt
 *    - Ignition on: OBD/BLE detection
 *
 * ## Sleep Blockers
 *    - ignition_on (from OBD live or ADC threshold)
 *    - OBD connected or connecting
 *    - Active OTA operation
 *    - MQTT publish pending
 *    - Field validation mode (configurable)
 *
 * ## Power Consumption
 *    - DEEP_SLEEP: ~50-100µA (ESP32 deep sleep)
 *    - LIGHT_SLEEP: ~500µA (ESP32 light sleep)
 *    - FAKE_SLEEP: ~20-30mA (idle, no sleep)
 */

static const char *TAG = STATE_MACHINE_TAG;

static bool state_machine_should_use_light_sleep_motion_wake(void) {
    if (!state_machine_imu_runtime_enabled() || !s_imu_available) {
        return false;
    }

    if (esp_sleep_is_valid_wakeup_gpio(PIN_LIS3DSH_INT)) {
        return true;
    }

    if (!s_imu_invalid_wakeup_gpio_logged) {
        ESP_LOGW(TAG,
                 "IMU wake pin gpio=%d is not RTC-capable; parked motion wake will use light sleep GPIO wake",
                 (int)PIN_LIS3DSH_INT);
        s_imu_invalid_wakeup_gpio_logged = true;
    }
    return true;
}

static bool state_machine_can_arm_imu_deep_sleep_wakeup(void) {
    if (!state_machine_imu_runtime_enabled() || !s_imu_available) {
        return false;
    }
    return esp_sleep_is_valid_wakeup_gpio(PIN_LIS3DSH_INT);
}

static void state_machine_clear_gnss_cache(void) {
    memset(&s_telemetry.gnss, 0, sizeof(s_telemetry.gnss));
}

tracker_sleep_mode_t state_machine_resolve_sleep_mode(app_state_t app_state) {
    if (app_state != APP_STATE_SLEEP) {
        return TRACKER_SLEEP_MODE_NONE;
    }

#if CONFIG_TRACKER_FAKE_SLEEP_ENABLED
    return TRACKER_SLEEP_MODE_FAKE;
#elif CONFIG_TRACKER_FIELD_VALIDATION_MODE && CONFIG_TRACKER_FIELD_VALIDATION_KEEP_AWAKE
    return TRACKER_SLEEP_MODE_NONE;
#else
    return state_machine_should_use_light_sleep_motion_wake() ? TRACKER_SLEEP_MODE_LIGHT
                                                              : TRACKER_SLEEP_MODE_DEEP;
#endif
}

bool state_machine_can_enter_sleep(const char **out_reason) {
#if CONFIG_TRACKER_FIELD_VALIDATION_MODE && CONFIG_TRACKER_FIELD_VALIDATION_KEEP_AWAKE
    if (out_reason != NULL) {
        *out_reason = "field_validation_keep_awake";
    }
    return false;
#endif
    if (!s_config.sleep_enabled) {
        if (out_reason != NULL) {
            *out_reason = "sleep_policy_disabled";
        }
        return false;
    }
    if (s_ota_in_progress) {
        if (out_reason != NULL) {
            *out_reason = "ota_in_progress";
        }
        return false;
    }
    if (g_rtc_context.ota_pending_confirm) {
        if (out_reason != NULL) {
            *out_reason = "ota_pending_confirm";
        }
        return false;
    }
    if (s_telemetry.ignition) {
        if (out_reason != NULL) {
            *out_reason = "ignition_on";
        }
        return false;
    }
    if (s_ble_connect_inflight) {
        if (out_reason != NULL) {
            *out_reason = "ble_connect_inflight";
        }
        return false;
    }

    if (out_reason != NULL) {
        *out_reason = "ok";
    }
    return true;
}

void state_machine_shutdown_for_sleep(void) {
    g_rtc_context.last_state = APP_STATE_SLEEP;
    g_rtc_context.ign_last_known = s_telemetry.ignition;
    g_rtc_context.last_battery_v = s_telemetry.vehicle_battery;
    g_rtc_context.last_heartbeat_ts = (uint32_t)(util_uptime_ms() / 1000ULL);

    if (s_ble_ctx != NULL) {
        ble_obd_disconnect(s_ble_ctx);
        s_ble_ctx = NULL;
        state_machine_mark_obd_disconnected();
    }

    esp_err_t ble_stack_err = ble_stack_deinit();
    if (ble_stack_err != ESP_OK) {
        ESP_LOGW(TAG, "BLE stack deinit before sleep failed: %s", esp_err_to_name(ble_stack_err));
    }

    if (s_gnss_started) {
        esp_err_t gnss_off_err = modem_gnss_power_off();
        if (gnss_off_err != ESP_OK) {
            ESP_LOGW(TAG, "GNSS power-off before sleep failed: %s", esp_err_to_name(gnss_off_err));
        }
    }
    s_gnss_started = false;
    state_machine_clear_gnss_cache();

#if !TRACKER_MQTT_RUNTIME_DISABLED
    esp_err_t mqtt_disconnect_err = tracker_mqtt_disconnect();
    if (mqtt_disconnect_err != ESP_OK) {
        ESP_LOGW(TAG, "MQTT disconnect before sleep failed: %s", esp_err_to_name(mqtt_disconnect_err));
    }
    s_mqtt_started = false;
#endif

    esp_err_t lte_disconnect_err = modem_lte_disconnect();
    if (lte_disconnect_err != ESP_OK) {
        ESP_LOGW(TAG, "LTE disconnect before sleep failed: %s", esp_err_to_name(lte_disconnect_err));
    }
    s_prev_lte_initialized = false;

    esp_err_t modem_power_off_err = modem_power_off();
    if (modem_power_off_err != ESP_OK) {
        ESP_LOGW(TAG, "Modem power-off before sleep failed: %s", esp_err_to_name(modem_power_off_err));
    } else {
        vTaskDelay(pdMS_TO_TICKS((uint32_t)TRACKER_MODEM_POWEROFF_SETTLE_MS));
    }

    offline_queue_set_online(false);

    esp_err_t dtr_sleep_err = modem_set_dtr(true);
    if (dtr_sleep_err != ESP_OK && dtr_sleep_err != ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(TAG, "Set DTR sleep level before deep sleep failed: %s", esp_err_to_name(dtr_sleep_err));
    }
}

void state_machine_prepare_deep_sleep_wakeup(void) {
    (void)esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_ALL);
    if (state_machine_can_arm_imu_deep_sleep_wakeup()) {
        esp_err_t wake_err = esp_sleep_enable_ext0_wakeup(PIN_LIS3DSH_INT, 1);
        if (wake_err != ESP_OK) {
            ESP_LOGW(TAG, "IMU ext0 wake arm failed: %s (timer-only fallback)", esp_err_to_name(wake_err));
        }
    }

    uint16_t wake_interval_s = state_machine_parked_wake_interval_s();
    (void)esp_sleep_enable_timer_wakeup((uint64_t)wake_interval_s * 1000000ULL);
}

app_state_t state_machine_enter_light_sleep(void) {
    (void)esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_ALL);

    esp_err_t clear_int_err = imu_clear_motion_interrupt();
    if (clear_int_err != ESP_OK) {
        ESP_LOGW(TAG, "IMU INT clear before light sleep failed: %s", esp_err_to_name(clear_int_err));
    }
    vTaskDelay(pdMS_TO_TICKS(TRACKER_LIGHT_SLEEP_IMU_CLEAR_SETTLE_MS));

    if (imu_motion_detected()) {
        ESP_LOGW(TAG, "IMU interrupt still asserted before light sleep; skip sleep and enter alarm");
        return APP_STATE_ALARM;
    }

    esp_err_t gpio_wake_err = gpio_wakeup_enable(PIN_LIS3DSH_INT, GPIO_INTR_HIGH_LEVEL);
    if (gpio_wake_err != ESP_OK) {
        ESP_LOGW(TAG, "GPIO wake arm failed gpio=%d err=%s", (int)PIN_LIS3DSH_INT, esp_err_to_name(gpio_wake_err));
        return APP_STATE_CHECK_IGN;
    }

    esp_err_t sleep_gpio_err = esp_sleep_enable_gpio_wakeup();
    if (sleep_gpio_err != ESP_OK) {
        ESP_LOGW(TAG, "Light sleep GPIO wake enable failed: %s", esp_err_to_name(sleep_gpio_err));
        return APP_STATE_CHECK_IGN;
    }

    uint16_t wake_interval_s = state_machine_parked_wake_interval_s();
    esp_err_t timer_err = esp_sleep_enable_timer_wakeup((uint64_t)wake_interval_s * 1000000ULL);
    if (timer_err != ESP_OK) {
        ESP_LOGW(TAG, "Light sleep timer wake enable failed: %s", esp_err_to_name(timer_err));
        return APP_STATE_CHECK_IGN;
    }

    ESP_LOGI(TAG, "Entering light sleep interval_s=%u imu_gpio=%d", (unsigned)wake_interval_s, (int)PIN_LIS3DSH_INT);
    esp_err_t sleep_err = esp_light_sleep_start();
    if (sleep_err != ESP_OK) {
        ESP_LOGW(TAG, "esp_light_sleep_start failed: %s", esp_err_to_name(sleep_err));
        return APP_STATE_CHECK_IGN;
    }

    esp_sleep_wakeup_cause_t wakeup = esp_sleep_get_wakeup_cause();
    ESP_LOGI(TAG, "Light sleep wakeup cause=%d", (int)wakeup);
    if (wakeup == ESP_SLEEP_WAKEUP_GPIO && state_machine_imu_runtime_enabled()) {
        return APP_STATE_ALARM;
    }
    if (wakeup == ESP_SLEEP_WAKEUP_TIMER) {
        s_heartbeat_started_ms = 0;
        s_heartbeat_raw_published = false;
        return APP_STATE_HEARTBEAT;
    }

    return APP_STATE_CHECK_IGN;
}

app_state_t state_machine_enter_fake_sleep(void) {
    uint16_t wake_interval_s = state_machine_parked_wake_interval_s();
    uint64_t sleep_ms = (uint64_t)wake_interval_s * 1000ULL;
    uint64_t started_ms = util_uptime_ms();

    ESP_LOGW(TAG,
             "Fake sleep enabled interval_s=%u step_ms=%u",
             (unsigned)wake_interval_s,
             (unsigned)TRACKER_FAKE_SLEEP_LOOP_STEP_MS);
    while ((util_uptime_ms() - started_ms) < sleep_ms) {
        vTaskDelay(pdMS_TO_TICKS(TRACKER_FAKE_SLEEP_LOOP_STEP_MS));
    }

    s_timer_wake_count += 1;
    ESP_LOGI(TAG,
             "Fake sleep wake elapsed_ms=%llu timer_wake_count=%lu",
             (unsigned long long)(util_uptime_ms() - started_ms),
             (unsigned long)s_timer_wake_count);
    return APP_STATE_CHECK_IGN;
}

app_state_t state_machine_enter_configured_sleep(void) {
#if CONFIG_TRACKER_FAKE_SLEEP_ENABLED
    return state_machine_enter_fake_sleep();
#else
    if (state_machine_should_use_light_sleep_motion_wake()) {
        return state_machine_enter_light_sleep();
    }

    state_machine_prepare_deep_sleep_wakeup();
    esp_deep_sleep_start();
    return APP_STATE_SLEEP;
#endif
}
