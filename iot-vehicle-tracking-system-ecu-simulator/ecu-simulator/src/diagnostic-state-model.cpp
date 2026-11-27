#include "diagnostic-state-model.h"

namespace {
const fault_profile_t k_fault_profiles[] = {
    {FAULT_KIND_LEAN_CRUISE, 0x0171, 0x0133, 0x0171, 9, 6},
    {FAULT_KIND_MISFIRE_LOAD, 0x0300, 0x0301, 0x0300, 4, 1},
    {FAULT_KIND_CATALYST_EFFICIENCY, 0x0420, 0x0139, 0x0420, -2, 3},
};

bool can_run_monitor(const fault_profile_t &profile, const powertrain_state_t &powertrain) {
  if (!powertrain.engine_running) {
    return false;
  }

  switch (profile.kind) {
    case FAULT_KIND_LEAN_CRUISE:
      return powertrain.selector == SELECTOR_POSITION_D && powertrain.gear >= 3 && powertrain.speed_kph >= 45.0f &&
             powertrain.speed_kph <= 90.0f && powertrain.throttle_actual_pct >= 16.0f && powertrain.throttle_actual_pct <= 32.0f;
    case FAULT_KIND_MISFIRE_LOAD:
      return powertrain.selector == SELECTOR_POSITION_D && powertrain.rpm >= 2200.0f && powertrain.throttle_actual_pct >= 42.0f;
    case FAULT_KIND_CATALYST_EFFICIENCY:
    default:
      return powertrain.selector == SELECTOR_POSITION_D && powertrain.runtime_s >= 90UL && powertrain.speed_kph >= 55.0f &&
             powertrain.speed_kph <= 88.0f && powertrain.throttle_actual_pct >= 14.0f && powertrain.throttle_actual_pct <= 30.0f;
  }
}

constexpr uint8_t k_supported_monitors = 0x65;  // Catalyst, EVAP, oxygen sensor and heater.

void update_readiness(diagnostic_state_t &state, const powertrain_state_t &powertrain) {
  if (powertrain.engine_running && powertrain.runtime_s >= 8) {
    state.incomplete_monitors &= ~0x40U;
  }
  if (powertrain.coolant_c >= 70.0f && powertrain.runtime_s >= 35) {
    state.incomplete_monitors &= ~0x20U;
  }
  if (powertrain.coolant_c >= 80.0f && powertrain.runtime_s >= 90 && powertrain.speed_kph >= 48.0f) {
    state.incomplete_monitors &= ~0x01U;
  }
  if (powertrain.runtime_s >= 150 && powertrain.fuel_level_pct > 15.0f &&
      powertrain.fuel_level_pct < 90.0f) {
    state.incomplete_monitors &= ~0x04U;
  }
  state.reported_dtc_count = state.stored ? (state.secondary_stored ? 2 : 1) : 0;
  state.readiness_bytes[0] = (state.mil_on ? 0x80U : 0U) | state.reported_dtc_count;
  state.readiness_bytes[1] = powertrain.runtime_s < 5 ? 0x77 : 0x07;
  state.readiness_bytes[2] = k_supported_monitors;
  state.readiness_bytes[3] = state.incomplete_monitors;
}
}  // namespace

uint8_t fault_profile_count() {
  return static_cast<uint8_t>(sizeof(k_fault_profiles) / sizeof(k_fault_profiles[0]));
}

void diagnostic_state_begin(diagnostic_state_t &state, uint8_t profile_index) {
  state = {};
  state.profile = k_fault_profiles[profile_index % fault_profile_count()];
  state.fault_enabled = true;
  state.incomplete_monitors = k_supported_monitors;
}

void diagnostic_state_begin_drive(diagnostic_state_t &state) {
  state.active_ms = 0;
  state.tested_this_drive = false;
  state.failed_this_drive = false;
}

void diagnostic_state_finish_drive(diagnostic_state_t &state) {
  if (!state.tested_this_drive || state.failed_this_drive) {
    return;
  }
  state.pending = false;
  state.failed_drives = 0;
  if (state.clean_drives < 40) {
    ++state.clean_drives;
  }
  if (state.clean_drives >= 3) {
    state.mil_on = false;
    state.permanent = false;
  }
  if (state.clean_drives == 40) {
    state.stored = false;
    state.secondary_stored = false;
  }
}

void diagnostic_state_clear(diagnostic_state_t &state) {
  state.pending = false;
  state.stored = false;
  state.secondary_stored = false;
  state.mil_on = false;
  state.failed_drives = 0;
  state.clean_drives = 0;
  state.incomplete_monitors = k_supported_monitors;
  diagnostic_state_begin_drive(state);
}

void diagnostic_state_tick(diagnostic_state_t &state, const powertrain_state_t &powertrain, uint32_t delta_ms) {
  if (!state.tested_this_drive) {
    if (!can_run_monitor(state.profile, powertrain)) {
      state.active_ms = 0;
    } else {
      state.active_ms += delta_ms;
      if (state.active_ms >= 6000UL) {
        state.tested_this_drive = true;
        state.failed_this_drive = state.fault_enabled;
        if (state.failed_this_drive) {
          state.clean_drives = 0;
          if (state.failed_drives < 3) {
            ++state.failed_drives;
          }
          state.pending = true;
          if (state.failed_drives >= 2) {
            state.stored = true;
            state.mil_on = true;
            state.permanent = true;
          }
          state.secondary_stored = state.failed_drives >= 3;
        }
      }
    }
  }
  update_readiness(state, powertrain);
}
