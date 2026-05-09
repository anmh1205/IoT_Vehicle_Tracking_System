#include "state_sleep_controller.h"

#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "sdkconfig.h"

#include "driver/gpio.h"
#if CONFIG_ESP_CONSOLE_USB_SERIAL_JTAG_ENABLED
#include "driver/usb_serial_jtag.h"
#endif

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
#include "session_mgr.h"
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
 *    - DEEP_SLEEP: ~50-100 uA (ESP32 deep sleep)
 *    - LIGHT_SLEEP: ~500 uA (ESP32 light sleep)
 *    - FAKE_SLEEP: ~20-30mA (idle, no sleep)
 */

// File-local constants, retained state, and helper wiring stay private here so
// higher layers interact with this module through its exported contract.


static const char *TAG = STATE_MACHINE_TAG;

static void state_machine_prepare_deep_sleep_wakeup_for_interval_us(uint64_t wake_interval_us);
static app_state_t state_machine_enter_light_sleep_for_interval_us(uint64_t wake_interval_us,
                                                                   bool allow_usb_guard);

/**
 * @brief Report whether a USB Serial/JTAG host is still attached.
 *
 * Native USB Serial/JTAG can remain enumerated but stop behaving reliably for
 * flash/monitor if the firmware enters light/deep sleep while a host session is
 * attached. When a debug host is present, downgrade to a guarded pseudo-sleep
 * backend instead of keeping the full runtime awake.
 *
 * @return true when a USB Serial/JTAG host is currently attached.
 */
static bool state_machine_usb_console_host_connected(void) {
#if CONFIG_ESP_CONSOLE_USB_SERIAL_JTAG_ENABLED
    return usb_serial_jtag_is_connected();
#else
    return false;
#endif
}

/**
 * @brief Decide whether parked motion wake should use light sleep.
 *
 * Light sleep is preferred whenever IMU wake is enabled because it can use the
 * regular GPIO wake path even on boards where the IMU interrupt pin is not
 * RTC-capable for deep sleep ext0 wake.
 *
 * @return true when the parked path should use light sleep motion wake.
 */
static bool state_machine_should_use_light_sleep_motion_wake(void) {
    // Program the low-power path here so the next wake cycle resumes from predictable state.
    if (!state_machine_imu_runtime_enabled() || !s_imu_available) {
        return false;
    }

    if (esp_sleep_is_valid_wakeup_gpio(PIN_LIS3DSH_INT)) {
        return true;
    }

    if (!s_imu_invalid_wakeup_gpio_logged) {
        ESP_LOGW(TAG,
                 "event=imu_wake_gpio_non_rtc gpio=%d sleep_mode=light reason=non_rtc_capable",
                 (int)PIN_LIS3DSH_INT);
        s_imu_invalid_wakeup_gpio_logged = true;
    }
    return true;
}

/**
 * @brief Check whether the board can arm IMU wake directly from deep sleep.
 *
 * @return true when the IMU pin is usable with ext0 deep-sleep wakeup.
 */
static bool state_machine_can_arm_imu_deep_sleep_wakeup(void) {
    // Program the low-power path here so the next wake cycle resumes from predictable state.
    if (!state_machine_imu_runtime_enabled() || !s_imu_available) {
        return false;
    }
    return esp_sleep_is_valid_wakeup_gpio(PIN_LIS3DSH_INT);
}

