/**
 * @file src/power/led_pattern.c
 * @brief Status LED cadence derived from app state and tracking policy.
 *
 * The app task selects an immutable pattern using the current FSM state and monotonic time.
 * The board adapter drives the pin. The FSM and device policy own state transitions and the
 * tracking flag.
 */
#include "power/power.h"
#include "board/board_sensors.h"

/** @brief Immutable LED pattern selected by the app task. */
typedef struct {
    uint16_t period_ms; /**< Cycle length in milliseconds. Zero disables timed pulses. */
    uint16_t on_ms; /**< First pulse length in milliseconds from the start of the cycle. */
    uint16_t second_pulse_at_ms; /**< Inclusive second pulse start in milliseconds within the cycle. */
    uint16_t second_pulse_off_at_ms; /**< Exclusive second pulse end in milliseconds within the cycle. */
    bool follows_tracking; /**< Drive the LED directly from the tracking flag. */
} led_pattern_t;

/* The app task reads this immutable table. Unspecified states select LED off. */
static const led_pattern_t k_patterns[IVTS_ST_COUNT] = {
    [IVTS_ST_INIT]      = { .period_ms = 800, .on_ms = 100 },
    [IVTS_ST_CHECK_IGN] = { .period_ms = 800, .on_ms = 100 },
    [IVTS_ST_DRIVING]   = { .follows_tracking = true },
    [IVTS_ST_PARKED]    = { .period_ms = 2500, .on_ms = 100 },
    [IVTS_ST_ALARM]     = { .period_ms = 400, .on_ms = 200 },
    [IVTS_ST_HEARTBEAT] = { .period_ms = 1500, .on_ms = 100, .second_pulse_at_ms = 300, .second_pulse_off_at_ms = 400 },
};

void app_led_pattern_tick(ivts_fsm_state_t state, bool tracking_enabled, uint64_t now_ms)
{
    bool on = false;
    if ((unsigned)state < IVTS_ST_COUNT) {
        const led_pattern_t *pattern = &k_patterns[state];
        if (pattern->follows_tracking) {
            on = tracking_enabled;
        } else if (pattern->period_ms != 0u) {
            uint64_t phase_ms = now_ms % pattern->period_ms;
            on = phase_ms < pattern->on_ms ||
                 (phase_ms >= pattern->second_pulse_at_ms && phase_ms < pattern->second_pulse_off_at_ms);
        }
    }
    board_led_set(on);
}
