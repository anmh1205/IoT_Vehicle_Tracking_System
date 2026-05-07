#include "powertrain-state-model.h"

namespace {
const powertrain_config_t k_default_config = {
    {2.85f, 1.55f, 1.00f, 0.70f},
    2.20f,
    4.10f,
    2.00f,
    1150,
    750,
    1220,
    820,
    6200,
    800,
    7,
    120.0f,
    520.0f,
    0.70f,
    40.0f,
    760.0f,
    {5.0f, 4.1f, 3.2f, 2.7f},
    {{18, 28, 40}, {32, 48, 66}, {52, 74, 96}, {255, 255, 255}},
    {{0, 0, 0}, {9, 15, 24}, {22, 32, 46}, {40, 54, 70}},
};

float clampf(float value, float min_value, float max_value) {
  if (value < min_value) {
    return min_value;
  }
  if (value > max_value) {
    return max_value;
  }
  return value;
}

float approach(float current, float target, float max_delta) {
  if (current < target) {
    return min(current + max_delta, target);
  }
  return max(current - max_delta, target);
}

uint8_t throttle_band(float throttle_pct) {
  if (throttle_pct < 18.0f) {
    return 0;
  }
  if (throttle_pct < 42.0f) {
    return 1;
  }
  return 2;
}

float wheel_linked_rpm(float speed_kph, float ratio, const powertrain_config_t &config) {
  const float wheel_rps = (speed_kph * 1000.0f) / (3600.0f * config.tire_circumference_m);
  return wheel_rps * 60.0f * ratio * config.final_drive;
}

float idle_target_rpm(const powertrain_state_t &state, const powertrain_config_t &config, bool loaded) {
  const float cold_factor = clampf((82.0f - state.coolant_c) / 42.0f, 0.0f, 1.0f);
  const float hot_idle = loaded ? static_cast<float>(config.loaded_idle_rpm_hot) : static_cast<float>(config.idle_rpm_hot);
  const float cold_idle = loaded ? static_cast<float>(config.loaded_idle_rpm_cold) : static_cast<float>(config.idle_rpm_cold);
  return hot_idle + (cold_idle - hot_idle) * cold_factor;
}

void update_drive_gear(powertrain_state_t &state,
                       const powertrain_config_t &config,
                       const driver_command_t &command,
                       uint32_t delta_ms) {
  if (command.selector != SELECTOR_POSITION_D) {
    state.gear = command.selector == SELECTOR_POSITION_R ? 1 : 0;
    state.shift_inhibit_remaining_ms = 0;
    return;
  }

  if (state.gear == 0) {
    state.gear = 1;
  }
  state.shift_inhibit_remaining_ms = delta_ms >= state.shift_inhibit_remaining_ms ? 0 : state.shift_inhibit_remaining_ms - delta_ms;
  if (state.shift_inhibit_remaining_ms > 0) {
    return;
  }

  const uint8_t band = throttle_band(state.throttle_actual_pct);
  if (command.intent == DRIVE_INTENT_KICKDOWN && state.gear > 1) {
    const float projected_rpm = wheel_linked_rpm(state.speed_kph, config.gear_ratios[state.gear - 2], config) + 260.0f;
    if (projected_rpm < static_cast<float>(config.redline_rpm - 250U)) {
      state.gear--;
      state.shift_inhibit_remaining_ms = config.shift_inhibit_ms;
      return;
    }
  }

  if (state.gear < 4 && state.speed_kph >= config.upshift_kph[state.gear - 1][band]) {
    state.gear++;
    state.shift_inhibit_remaining_ms = config.shift_inhibit_ms;
    return;
  }
  if (state.gear > 1 && state.speed_kph <= config.downshift_kph[state.gear - 1][band]) {
    state.gear--;
    state.shift_inhibit_remaining_ms = config.shift_inhibit_ms;
  }
}

void update_running_state(powertrain_state_t &state,
                          const powertrain_config_t &config,
                          const driver_command_t &command,
                          float delta_s) {
  const bool loaded = command.selector == SELECTOR_POSITION_D || command.selector == SELECTOR_POSITION_R;
  const float target_throttle = clampf(command.throttle_pct, 0.0f, 100.0f);
  state.throttle_demand_pct = target_throttle;
  state.throttle_actual_pct = approach(state.throttle_actual_pct, target_throttle, delta_s * 65.0f);
  state.brake_pct = clampf(command.brake_pct, 0.0f, 100.0f);

  float target_speed = command.target_speed_kph;
  if ((command.selector == SELECTOR_POSITION_D || command.selector == SELECTOR_POSITION_R) && !command.hold_stopped && state.brake_pct < 15.0f) {
    const float creep_target = command.selector == SELECTOR_POSITION_R ? 5.0f : static_cast<float>(config.creep_target_kph);
    if (target_speed < creep_target && state.throttle_actual_pct < 8.0f) {
      target_speed = creep_target;
    }
  }
  if (command.hold_stopped && state.brake_pct >= 25.0f) {
    target_speed = 0.0f;
  }

  const float accel_rate = 5.0f + state.throttle_actual_pct * (command.intent == DRIVE_INTENT_KICKDOWN ? 0.18f : 0.12f);
  const float brake_rate = 8.0f + state.brake_pct * 0.18f;
  const float drag_rate = state.gear > 0 ? config.closed_throttle_drag_by_gear[state.gear - 1] : 4.0f;
  const float speed_delta = state.speed_kph < target_speed ? accel_rate * delta_s : max(brake_rate, drag_rate) * delta_s;
  state.speed_kph = clampf(approach(state.speed_kph, target_speed, speed_delta), 0.0f, 160.0f);

  update_drive_gear(state, config, command, static_cast<uint32_t>(delta_s * 1000.0f));

  const float idle_rpm = idle_target_rpm(state, config, loaded);
  float rpm_target = idle_rpm;
  if (command.selector == SELECTOR_POSITION_D || command.selector == SELECTOR_POSITION_R) {
    const uint8_t drive_gear = state.gear > 0 ? state.gear : 1;
    const float ratio = command.selector == SELECTOR_POSITION_R ? config.reverse_ratio : config.gear_ratios[drive_gear - 1];
    const float wheel_rpm = wheel_linked_rpm(state.speed_kph, ratio, config);
    const float cruise_factor = clampf((state.speed_kph - 38.0f) / 42.0f, 0.0f, 1.0f);
    float slip_target = config.converter_slip_base_rpm + (state.throttle_actual_pct * config.converter_slip_gain_rpm / 100.0f);
    slip_target *= 1.0f - (cruise_factor * config.converter_slip_decay);
    if (command.intent == DRIVE_INTENT_BRAKE_HOLD) {
      slip_target += 160.0f;
    }
    state.converter_slip_rpm = approach(state.converter_slip_rpm,
                                         clampf(slip_target, config.converter_slip_min_rpm, config.converter_slip_max_rpm),
                                         delta_s * 900.0f);
    rpm_target = max(idle_rpm, wheel_rpm + state.converter_slip_rpm);
  } else {
    state.converter_slip_rpm = approach(state.converter_slip_rpm, 0.0f, delta_s * 1000.0f);
    rpm_target = idle_rpm + state.throttle_actual_pct * (command.selector == SELECTOR_POSITION_P ? 20.0f : 15.0f);
  }

  state.rpm = approach(state.rpm,
                       clampf(rpm_target, 0.0f, static_cast<float>(config.redline_rpm)),
                       delta_s * (state.rpm < rpm_target ? 2400.0f : 3000.0f));
  state.coolant_c = approach(state.coolant_c, 92.0f + state.throttle_actual_pct * 0.04f, delta_s * 3.6f);
  state.oil_temp_c = approach(state.oil_temp_c, state.coolant_c + 7.0f, delta_s * 2.8f);
  state.intake_air_c = approach(state.intake_air_c, state.ambient_air_c + state.throttle_actual_pct * 0.06f + state.speed_kph * 0.015f, delta_s * 2.0f);
  state.control_module_mv = static_cast<uint16_t>(13720.0f + state.throttle_actual_pct * 5.0f);
  state.fuel_pressure_kpa = static_cast<uint16_t>(304.0f + state.throttle_actual_pct * 1.1f + state.gear * 4.0f);
  state.engine_running = true;
}
}  // namespace