static app_state_t state_machine_enter_usb_guarded_sleep(bool prefer_light_sleep_motion_wake) {
    // Emulate one parked sleep dwell while USB debug stays attached, but switch to the real sleep backend immediately after host detach.
    uint16_t wake_interval_s = state_machine_parked_wake_interval_s();
    uint64_t started_ms = util_uptime_ms();
    uint64_t sleep_ms = (uint64_t)wake_interval_s * 1000ULL;
    const char *backend = prefer_light_sleep_motion_wake ? "light_proxy" : "deep_proxy";

    state_machine_force_user_led_on();

    if (prefer_light_sleep_motion_wake) {
        esp_err_t clear_int_err = imu_clear_motion_interrupt();
        if (clear_int_err != ESP_OK) {
            ESP_LOGW(TAG, "event=usb_guarded_sleep_imu_int_clear_failed err=%s", esp_err_to_name(clear_int_err));
        }
        vTaskDelay(pdMS_TO_TICKS(TRACKER_LIGHT_SLEEP_IMU_CLEAR_SETTLE_MS));
        if (imu_motion_detected()) {
            ESP_LOGW(TAG,
                     "event=usb_guarded_sleep_skipped reason=imu_interrupt_asserted backend=%s next_state=alarm",
                     backend);
            return APP_STATE_ALARM;
        }
    }

    ESP_LOGW(TAG,
             "event=usb_guarded_sleep_enter interval_s=%u step_ms=%u backend=%s",
             (unsigned)wake_interval_s,
             (unsigned)TRACKER_FAKE_SLEEP_LOOP_STEP_MS,
             backend);
    while (true) {
        uint64_t elapsed_ms = util_uptime_ms() - started_ms;
        if (elapsed_ms >= sleep_ms) {
            break;
        }
        if (prefer_light_sleep_motion_wake && state_machine_imu_runtime_enabled() && s_imu_available &&
            imu_motion_detected()) {
            state_machine_resume_user_led_pattern();
            ESP_LOGI(TAG,
                     "event=usb_guarded_sleep_wakeup source=imu backend=%s elapsed_ms=%llu",
                     backend,
                     (unsigned long long)elapsed_ms);
            return APP_STATE_ALARM;
        }

        if (!state_machine_usb_console_host_connected()) {
            uint64_t remaining_ms = sleep_ms - elapsed_ms;
            uint64_t remaining_us = remaining_ms > 0 ? remaining_ms * 1000ULL : 0ULL;
            ESP_LOGI(TAG,
                     "event=usb_guarded_sleep_release action=enter_real_sleep backend=%s elapsed_ms=%llu remaining_ms=%llu",
                     backend,
                     (unsigned long long)elapsed_ms,
                     (unsigned long long)remaining_ms);
            if (remaining_us == 0) {
                state_machine_resume_user_led_pattern();
                break;
            }
            if (prefer_light_sleep_motion_wake) {
                state_machine_force_user_led_off();
                return state_machine_enter_light_sleep_for_interval_us(remaining_us, false);
            }

            state_machine_force_user_led_off();
            state_machine_prepare_deep_sleep_wakeup_for_interval_us(remaining_us);
            esp_deep_sleep_start();
            return APP_STATE_SLEEP;
        }

        vTaskDelay(pdMS_TO_TICKS(TRACKER_FAKE_SLEEP_LOOP_STEP_MS));
    }

    state_machine_resume_user_led_pattern();
    s_timer_wake_count += 1U;
    s_heartbeat_started_ms = 0;
    s_heartbeat_raw_published = false;
    ESP_LOGI(TAG,
             "event=usb_guarded_sleep_wakeup source=timer backend=%s elapsed_ms=%llu timer_wake_count=%lu",
             backend,
             (unsigned long long)(util_uptime_ms() - started_ms),
             (unsigned long)s_timer_wake_count);
    return APP_STATE_HEARTBEAT;
}

/**
 * @brief Clear cached GNSS data before entering sleep.
 *
 * Once GNSS is powered down, the last in-memory fix is no longer considered
 * current enough to influence wake-time decisions.
 */
static void state_machine_clear_gnss_cache(void) {
    // Keep this public facade thin and forward the real work to the focused implementation below.
    memset(&s_telemetry.gnss, 0, sizeof(s_telemetry.gnss));
}

/**
 * @brief Resolve which sleep mode the FSM should attempt for the current state.
 *
 * @param[in] app_state Current FSM state.
 * @return Resolved runtime sleep mode.
 */
