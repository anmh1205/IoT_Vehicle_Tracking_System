#include "ecu-model.h"

#include <EEPROM.h>
#include "diagnostic-state-model.h"
#include "driver-input-profile.h"
#include "obd-snapshot-builder.h"
#include "powertrain-state-model.h"

namespace {
constexpr uint32_t k_drive_ms = 222250UL;
constexpr uint32_t k_parked_ms = 360000UL;
constexpr uint32_t k_crank_start_ms = 1400UL;
constexpr uint32_t k_engine_start_ms = 2250UL;
constexpr uint32_t k_tick_ms = 20UL;
constexpr uint8_t k_record_version = 0x81;
constexpr uint8_t k_valid_record = 0xA5;

struct diagnostic_record_t {
  uint8_t valid;
  uint8_t version;
  uint8_t sequence;
  uint8_t profile;
  uint8_t failed_drives;
  uint8_t clean_drives;
  uint8_t flags;
  uint8_t incomplete_monitors;
  ecu_snapshot_t freeze;
  uint16_t checksum;
};

const powertrain_config_t &s_config = default_powertrain_config();
ecu_snapshot_t s_snapshot = {};
ecu_snapshot_t s_freeze = {};
powertrain_state_t s_powertrain = {};
diagnostic_state_t s_diagnostics = {};
ignition_cycle_state_t s_ignition = {};
uint32_t s_last_tick_ms = 0;
uint32_t s_cleared_ms = 0;
uint32_t s_runtime_ms = 0;
uint32_t s_time_with_mil_ms = 0;
uint64_t s_distance_mm = 0;
uint64_t s_distance_with_mil_mm = 0;
uint8_t s_profile = 0;
uint8_t s_sequence = 0;
uint8_t s_record_slot = 1;

uint16_t checksum(const diagnostic_record_t &record) {
  uint16_t crc = 0xFFFF;
  const uint8_t *bytes = reinterpret_cast<const uint8_t *>(&record);
  for (size_t i = 1; i < offsetof(diagnostic_record_t, checksum); ++i) {
    crc ^= bytes[i];
    for (uint8_t bit = 0; bit < 8; ++bit) {
      crc = (crc >> 1U) ^ ((crc & 1U) ? 0xA001U : 0);
    }
  }
  return crc;
}

bool valid_record(const diagnostic_record_t &record) {
  return record.valid == k_valid_record && record.version == k_record_version &&
         record.profile < fault_profile_count() && record.failed_drives <= 3 &&
         record.clean_drives <= 40 && checksum(record) == record.checksum;
}

uint8_t diagnostic_flags() {
  return (s_diagnostics.pending ? 1U : 0U) |
         (s_diagnostics.stored ? 2U : 0U) |
         (s_diagnostics.permanent ? 4U : 0U) |
         (s_diagnostics.mil_on ? 8U : 0U) |
         (s_diagnostics.secondary_stored ? 16U : 0U) |
         (s_diagnostics.fault_enabled ? 32U : 0U);
}

void load_diagnostics() {
  diagnostic_record_t best = {};
  for (uint8_t slot = 0; slot < 2; ++slot) {
    diagnostic_record_t record = {};
    EEPROM.get(slot * sizeof(record), record);
    if (valid_record(record) &&
        (best.valid != k_valid_record || static_cast<int8_t>(record.sequence - best.sequence) > 0)) {
      best = record;
      s_record_slot = slot;
    }
  }
  s_profile = best.profile;
  s_sequence = best.sequence;
  diagnostic_state_begin(s_diagnostics, s_profile);
  s_freeze = best.freeze;
  if (best.valid == k_valid_record) {
    s_diagnostics.failed_drives = best.failed_drives;
    s_diagnostics.clean_drives = best.clean_drives;
    s_diagnostics.pending = (best.flags & 1U) != 0;
    s_diagnostics.stored = (best.flags & 2U) != 0;
    s_diagnostics.permanent = (best.flags & 4U) != 0;
    s_diagnostics.mil_on = (best.flags & 8U) != 0;
    s_diagnostics.secondary_stored = (best.flags & 16U) != 0;
    s_diagnostics.fault_enabled = (best.flags & 32U) != 0;
    s_diagnostics.incomplete_monitors = best.incomplete_monitors;
  }
}

void save_diagnostics() {
  diagnostic_record_t record = {};
  record.version = k_record_version;
  record.sequence = ++s_sequence;
  record.profile = s_profile;
  record.failed_drives = s_diagnostics.failed_drives;
  record.clean_drives = s_diagnostics.clean_drives;
  record.flags = diagnostic_flags();
  record.incomplete_monitors = s_diagnostics.incomplete_monitors;
  record.freeze = s_freeze;
  record.checksum = checksum(record);
  s_record_slot ^= 1U;
  const int address = s_record_slot * sizeof(record);
  // The previous slot is still readable if power drops during this write.
  EEPROM.update(address, 0);
  EEPROM.put(address, record);
  EEPROM.update(address, k_valid_record);
}

uint16_t diagnostic_signature() {
  return diagnostic_flags() | (static_cast<uint16_t>(s_diagnostics.failed_drives) << 6U) |
         (static_cast<uint16_t>(s_diagnostics.clean_drives) << 8U);
}

void begin_ignition_state(bool ignition_on, uint32_t now) {
  if (s_ignition.ignition_on != ignition_on) {
    const uint16_t previous = diagnostic_signature();
    if (ignition_on) {
      diagnostic_state_begin_drive(s_diagnostics);
    } else {
      diagnostic_state_finish_drive(s_diagnostics);
      if (!s_diagnostics.stored) {
        s_freeze = {};
      }
      if (previous != diagnostic_signature()) {
        save_diagnostics();
      }
    }
    s_runtime_ms = 0;
    s_powertrain.runtime_s = 0;
  }
  s_ignition.ignition_on = ignition_on;
  s_ignition.started_ms = now;
  s_ignition.duration_ms = ignition_on ? k_drive_ms : k_parked_ms;
  Serial.println(ignition_on ? F("IGN ON") : F("IGN OFF"));
}

bool reached(uint32_t now, uint32_t deadline) {
  return static_cast<int32_t>(now - deadline) >= 0;
}

void update_ignition(uint32_t now) {
  if (s_ignition.forced_cycle_active) {
    if (reached(now, s_ignition.forced_cycle_deadline_ms)) {
      s_ignition.forced_cycle_active = false;
      begin_ignition_state(s_ignition.forced_cycle_return_state, now);
    }
  } else if (now - s_ignition.started_ms >= s_ignition.duration_ms) {
    begin_ignition_state(!s_ignition.ignition_on, now);
  }
}

ignition_phase_t ignition_phase(uint32_t elapsed) {
  if (!s_ignition.ignition_on) {
    return IGNITION_OFF;
  }
  if (elapsed < k_crank_start_ms) {
    return IGNITION_KEY_ON;
  }
  return elapsed < k_engine_start_ms ? IGNITION_CRANKING : IGNITION_RUNNING;
}

void update_counters(uint32_t now, uint32_t delta_ms) {
  const uint32_t distance_delta_mm = static_cast<uint32_t>(s_powertrain.speed_kph * delta_ms / 3.6f);
  s_distance_mm += distance_delta_mm;
  if (s_powertrain.engine_running) {
    s_runtime_ms += delta_ms;
    if (s_diagnostics.mil_on) {
      s_time_with_mil_ms += delta_ms;
      s_distance_with_mil_mm += distance_delta_mm;
    }
    if (s_powertrain.fuel_level_pct > 8.0f) {
      const float liters_per_h = 0.7f + s_powertrain.rpm / 2400.0f + s_powertrain.throttle_actual_pct / 32.0f;
      s_powertrain.fuel_level_pct -= liters_per_h * delta_ms * (100.0f / (50.0f * 3600000.0f));
    }
  }

  s_powertrain.runtime_s = s_runtime_ms / 1000UL;
  s_powertrain.time_with_mil_s = s_time_with_mil_ms / 1000UL;
  s_powertrain.distance_m = s_distance_mm / 1000UL;
  s_powertrain.distance_with_mil_m = s_distance_with_mil_mm / 1000UL;
  s_powertrain.total_elapsed_s = (now - s_cleared_ms) / 1000UL;
}
}  // namespace

