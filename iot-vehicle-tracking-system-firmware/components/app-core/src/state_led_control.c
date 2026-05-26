#include "state_led_control.h"

#include "driver/gpio.h"

#include "esp_log.h"

#include "pin_map.h"
#include "state_runtime_context.h"
#include "util.h"

/**
 * @file state_led_control.c
 * @brief User LED pattern controller. Patterns vary by FSM state to give
 *        operators a visual indication of device behavior at a glance.
 *
 * Patterns:
 *   INIT/CHECK_IGN: short pulse 120ms every 800ms (boot probing)
 *   DRIVING: solid on (active tracking)
 *   ALARM: fast blink 120ms on / 120ms off (motion detected)
 *   PARKED: short pulse 80ms every 2500ms (low power hint)
 *   HEARTBEAT: double pulse pattern (periodic check)
 *   SLEEP: off
 */

static const char *TAG = "LED_CTRL";

static bool led_pulse(uint64_t now_ms, uint64_t period_ms, uint64_t on_ms) {
    return (now_ms % period_ms) < on_ms;
}

static bool led_pattern_on(app_state_t app_state, uint64_t now_ms) {
    switch (app_state) {
        case APP_STATE_INIT:
        case APP_STATE_CHECK_IGN:
            return led_pulse(now_ms, 800ULL, 120ULL);
        case APP_STATE_DRIVING:
            return true;
        case APP_STATE_ALARM:
            return led_pulse(now_ms, 240ULL, 120ULL);
        case APP_STATE_PARKED:
            return led_pulse(now_ms, 2500ULL, 80ULL);
        case APP_STATE_HEARTBEAT: {
            uint64_t phase = now_ms % 1500ULL;
            return phase < 120ULL || (phase >= 240ULL && phase < 360ULL);
        }
        case APP_STATE_SLEEP:
            return false;
        default:
            return led_pulse(now_ms, TRACKER_USER_LED_BLINK_PERIOD_MS, TRACKER_USER_LED_ON_MS);
    }
}

static void led_drive(bool on) {
    if (PIN_USER_LED == GPIO_NUM_NC) {
        return;
    }
#if TRACKER_USER_LED_ACTIVE_LEVEL
    gpio_set_level(PIN_USER_LED, on ? 1 : 0);
#else
    gpio_set_level(PIN_USER_LED, on ? 0 : 1);
#endif
}

static void led_ensure_initialized(void) {
    if (PIN_USER_LED == GPIO_NUM_NC || s_user_led_initialized) {
        return;
    }

    gpio_config_t cfg = {
        .pin_bit_mask = (1ULL << (uint32_t)PIN_USER_LED),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    esp_err_t err = gpio_config(&cfg);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "event=led_gpio_config_failed err=%s", esp_err_to_name(err));
        return;
    }

    s_user_led_initialized = true;
    s_user_led_cycle_started_ms = util_uptime_ms();
    led_drive(false);
    ESP_LOGI(TAG, "event=led_initialized pin=%d active_level=%d",
             (int)PIN_USER_LED, (int)TRACKER_USER_LED_ACTIVE_LEVEL);
}

void state_led_update(app_state_t app_state) {
    if (PIN_USER_LED == GPIO_NUM_NC) {
        return;
    }
    led_ensure_initialized();

    if (s_user_led_override == TRACKER_USER_LED_OVERRIDE_ON) {
        led_drive(true);
        return;
    }
    if (s_user_led_override == TRACKER_USER_LED_OVERRIDE_OFF) {
        led_drive(false);
        return;
    }
    led_drive(led_pattern_on(app_state, util_uptime_ms()));
}

void state_led_force_on(void) {
    led_ensure_initialized();
    s_user_led_override = TRACKER_USER_LED_OVERRIDE_ON;
    led_drive(true);
}

void state_led_force_off(void) {
    led_ensure_initialized();
    s_user_led_override = TRACKER_USER_LED_OVERRIDE_OFF;
    led_drive(false);
}

void state_led_resume_pattern(void) {
    s_user_led_override = TRACKER_USER_LED_OVERRIDE_NONE;
}