tracker_sleep_mode_t state_machine_resolve_sleep_mode(app_state_t app_state) {
    // Program the low-power path here so the next wake cycle resumes from predictable state.
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

/**
 * @brief Check whether the runtime is currently allowed to sleep.
 *
 * @param[out] out_reason Optional destination for a human-readable blocker string.
 * @return true when the device may proceed into the configured sleep flow.
 */
bool state_machine_can_enter_sleep(const char **out_reason) {
#if CONFIG_TRACKER_FIELD_VALIDATION_MODE && CONFIG_TRACKER_FIELD_VALIDATION_KEEP_AWAKE
    // Validation builds can deliberately pin the device awake even if parked policy says sleep is allowed.
    if (out_reason != NULL) {
        *out_reason = "field_validation_keep_awake";
    }
    return false;
#endif
    // Honor the runtime sleep policy before checking more specific blockers.
    if (!s_config.sleep_enabled) {
        if (out_reason != NULL) {
            *out_reason = "sleep_policy_disabled";
        }
        return false;
    }
    // OTA flows must keep the device awake until download/apply/confirm boundaries are safe.
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
    // Ignition or an in-flight BLE connect means the runtime is still actively doing vehicle work.
    if (s_telemetry.ignition) {
        if (out_reason != NULL) {
            *out_reason = "ignition_on";
        }
        return false;
    }
    if (session_mgr_has_stable_ignition() && session_mgr_stable_ignition()) {
        if (out_reason != NULL) {
            *out_reason = "ignition_stable_on";
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

/**
 * @brief Shut down active subsystems and snapshot runtime state before sleep.
 *
 * This is the single pre-sleep teardown path shared by deep sleep and light
 * sleep preparation. It disconnects BLE/LTE/MQTT, powers down GNSS/modem, and
 * captures the last known runtime context into RTC-retained memory.
 */
void state_machine_shutdown_for_sleep(void) {
    // Snapshot the last meaningful runtime facts before volatile state disappears during sleep.
    g_rtc_context.last_state = APP_STATE_SLEEP;
    g_rtc_context.ign_last_known = s_telemetry.ignition;
    g_rtc_context.last_battery_v = s_telemetry.vehicle_battery;
    g_rtc_context.last_heartbeat_ts = (uint32_t)(util_uptime_ms() / 1000ULL);

    if (s_ble_ctx != NULL) {
        // Tear down the active OBD session first so wake-time reconnect starts from a clean BLE baseline.
        ble_obd_disconnect(s_ble_ctx);
        s_ble_ctx = NULL;
        state_machine_mark_obd_disconnected();
    }

    // Stop the host stack after the session disconnect so no NimBLE task survives into sleep.
    esp_err_t ble_stack_err = ble_stack_deinit();
    if (ble_stack_err != ESP_OK) {
        ESP_LOGW(TAG, "event=pre_sleep_ble_deinit_failed err=%s", esp_err_to_name(ble_stack_err));
    }

    if (s_gnss_started) {
        // Power GNSS down explicitly so the next wake prelude re-arms it from a known state.
        esp_err_t gnss_off_err = modem_gnss_power_off();
        if (gnss_off_err != ESP_OK) {
            ESP_LOGW(TAG, "event=pre_sleep_gnss_power_off_failed err=%s", esp_err_to_name(gnss_off_err));
        }
    }
    s_gnss_started = false;
    state_machine_clear_gnss_cache();

#if !TRACKER_MQTT_RUNTIME_DISABLED
    // Disconnect MQTT before LTE teardown so the publish path closes in the same order it opened.
    esp_err_t mqtt_disconnect_err = tracker_mqtt_disconnect();
    if (mqtt_disconnect_err != ESP_OK) {
        ESP_LOGW(TAG, "event=pre_sleep_mqtt_disconnect_failed err=%s", esp_err_to_name(mqtt_disconnect_err));
    }
    s_mqtt_started = false;
#endif

    // Collapse the LTE data path and then drop modem power so parked current stays predictable.
    esp_err_t lte_disconnect_err = modem_lte_disconnect();
    if (lte_disconnect_err != ESP_OK) {
        ESP_LOGW(TAG, "event=pre_sleep_lte_disconnect_failed err=%s", esp_err_to_name(lte_disconnect_err));
    }
    s_prev_lte_initialized = false;

    esp_err_t modem_power_off_err = modem_power_off();
    if (modem_power_off_err != ESP_OK) {
        ESP_LOGW(TAG, "event=pre_sleep_modem_power_off_failed err=%s", esp_err_to_name(modem_power_off_err));
    } else {
        // Let the modem rail settle fully before wake sources are armed.
        vTaskDelay(pdMS_TO_TICKS((uint32_t)TRACKER_MODEM_POWEROFF_SETTLE_MS));
    }

    // Replay must remain paused until wake-time connectivity comes back.
    offline_queue_set_online(false);

    esp_err_t dtr_sleep_err = modem_set_dtr(true);
    if (dtr_sleep_err != ESP_OK && dtr_sleep_err != ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(TAG, "event=pre_sleep_dtr_set_failed err=%s", esp_err_to_name(dtr_sleep_err));
    }
}

/**
 * @brief Arm deep-sleep wake sources for parked heartbeat and optional IMU wake.
 */
static void state_machine_prepare_deep_sleep_wakeup_for_interval_us(uint64_t wake_interval_us) {
    // Program the low-power path here so the next wake cycle resumes from predictable state.
    (void)esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_ALL);
    if (state_machine_can_arm_imu_deep_sleep_wakeup()) {
        esp_err_t wake_err = esp_sleep_enable_ext0_wakeup(PIN_LIS3DSH_INT, 1);
        if (wake_err != ESP_OK) {
            ESP_LOGW(TAG, "event=deep_sleep_imu_wake_arm_failed err=%s fallback=timer_only", esp_err_to_name(wake_err));
        }
    }

    uint64_t effective_wake_interval_us = wake_interval_us > 0 ? wake_interval_us : 1000ULL;
    (void)esp_sleep_enable_timer_wakeup(effective_wake_interval_us);
}

void state_machine_prepare_deep_sleep_wakeup(void) {
    state_machine_prepare_deep_sleep_wakeup_for_interval_us(
        (uint64_t)state_machine_parked_wake_interval_s() * 1000000ULL);
}

/**
 * @brief Enter light sleep and map the wake cause back into an FSM state.
 *
 * @return Next FSM state after the light-sleep wake event.
 */
static app_state_t state_machine_enter_light_sleep_for_interval_us(uint64_t wake_interval_us, bool allow_usb_guard) {
    if (allow_usb_guard && state_machine_usb_console_host_connected()) {
        return state_machine_enter_usb_guarded_sleep(true);
    }

    state_machine_force_user_led_off();

    (void)esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_ALL);

    // Clear any stale IMU interrupt latch so the device does not bounce awake immediately.
    esp_err_t clear_int_err = imu_clear_motion_interrupt();
    if (clear_int_err != ESP_OK) {
        ESP_LOGW(TAG, "event=light_sleep_imu_int_clear_failed err=%s", esp_err_to_name(clear_int_err));
    }
    vTaskDelay(pdMS_TO_TICKS(TRACKER_LIGHT_SLEEP_IMU_CLEAR_SETTLE_MS));

    if (imu_motion_detected()) {
        /* Do not sleep with a latched IMU interrupt, otherwise wake happens immediately. */
        ESP_LOGW(TAG, "event=light_sleep_skipped reason=imu_interrupt_asserted next_state=alarm");
        return APP_STATE_ALARM;
    }

    // Arm GPIO wake before the timer so either motion or cadence can break light sleep.
    esp_err_t gpio_wake_err = gpio_wakeup_enable(PIN_LIS3DSH_INT, GPIO_INTR_HIGH_LEVEL);
    if (gpio_wake_err != ESP_OK) {
        ESP_LOGW(TAG, "event=light_sleep_gpio_wake_arm_failed gpio=%d err=%s", (int)PIN_LIS3DSH_INT, esp_err_to_name(gpio_wake_err));
        return APP_STATE_CHECK_IGN;
    }

    esp_err_t sleep_gpio_err = esp_sleep_enable_gpio_wakeup();
    if (sleep_gpio_err != ESP_OK) {
        ESP_LOGW(TAG, "event=light_sleep_gpio_wake_enable_failed err=%s", esp_err_to_name(sleep_gpio_err));
        return APP_STATE_CHECK_IGN;
    }

    uint64_t effective_wake_interval_us = wake_interval_us > 0 ? wake_interval_us : 1000ULL;
    uint64_t wake_interval_ms = effective_wake_interval_us / 1000ULL;
    if (wake_interval_ms == 0) {
        wake_interval_ms = 1ULL;
    }

    esp_err_t timer_err = esp_sleep_enable_timer_wakeup(effective_wake_interval_us);
    if (timer_err != ESP_OK) {
        ESP_LOGW(TAG, "event=light_sleep_timer_wake_enable_failed err=%s", esp_err_to_name(timer_err));
        return APP_STATE_CHECK_IGN;
    }

    // From this point the wake cause decides whether we resume alarm, heartbeat, or plain ignition checking.
    ESP_LOGI(TAG,
             "event=light_sleep_enter interval_ms=%llu imu_gpio=%d",
             (unsigned long long)wake_interval_ms,
             (int)PIN_LIS3DSH_INT);
    esp_err_t sleep_err = esp_light_sleep_start();
    if (sleep_err != ESP_OK) {
        state_machine_resume_user_led_pattern();
        ESP_LOGW(TAG, "event=light_sleep_start_failed err=%s", esp_err_to_name(sleep_err));
        return APP_STATE_CHECK_IGN;
    }

    esp_sleep_wakeup_cause_t wakeup = esp_sleep_get_wakeup_cause();
    state_machine_resume_user_led_pattern();
    ESP_LOGI(TAG, "event=light_sleep_wakeup cause=%d", (int)wakeup);
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

app_state_t state_machine_enter_light_sleep(void) {
    return state_machine_enter_light_sleep_for_interval_us(
        (uint64_t)state_machine_parked_wake_interval_s() * 1000000ULL,
        true);
}

/**
 * @brief Emulate parked sleep with a timed delay for bench/debug configurations.
 *
 * @return Next FSM state after the fake-sleep interval elapses.
 */
app_state_t state_machine_enter_fake_sleep(void) {
    // Program the low-power path here so the next wake cycle resumes from predictable state.
    uint16_t wake_interval_s = state_machine_parked_wake_interval_s();
    uint64_t sleep_ms = (uint64_t)wake_interval_s * 1000ULL;
    uint64_t started_ms = util_uptime_ms();

    ESP_LOGW(TAG,
             "event=fake_sleep_enter interval_s=%u step_ms=%u",
             (unsigned)wake_interval_s,
             (unsigned)TRACKER_FAKE_SLEEP_LOOP_STEP_MS);
    while ((util_uptime_ms() - started_ms) < sleep_ms) {
        vTaskDelay(pdMS_TO_TICKS(TRACKER_FAKE_SLEEP_LOOP_STEP_MS));
    }

    s_timer_wake_count += 1;
    ESP_LOGI(TAG,
             "event=fake_sleep_wakeup elapsed_ms=%llu timer_wake_count=%lu",
             (unsigned long long)(util_uptime_ms() - started_ms),
             (unsigned long)s_timer_wake_count);
    return APP_STATE_CHECK_IGN;
}

/**
 * @brief Enter the sleep mode selected by the current build/runtime policy.
 *
 * @return Next FSM state after wake, or `APP_STATE_SLEEP` if deep sleep never returns.
 */
app_state_t state_machine_enter_configured_sleep(void) {
#if CONFIG_TRACKER_FAKE_SLEEP_ENABLED
    // Bench/debug builds can replace real sleep with a timed idle loop.
    return state_machine_enter_fake_sleep();
#else
    if (state_machine_should_use_light_sleep_motion_wake()) {
        // Prefer light sleep when motion wake must use the regular GPIO wake path.
        return state_machine_enter_light_sleep();
    }

    if (state_machine_usb_console_host_connected()) {
        return state_machine_enter_usb_guarded_sleep(false);
    }

    // Deep sleep never returns here; the next boot reconstructs state from the wake cause.
    state_machine_prepare_deep_sleep_wakeup();
    esp_deep_sleep_start();
    return APP_STATE_SLEEP;
#endif
}