void ecu_model_begin() {
  const uint32_t now = millis();
  s_last_tick_ms = now;
  s_cleared_ms = now;
  powertrain_state_begin(s_powertrain);
  load_diagnostics();
  begin_ignition_state(true, now);
  diagnostic_state_tick(s_diagnostics, s_powertrain, 0);
  build_obd_snapshot(s_snapshot, s_powertrain, s_diagnostics);
}

void ecu_model_tick() {
  const uint32_t now = millis();
  const uint32_t elapsed = now - s_last_tick_ms;
  if (elapsed < k_tick_ms) {
    return;
  }
  const uint32_t delta_ms = min(elapsed, 250UL);
  s_last_tick_ms = now;
  update_ignition(now);

  const uint32_t ignition_elapsed = now - s_ignition.started_ms;
  const ignition_phase_t phase = ignition_phase(ignition_elapsed);
  const uint32_t drive_ms = phase == IGNITION_RUNNING ? ignition_elapsed - k_engine_start_ms : 0;
  const driver_command_t command = resolve_driver_command(drive_ms / 1000UL);
  const uint16_t previous = diagnostic_signature();
  const uint8_t previous_readiness = s_diagnostics.incomplete_monitors;
  powertrain_state_tick(s_powertrain, s_config, command, phase, delta_ms);
  diagnostic_state_tick(s_diagnostics, s_powertrain, delta_ms);
  update_counters(now, delta_ms);
  build_obd_snapshot(s_snapshot, s_powertrain, s_diagnostics);
  if (s_diagnostics.stored && s_freeze.stored_dtc.count == 0) {
    s_freeze = s_snapshot;
  }
  if (previous != diagnostic_signature() || previous_readiness != s_diagnostics.incomplete_monitors) {
    save_diagnostics();
  }
}