const powertrain_config_t &default_powertrain_config() {
  return k_default_config;
}

void powertrain_state_begin(powertrain_state_t &state) {
  state = {};
  state.selector = SELECTOR_POSITION_P;
  state.intent = DRIVE_INTENT_PARKED;
  state.coolant_c = 32.0f;
  state.oil_temp_c = 30.0f;
  state.intake_air_c = 29.0f;
  state.ambient_air_c = 29.0f;
  state.fuel_level_pct = 88.0f;
  state.barometric_kpa = 100;
  state.control_module_mv = 12240;
  state.fuel_pressure_kpa = 285;
}

void powertrain_state_tick(powertrain_state_t &state,
                           const powertrain_config_t &config,
                           const driver_command_t &command,
                           bool ignition_on,
                           uint32_t delta_ms) {
  const float delta_s = delta_ms / 1000.0f;
  state.selector = ignition_on ? command.selector : SELECTOR_POSITION_P;
  state.intent = ignition_on ? command.intent : DRIVE_INTENT_PARKED;

  if (!ignition_on) {
    state.engine_running = false;
    state.gear = 0;
    state.throttle_demand_pct = 0.0f;
    state.throttle_actual_pct = approach(state.throttle_actual_pct, 0.0f, delta_s * 90.0f);
    state.brake_pct = 80.0f;
    state.converter_slip_rpm = approach(state.converter_slip_rpm, 0.0f, delta_s * 1000.0f);
    state.speed_kph = approach(state.speed_kph, 0.0f, delta_s * 18.0f);
    state.rpm = approach(state.rpm, 0.0f, delta_s * 3200.0f);
    state.coolant_c = approach(state.coolant_c, state.ambient_air_c + 6.0f, delta_s * 1.6f);
    state.oil_temp_c = approach(state.oil_temp_c, state.coolant_c + 2.0f, delta_s * 1.4f);
    state.intake_air_c = approach(state.intake_air_c, state.ambient_air_c + 1.0f, delta_s * 1.6f);
    state.control_module_mv = 12220;
    state.fuel_pressure_kpa = 285;
    state.shift_inhibit_remaining_ms = 0;
    return;
  }

  update_running_state(state, config, command, delta_s);
}
