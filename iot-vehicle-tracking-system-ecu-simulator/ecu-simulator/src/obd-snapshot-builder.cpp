#include "obd-snapshot-builder.h"

namespace {
uint8_t clamp_u8(int value) {
  if (value < 0) {
    return 0;
  }
  if (value > 255) {
    return 255;
  }
  return static_cast<uint8_t>(value);
}

uint16_t clamp_u16(int value) {
  if (value < 0) {
    return 0;
  }
  if (value > 65535) {
    return 65535;
  }
  return static_cast<uint16_t>(value);
}

void clear_bucket(obd_dtc_bucket_t &bucket) {
  bucket.count = 0;
  for (uint8_t i = 0; i < 3; ++i) {
    bucket.codes[i] = 0;
  }
}

void push_code(obd_dtc_bucket_t &bucket, uint16_t code) {
  if (code == 0 || bucket.count >= 3) {
    return;
  }
  bucket.codes[bucket.count++] = code;
}

uint8_t compute_engine_load(const powertrain_state_t &powertrain) {
  const float rpm_factor = min(powertrain.rpm / 6200.0f, 1.0f);
  const float load = powertrain.throttle_actual_pct * 0.72f + rpm_factor * 26.0f + (powertrain.gear > 0 ? 5.0f : 0.0f);
  return clamp_u8(static_cast<int>(load));
}

uint8_t compute_intake_kpa(const powertrain_state_t &powertrain, uint8_t engine_load_pct) {
  if (!powertrain.engine_running) {
    return clamp_u8(powertrain.barometric_kpa);
  }
  const float vacuum_relief = powertrain.throttle_actual_pct * 0.38f;
  return clamp_u8(static_cast<int>(28.0f + vacuum_relief + engine_load_pct * 0.48f));
}

int8_t compute_timing_advance(const powertrain_state_t &powertrain) {
  if (!powertrain.engine_running) {
    return 0;
  }
  if (powertrain.throttle_actual_pct < 5.0f && powertrain.speed_kph > 20.0f) {
    return 18;
  }
  if (powertrain.throttle_actual_pct > 45.0f) {
    return 11;
  }
  if (powertrain.selector == SELECTOR_POSITION_P || powertrain.selector == SELECTOR_POSITION_N) {
    return 9;
  }
  return 15;
}

uint16_t compute_maf_centigrams(const powertrain_state_t &powertrain, uint8_t engine_load_pct) {
  if (!powertrain.engine_running) {
    return 0;
  }
  const float grams_per_s = (powertrain.rpm / 110.0f) * (engine_load_pct / 100.0f) + 1.8f;
  return clamp_u16(static_cast<int>(grams_per_s * 100.0f));
}

uint16_t compute_fuel_rate_centiliters_per_h(const powertrain_state_t &powertrain, uint8_t engine_load_pct) {
  if (!powertrain.engine_running) {
    return 0;
  }
  const float liters_per_h = 0.7f + powertrain.rpm / 2400.0f + engine_load_pct / 32.0f;
  return clamp_u16(static_cast<int>(liters_per_h * 100.0f));
}
}  // namespace

