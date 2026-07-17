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

/* Logging tag for all user-LED diagnostics. */
static const char *TAG = "LED_CTRL";

/**
 * @brief Compute the on/off phase of a periodic blink using a free-running clock.
 *
 * The LED pattern is derived directly from uptime instead of a stateful timer,
 * so the cycle stays consistent across loop iterations without bookkeeping.
 *
 * @param[in] now_ms    Current uptime in milliseconds.
 * @param[in] period_ms Full blink period (on phase + off phase).
 * @param[in] on_ms     Duration within each period that the LED stays on.
 * @return true while inside the on phase of the current period, false otherwise.
 */
static bool led_pulse(uint64_t now_ms, uint64_t period_ms, uint64_t on_ms) {
    // The LED is on only during the leading `on_ms` slice of every `period_ms` window.
    return (now_ms % period_ms) < on_ms;
}

/**
 * @brief Decide whether the LED should be lit for a given FSM state and time.
 *
 * Each state maps to a distinct visual signature so an operator can read the
 * device's behavior at a glance without a console.
 *
 * @param[in] app_state Current FSM state driving the visual pattern.
 * @param[in] now_ms    Current uptime in milliseconds (phase source).
 * @return true when the LED should be on at this instant for the given state.
 */
static bool led_pattern_on(app_state_t app_state, uint64_t now_ms) {
    switch (app_state) {
        case APP_STATE_INIT:
        case APP_STATE_CHECK_IGN:
            // Boot/probing: short 120ms pulse every 800ms signals "working but not yet settled".
            return led_pulse(now_ms, 800ULL, 120ULL);
        case APP_STATE_DRIVING:
            // Active tracking: solid on for a clear "engine on, recording" indication.
            return true;
        case APP_STATE_ALARM:
            // Motion alarm: fast 120ms-on / 120ms-off blink draws attention.
            return led_pulse(now_ms, 240ULL, 120ULL);
        case APP_STATE_PARKED:
            // Parked: brief 80ms pulse every 2500ms hints low-power standby.
            return led_pulse(now_ms, 2500ULL, 80ULL);
        case APP_STATE_HEARTBEAT: {
            // Heartbeat: a double pulse (two 120ms blips) inside a 1500ms window.
            uint64_t phase = now_ms % 1500ULL;
            // First blip: 0-120ms; second blip: 240-360ms; dark for the rest of the window.
            return phase < 120ULL || (phase >= 240ULL && phase < 360ULL);
        }
        case APP_STATE_SLEEP:
            // Deep sleep: LED off to conserve power.
            return false;
        default:
            // Unknown/undefined states fall back to the generic configured blink cadence.
            return led_pulse(now_ms, TRACKER_USER_LED_BLINK_PERIOD_MS, TRACKER_USER_LED_ON_MS);
    }
}

/**
 * @brief Drive the physical LED GPIO to the requested logical on/off state.
 *
 * Honors the board's active-level polarity so callers always reason in terms of
 * logical "on"/"off" regardless of how the LED is wired.
 *
 * @param[in] on true to light the LED, false to turn it off.
 */
static void led_drive(bool on) {
    // No LED wired on this board variant: nothing to drive.
    if (PIN_USER_LED == GPIO_NUM_NC) {
        return;
    }
#if TRACKER_USER_LED_ACTIVE_LEVEL
    // Active-high wiring: logical on maps directly to a high GPIO level.
    gpio_set_level(PIN_USER_LED, on ? 1 : 0);
#else
    // Active-low wiring: logical on requires driving the GPIO low.
    gpio_set_level(PIN_USER_LED, on ? 0 : 1);
#endif
}

/**
 * @brief Lazily configure the user-LED GPIO exactly once per boot.
 *
 * Initialization is deferred until the LED is first used so boards without a
 * wired LED never touch GPIO, and re-entry is a cheap no-op afterwards.
 */
static void led_ensure_initialized(void) {
    // Skip when no LED is present or the GPIO was already configured this boot.
    if (PIN_USER_LED == GPIO_NUM_NC || s_user_led_initialized) {
        return;
    }

    // Configure the LED pin as a plain push-pull output with pulls/interrupts disabled.
    gpio_config_t cfg = {
        .pin_bit_mask = (1ULL << (uint32_t)PIN_USER_LED),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    esp_err_t err = gpio_config(&cfg);
    if (err != ESP_OK) {
        // Leave the initialized flag clear so a later call may retry configuration.
        ESP_LOGE(TAG, "event=led_gpio_config_failed err=%s", esp_err_to_name(err));
        return;
    }

    // Mark configured, seed the cycle origin, and start from a known-off state.
    s_user_led_initialized = true;
    s_user_led_cycle_started_ms = util_uptime_ms();
    led_drive(false);
    ESP_LOGI(TAG, "event=led_initialized pin=%d active_level=%d",
             (int)PIN_USER_LED, (int)TRACKER_USER_LED_ACTIVE_LEVEL);
}

/**
 * @brief Refresh the user LED for the current FSM state, respecting overrides.
 *
 * Called every FSM iteration. An explicit force-on/force-off override always
 * wins; otherwise the LED follows the time-based pattern for @p app_state.
 *
 * @param[in] app_state Current FSM state used to select the blink pattern.
 */
void state_led_update(app_state_t app_state) {
    // Nothing to do on boards without a user LED.
    if (PIN_USER_LED == GPIO_NUM_NC) {
        return;
    }
    led_ensure_initialized();

    // A forced-on override pins the LED high regardless of FSM state.
    if (s_user_led_override == TRACKER_USER_LED_OVERRIDE_ON) {
        led_drive(true);
        return;
    }
    // A forced-off override pins the LED low regardless of FSM state.
    if (s_user_led_override == TRACKER_USER_LED_OVERRIDE_OFF) {
        led_drive(false);
        return;
    }
    // No override: drive the LED from the state's time-based pattern.
    led_drive(led_pattern_on(app_state, util_uptime_ms()));
}

/**
 * @brief Latch the LED on and suppress pattern updates until released.
 */
void state_led_force_on(void) {
    led_ensure_initialized();
    // Record the override so subsequent state_led_update() calls keep it on.
    s_user_led_override = TRACKER_USER_LED_OVERRIDE_ON;
    led_drive(true);
}

/**
 * @brief Latch the LED off and suppress pattern updates until released.
 */
void state_led_force_off(void) {
    led_ensure_initialized();
    // Record the override so subsequent state_led_update() calls keep it off.
    s_user_led_override = TRACKER_USER_LED_OVERRIDE_OFF;
    led_drive(false);
}

/**
 * @brief Clear any LED override so the LED resumes normal state-driven patterns.
 */
void state_led_resume_pattern(void) {
    // Dropping the override lets the next state_led_update() reassert the pattern.
    s_user_led_override = TRACKER_USER_LED_OVERRIDE_NONE;
}
