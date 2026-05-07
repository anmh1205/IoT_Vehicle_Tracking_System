#include "driver-input-profile.h"

namespace {
driver_command_t make_command(selector_position_t selector,
                              drive_intent_t intent,
                              float throttle_pct,
                              float brake_pct,
                              float target_speed_kph,
                              bool hold_stopped) {
  driver_command_t command = {};
  command.selector = selector;
  command.intent = intent;
  command.throttle_pct = throttle_pct;
  command.brake_pct = brake_pct;
  command.target_speed_kph = target_speed_kph;
  command.hold_stopped = hold_stopped;
  return command;
}
}  // namespace

driver_command_t resolve_driver_command(uint32_t drive_elapsed_s) {
  const uint32_t cycle_s = drive_elapsed_s % 220UL;

  if (cycle_s < 8UL) {
    return make_command(SELECTOR_POSITION_P, DRIVE_INTENT_PARKED, 3.0f, 45.0f, 0.0f, true);
  }
  if (cycle_s < 15UL) {
    return make_command(SELECTOR_POSITION_R, DRIVE_INTENT_REVERSE, 9.0f, 0.0f, 6.0f, false);
  }
  if (cycle_s < 20UL) {
    return make_command(SELECTOR_POSITION_N, DRIVE_INTENT_NEUTRAL_IDLE, 4.0f, 30.0f, 0.0f, true);
  }
  if (cycle_s < 30UL) {
    return make_command(SELECTOR_POSITION_D, DRIVE_INTENT_BRAKE_HOLD, 5.0f, 55.0f, 0.0f, true);
  }
  if (cycle_s < 42UL) {
    return make_command(SELECTOR_POSITION_D, DRIVE_INTENT_CREEP, 6.0f, 0.0f, 7.0f, false);
  }
  if (cycle_s < 78UL) {
    return make_command(SELECTOR_POSITION_D, DRIVE_INTENT_ACCEL, 24.0f, 0.0f, 52.0f, false);
  }
  if (cycle_s < 120UL) {
    return make_command(SELECTOR_POSITION_D, DRIVE_INTENT_CRUISE, 22.0f, 0.0f, 74.0f, false);
  }
  if (cycle_s < 136UL) {
    return make_command(SELECTOR_POSITION_D, DRIVE_INTENT_KICKDOWN, 58.0f, 0.0f, 96.0f, false);
  }
  if (cycle_s < 170UL) {
    return make_command(SELECTOR_POSITION_D, DRIVE_INTENT_CRUISE, 24.0f, 0.0f, 78.0f, false);
  }
  if (cycle_s < 198UL) {
    return make_command(SELECTOR_POSITION_D, DRIVE_INTENT_DECEL, 2.0f, 18.0f, 0.0f, false);
  }
  if (cycle_s < 210UL) {
    return make_command(SELECTOR_POSITION_D, DRIVE_INTENT_STOP, 3.0f, 60.0f, 0.0f, true);
  }
  return make_command(SELECTOR_POSITION_P, DRIVE_INTENT_PARKED, 3.0f, 50.0f, 0.0f, true);
}
