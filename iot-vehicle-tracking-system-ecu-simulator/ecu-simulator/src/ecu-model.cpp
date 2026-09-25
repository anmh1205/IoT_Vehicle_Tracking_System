#include "ecu-model.h"

#include "diagnostic-state-model.h"
#include "driver-input-profile.h"
#include "obd-snapshot-builder.h"
#include "powertrain-state-model.h"

namespace {
constexpr uint32_t k_ignition_on_duration_s = 3UL * 60UL;
constexpr uint32_t k_ignition_off_duration_s = 6UL * 60UL;

const powertrain_config_t &s_config = default_powertrain_config();
ecu_snapshot_t s_snapshot = {};
powertrain_state_t s_powertrain = {};
diagnostic_state_t s_diagnostics = {};
ignition_cycle_state_t s_ignition = {};
uint32_t s_last_tick_ms = 0;
uint32_t s_total_elapsed_ms_accum = 0;
uint32_t s_runtime_ms_accum = 0;
uint32_t s_time_with_mil_ms_accum = 0;
uint32_t s_distance_mm_accum = 0;
uint32_t s_distance_with_mil_mm_accum = 0;

void log_ignition_state(bool ignition_on, uint32_t duration_s) {
  Serial.print(F("IGN "));
  Serial.print(ignition_on ? F("ON") : F("OFF"));
  Serial.print(F(" for "));
  Serial.print(duration_s);
  Serial.println(F("s"));
}

void begin_ignition_state(bool ignition_on, uint32_t now_s) {
  s_ignition.ignition_on = ignition_on;
  s_ignition.started_s = now_s;
  s_ignition.duration_s = ignition_on ? k_ignition_on_duration_s : k_ignition_off_duration_s;
  s_runtime_ms_accum = 0;
  s_powertrain.runtime_s = 0;
  if (ignition_on) {
    s_ignition.drive_started_s = now_s;
    diagnostic_state_begin(s_diagnostics, static_cast<uint8_t>(random(0, fault_profile_count())));
  }
  log_ignition_state(ignition_on, s_ignition.duration_s);
}

void maybe_complete_forced_cycle(uint32_t now_s) {
  if (!s_ignition.forced_cycle_active || now_s < s_ignition.forced_cycle_deadline_s) {
    return;
  }

  const bool return_state = s_ignition.forced_cycle_return_state;
  s_ignition.forced_cycle_active = false;
  s_ignition.forced_cycle_deadline_s = 0;
  begin_ignition_state(return_state, now_s);
}

void maybe_flip_ignition_state(uint32_t now_s) {
  if (s_ignition.forced_cycle_active) {
    return;
  }
  if (now_s - s_ignition.started_s < s_ignition.duration_s) {
    return;
  }
  begin_ignition_state(!s_ignition.ignition_on, now_s);
}

void update_counters(uint32_t delta_ms) {
  const uint32_t distance_delta_mm = static_cast<uint32_t>((s_powertrain.speed_kph * static_cast<float>(delta_ms) * 1000.0f) / 3600.0f);

  s_total_elapsed_ms_accum += delta_ms;
  s_powertrain.total_elapsed_s = s_total_elapsed_ms_accum / 1000UL;
  if (s_powertrain.engine_running) {
    s_runtime_ms_accum += delta_ms;
    s_distance_mm_accum += distance_delta_mm;
  }
  if (s_powertrain.engine_running && s_diagnostics.mil_on) {
    s_time_with_mil_ms_accum += delta_ms;
    s_distance_with_mil_mm_accum += distance_delta_mm;
  }

  s_powertrain.runtime_s = s_runtime_ms_accum / 1000UL;
  s_powertrain.time_with_mil_s = s_time_with_mil_ms_accum / 1000UL;
  s_powertrain.distance_m = s_distance_mm_accum / 1000UL;
  s_powertrain.distance_with_mil_m = s_distance_with_mil_mm_accum / 1000UL;
  if (s_powertrain.fuel_level_pct > 8.0f && s_powertrain.engine_running) {
    s_powertrain.fuel_level_pct -= (static_cast<float>(delta_ms) / 1000.0f) * 0.0009f;
  }
}
}  // namespace

void ecu_model_begin() {
  randomSeed(static_cast<unsigned long>(analogRead(A0) ^ micros()));
  powertrain_state_begin(s_powertrain);
  diagnostic_state_begin(s_diagnostics, 0);
  begin_ignition_state(true, 0);
  build_obd_snapshot(s_snapshot, s_powertrain, s_diagnostics);
}

void ecu_model_tick() {
  const uint32_t now_ms = millis();
  if (s_last_tick_ms == 0) {
    s_last_tick_ms = now_ms;
    return;
  }

  const uint32_t raw_delta_ms = now_ms - s_last_tick_ms;
  const uint32_t delta_ms = raw_delta_ms < 250UL ? raw_delta_ms : 250UL;
  const uint32_t now_s = now_ms / 1000UL;
  s_last_tick_ms = now_ms;

  maybe_complete_forced_cycle(now_s);
  maybe_flip_ignition_state(now_s);

  const uint32_t drive_elapsed_s = s_ignition.ignition_on ? now_s - s_ignition.drive_started_s : 0;
  const driver_command_t command = resolve_driver_command(drive_elapsed_s);
  powertrain_state_tick(s_powertrain, s_config, command, s_ignition.ignition_on, delta_ms);
  diagnostic_state_tick(s_diagnostics, s_powertrain, delta_ms);
  update_counters(delta_ms);
  build_obd_snapshot(s_snapshot, s_powertrain, s_diagnostics);
}

void ecu_model_force_ignition(bool ignition_on) {
  s_ignition.forced_cycle_active = false;
  s_ignition.forced_cycle_deadline_s = 0;
  begin_ignition_state(ignition_on, millis() / 1000UL);
  Serial.print(F("IGN FORCED "));
  Serial.println(ignition_on ? F("ON") : F("OFF"));
}

void ecu_model_force_ignition_for(bool ignition_on, uint32_t duration_s) {
  if (duration_s == 0) {
    ecu_model_force_ignition(ignition_on);
    return;
  }

  const uint32_t now_s = millis() / 1000UL;
  const bool return_state = s_ignition.ignition_on;
  begin_ignition_state(ignition_on, now_s);
  s_ignition.forced_cycle_active = true;
  s_ignition.forced_cycle_return_state = return_state;
  s_ignition.forced_cycle_deadline_s = now_s + duration_s;

  Serial.print(F("IGN FORCED "));
  Serial.print(ignition_on ? F("ON") : F("OFF"));
  Serial.print(F(" for "));
  Serial.print(duration_s);
  Serial.print(F("s then "));
  Serial.println(s_ignition.forced_cycle_return_state ? F("ON") : F("OFF"));
}

bool ecu_model_is_ignition_on() {
  return s_ignition.ignition_on;
}

bool ecu_model_has_ignition_timer() {
  return s_ignition.forced_cycle_active;
}

uint32_t ecu_model_ignition_timer_remaining_s() {
  if (!s_ignition.forced_cycle_active) {
    return 0;
  }

  const uint32_t now_s = millis() / 1000UL;
  if (now_s >= s_ignition.forced_cycle_deadline_s) {
    return 0;
  }
  return s_ignition.forced_cycle_deadline_s - now_s;
}

const ecu_snapshot_t &ecu_model_get() {
  return s_snapshot;
}
