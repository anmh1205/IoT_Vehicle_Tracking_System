#include "diagnostic-state-model.h"

namespace {
const fault_profile_t k_fault_profiles[] = {
    {FAULT_KIND_LEAN_CRUISE, 0x0171, 0x0133, 0x0420, 9, 6},
    {FAULT_KIND_MISFIRE_LOAD, 0x0300, 0x0301, 0x0351, 4, 1},
    {FAULT_KIND_CATALYST_EFFICIENCY, 0x0420, 0x0139, 0x0420, -2, 3},
};

bool is_fault_active(const fault_profile_t &profile, const powertrain_state_t &powertrain) {
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

void update_readiness(diagnostic_state_t &state, const powertrain_state_t &powertrain) {
  const bool warmed_up = powertrain.coolant_c >= 80.0f && powertrain.runtime_s >= 90UL;
  uint8_t spark_incomplete = 0x00;
  if (!warmed_up) {
    spark_incomplete |= 0x20;
  }
  if (!powertrain.engine_running) {
    spark_incomplete |= 0x80;
  }
  if (state.pending && !state.stored) {
    spark_incomplete |= 0x01;
  }
  const uint8_t reported_dtc_count = state.reported_dtc_count > 0x7F ? 0x7F : state.reported_dtc_count;
  state.readiness_bytes[0] = static_cast<uint8_t>((state.mil_on ? 0x80 : 0x00) | reported_dtc_count);
  state.readiness_bytes[1] = static_cast<uint8_t>(((powertrain.engine_running ? 0x00 : 0x01) << 4) | 0x07);
  state.readiness_bytes[2] = 0xE5;
  state.readiness_bytes[3] = spark_incomplete;
}
}  // namespace

uint8_t fault_profile_count() {
  return static_cast<uint8_t>(sizeof(k_fault_profiles) / sizeof(k_fault_profiles[0]));
}

void diagnostic_state_begin(diagnostic_state_t &state, uint8_t profile_index) {
  state = {};
  state.profile = k_fault_profiles[profile_index % fault_profile_count()];
}

void diagnostic_state_tick(diagnostic_state_t &state, const powertrain_state_t &powertrain, uint32_t delta_ms) {
  if (is_fault_active(state.profile, powertrain)) {
    state.active_ms += delta_ms;
  } else if (!state.stored && state.active_ms > 0) {
    const uint32_t decay_ms = delta_ms * 2UL;
    state.active_ms = state.active_ms > decay_ms ? state.active_ms - decay_ms : 0;
  }

  state.pending = state.active_ms >= 6000UL;
  state.stored = state.active_ms >= 18000UL;
  state.secondary_stored = state.active_ms >= 32000UL;
  state.permanent = state.active_ms >= 52000UL;
  state.mil_on = state.stored;
  state.reported_dtc_count = 0;
  if (state.stored) {
    state.reported_dtc_count = state.secondary_stored ? 2 : 1;
  }

  update_readiness(state, powertrain);
}