void build_obd_snapshot(ecu_snapshot_t &snapshot,
                        const powertrain_state_t &powertrain,
                        const diagnostic_state_t &diagnostic) {
  snapshot = {};
  snapshot.engine_running = powertrain.engine_running;
  snapshot.mil_on = diagnostic.mil_on;
  snapshot.reported_dtc_count = diagnostic.reported_dtc_count;
  for (uint8_t i = 0; i < 4; ++i) {
    snapshot.readiness_bytes[i] = diagnostic.readiness_bytes[i];
  }

  const uint8_t engine_load_pct = compute_engine_load(powertrain);
  snapshot.fuel_system_status_a = powertrain.engine_running ? 0x02 : 0x00;
  snapshot.fuel_system_status_b = 0x00;
  snapshot.short_trim_bank1_pct = diagnostic.profile.short_trim_pct + (diagnostic.pending ? 2 : 0);
  snapshot.long_trim_bank1_pct = diagnostic.profile.long_trim_pct + (diagnostic.stored ? 2 : 0);
  snapshot.short_trim_bank2_pct = diagnostic.profile.short_trim_pct > 0 ? diagnostic.profile.short_trim_pct - 1 : diagnostic.profile.short_trim_pct + 1;
  snapshot.long_trim_bank2_pct = diagnostic.profile.long_trim_pct > 0 ? diagnostic.profile.long_trim_pct - 1 : diagnostic.profile.long_trim_pct + 1;
  snapshot.engine_load_pct = engine_load_pct;
  snapshot.coolant_c = clamp_u8(static_cast<int>(powertrain.coolant_c));
  snapshot.fuel_pressure_kpa = powertrain.fuel_pressure_kpa;
  snapshot.intake_kpa = compute_intake_kpa(powertrain, engine_load_pct);
  snapshot.rpm = clamp_u16(static_cast<int>(powertrain.rpm));
  snapshot.speed_kph = clamp_u8(static_cast<int>(powertrain.speed_kph));
  snapshot.timing_advance_deg = compute_timing_advance(powertrain);
  snapshot.intake_air_c = static_cast<int8_t>(clamp_u8(static_cast<int>(powertrain.intake_air_c + 40.0f)) - 40);
  snapshot.maf_centigrams_per_s = compute_maf_centigrams(powertrain, engine_load_pct);
  snapshot.throttle_pct = clamp_u8(static_cast<int>(powertrain.throttle_actual_pct));
  snapshot.obd_standard = 0x01;
  snapshot.run_time_s = clamp_u16(static_cast<int>(powertrain.runtime_s));
  snapshot.distance_with_mil_km = clamp_u16(static_cast<int>(powertrain.distance_with_mil_m / 1000UL));
  snapshot.fuel_level_pct = clamp_u8(static_cast<int>(powertrain.fuel_level_pct));
  snapshot.distance_since_clear_km = clamp_u16(static_cast<int>(powertrain.distance_m / 1000UL));
  snapshot.barometric_kpa = static_cast<uint8_t>(powertrain.barometric_kpa > 255 ? 255 : powertrain.barometric_kpa);
  snapshot.control_module_mv = powertrain.control_module_mv;
  snapshot.ambient_air_c = static_cast<int8_t>(clamp_u8(static_cast<int>(powertrain.ambient_air_c + 40.0f)) - 40);
  snapshot.abs_throttle_b_pct = clamp_u8(static_cast<int>(powertrain.throttle_actual_pct + 3.0f));
  snapshot.commanded_throttle_pct = clamp_u8(static_cast<int>(powertrain.throttle_demand_pct));
  snapshot.time_with_mil_s = clamp_u16(static_cast<int>(powertrain.time_with_mil_s));
  snapshot.time_since_clear_min = clamp_u16(static_cast<int>(powertrain.total_elapsed_s / 60UL));
  snapshot.ethanol_pct = 10;
  snapshot.oil_temp_c = static_cast<int16_t>(powertrain.oil_temp_c);
  snapshot.fuel_rate_centiliters_per_h = compute_fuel_rate_centiliters_per_h(powertrain, engine_load_pct);

  clear_bucket(snapshot.stored_dtc);
  clear_bucket(snapshot.pending_dtc);
  clear_bucket(snapshot.permanent_dtc);
  if (diagnostic.pending && !diagnostic.stored) {
    push_code(snapshot.pending_dtc, diagnostic.profile.primary_code);
  }
  if (diagnostic.stored) {
    push_code(snapshot.stored_dtc, diagnostic.profile.primary_code);
    if (diagnostic.secondary_stored) {
      push_code(snapshot.stored_dtc, diagnostic.profile.secondary_code);
    }
  }
  if (diagnostic.pending && diagnostic.stored && !diagnostic.secondary_stored) {
    push_code(snapshot.pending_dtc, diagnostic.profile.secondary_code);
  }
  if (diagnostic.permanent) {
    push_code(snapshot.permanent_dtc, diagnostic.profile.permanent_code);
  }
}