void ecu_model_force_ignition(bool ignition_on) {
  s_ignition.forced_cycle_active = false;
  begin_ignition_state(ignition_on, millis());
}

void ecu_model_force_ignition_for(bool ignition_on, uint32_t duration_s) {
  if (duration_s == 0) {
    ecu_model_force_ignition(ignition_on);
    return;
  }
  const uint32_t now = millis();
  const bool return_state = s_ignition.ignition_on;
  begin_ignition_state(ignition_on, now);
  s_ignition.forced_cycle_active = true;
  s_ignition.forced_cycle_return_state = return_state;
  s_ignition.forced_cycle_deadline_ms = now + duration_s * 1000UL;
}

bool ecu_model_is_ignition_on() { return s_ignition.ignition_on; }
bool ecu_model_has_ignition_timer() { return s_ignition.forced_cycle_active; }

uint32_t ecu_model_ignition_timer_remaining_s() {
  const uint32_t now = millis();
  if (!s_ignition.forced_cycle_active || reached(now, s_ignition.forced_cycle_deadline_ms)) {
    return 0;
  }
  return (s_ignition.forced_cycle_deadline_ms - now + 999U) / 1000UL;
}

const ecu_snapshot_t &ecu_model_get() { return s_snapshot; }

const ecu_snapshot_t *ecu_model_get_freeze_frame() {
  return s_freeze.stored_dtc.count != 0 ? &s_freeze : nullptr;
}

bool ecu_model_clear_diagnostics() {
  if (s_powertrain.speed_kph >= 1.0f) {
    return false;
  }
  diagnostic_state_clear(s_diagnostics);
  s_freeze = {};
  s_distance_mm = 0;
  s_distance_with_mil_mm = 0;
  s_time_with_mil_ms = 0;
  s_cleared_ms = millis();
  update_counters(s_cleared_ms, 0);
  diagnostic_state_tick(s_diagnostics, s_powertrain, 0);
  build_obd_snapshot(s_snapshot, s_powertrain, s_diagnostics);
  save_diagnostics();
  return true;
}

void ecu_model_set_fault_enabled(bool enabled) {
  if (s_diagnostics.fault_enabled != enabled) {
    s_diagnostics.fault_enabled = enabled;
    s_diagnostics.active_ms = 0;
    save_diagnostics();
  }
}

bool ecu_model_set_fault_profile(uint8_t profile) {
  if (profile >= fault_profile_count() || s_diagnostics.pending ||
      s_diagnostics.stored || s_diagnostics.permanent) {
    return false;
  }
  const bool enabled = s_diagnostics.fault_enabled;
  s_profile = profile;
  diagnostic_state_begin(s_diagnostics, s_profile);
  s_diagnostics.fault_enabled = enabled;
  save_diagnostics();
  return true;
}
