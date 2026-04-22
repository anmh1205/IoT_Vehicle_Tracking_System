#include "ecu-model.h"

namespace {
struct dtc_profile_t {
  uint16_t stored[3];
  uint8_t stored_count;
  uint16_t pending[3];
  uint8_t pending_count;
  uint16_t permanent[3];
  uint8_t permanent_count;
  int8_t short_trim_pct;
  int8_t long_trim_pct;
  uint8_t spark_incomplete_bits;
};

enum drive_phase_t : uint8_t {
  DRIVE_PHASE_PARKED = 0,
  DRIVE_PHASE_IDLE,
  DRIVE_PHASE_URBAN,
  DRIVE_PHASE_CRUISE,
  DRIVE_PHASE_HIGHWAY,
  DRIVE_PHASE_DECEL,
};

constexpr uint16_t k_ignition_on_min_s = 10U * 60U;
constexpr uint16_t k_ignition_on_max_s = 18U * 60U;
constexpr uint16_t k_ignition_off_min_s = 4U * 60U;
constexpr uint16_t k_ignition_off_max_s = 8U * 60U;

ecu_snapshot_t s_snapshot = {};
uint32_t s_last_tick_ms = 0;
uint32_t s_runtime_s = 0;
uint32_t s_time_with_mil_s = 0;
uint32_t s_distance_m = 0;
uint32_t s_distance_with_mil_m = 0;
bool s_ignition_on = true;
uint32_t s_ignition_state_started_s = 0;
uint32_t s_ignition_state_duration_s = k_ignition_on_min_s;
uint32_t s_ignition_drive_started_s = 0;
uint8_t s_profile_index = 0;
uint8_t s_wave_offset = 0;
bool s_forced_cycle_active = false;
bool s_forced_cycle_return_state = false;
uint32_t s_forced_cycle_deadline_s = 0;

const dtc_profile_t k_profiles[] = {
    {{0x0171, 0x0133, 0x2195}, 3, {0x0174, 0x2195, 0x0000}, 2, {0x0420, 0x0000, 0x0000}, 1, 11, 7, 0x24},
    {{0x0300, 0x0301, 0x0351}, 3, {0x0304, 0x0351, 0x0000}, 2, {0x0300, 0x0000, 0x0000}, 1, 4, 1, 0x01},
    {{0x0101, 0x0118, 0x0500}, 3, {0x0101, 0x0500, 0x0000}, 2, {0x0420, 0x0118, 0x0000}, 2, -2, 3, 0x81},
};

template <typename T, size_t N> uint8_t array_count(const T (&)[N]) { return static_cast<uint8_t>(N); }
template <typename T> T min_value(T lhs, T rhs) { return lhs < rhs ? lhs : rhs; }

uint32_t random_duration_s(uint16_t min_s, uint16_t max_s) {
  return static_cast<uint32_t>(random(static_cast<long>(min_s), static_cast<long>(max_s) + 1L));
}

uint8_t clamp_u8(int value) {
  if (value < 0) {
    return 0;
  }
  if (value > 255) {
    return 255;
  }
  return static_cast<uint8_t>(value);
}

void log_ignition_state(bool ignition_on, uint32_t duration_s) {
  Serial.print(F("IGN "));
  Serial.print(ignition_on ? F("ON") : F("OFF"));
  Serial.print(F(" for "));
  Serial.print(duration_s);
  Serial.println(F("s"));
}

drive_phase_t resolve_phase(uint32_t cycle_s) {
  if (cycle_s < 45UL) {
    return DRIVE_PHASE_PARKED;
  }
  if (cycle_s < 70UL) {
    return DRIVE_PHASE_IDLE;
  }
  if (cycle_s < 120UL) {
    return DRIVE_PHASE_URBAN;
  }
  if (cycle_s < 160UL) {
    return DRIVE_PHASE_CRUISE;
  }
  if (cycle_s < 185UL) {
    return DRIVE_PHASE_HIGHWAY;
  }
  return DRIVE_PHASE_DECEL;
}

void copy_bucket(obd_dtc_bucket_t &dst, const uint16_t *src, uint8_t count) {
  dst.count = count;
  for (uint8_t i = 0; i < array_count(dst.codes); ++i) {
    dst.codes[i] = i < count ? src[i] : 0;
  }
}

void update_readiness(const dtc_profile_t &profile) {
  const uint8_t common_supported = 0x07;
  const uint8_t common_incomplete = s_snapshot.engine_running ? 0x00 : 0x01;
  s_snapshot.readiness_bytes[0] =
      static_cast<uint8_t>((s_snapshot.mil_on ? 0x80 : 0x00) | min_value<uint8_t>(0x7F, s_snapshot.reported_dtc_count));
  s_snapshot.readiness_bytes[1] = static_cast<uint8_t>((common_incomplete << 4) | common_supported);
  s_snapshot.readiness_bytes[2] = 0xE5;
  s_snapshot.readiness_bytes[3] = profile.spark_incomplete_bits;
}

void apply_ignition_off_snapshot(const dtc_profile_t &profile, uint8_t wave) {
  s_snapshot.engine_running = false;
  s_snapshot.engine_load_pct = 0;
  s_snapshot.rpm = 0;
  s_snapshot.speed_kph = 0;
  s_snapshot.throttle_pct = 4;
  s_snapshot.intake_kpa = 28;
  s_snapshot.coolant_c = static_cast<uint8_t>(66 + (wave / 2U));
  s_snapshot.intake_air_c = static_cast<int8_t>(28 + (wave / 3U));
  s_snapshot.ambient_air_c = static_cast<int8_t>(27 + (wave / 4U));
  s_snapshot.timing_advance_deg = 0;
  s_snapshot.maf_centigrams_per_s = 0;
  s_snapshot.abs_throttle_b_pct = 5;
  s_snapshot.commanded_throttle_pct = 5;
  s_snapshot.barometric_kpa = 100;
  s_snapshot.fuel_pressure_kpa = 285;
  s_snapshot.control_module_mv = static_cast<uint16_t>(12260 + wave * 9U);
  s_snapshot.fuel_system_status_a = 0x00;
  s_snapshot.fuel_system_status_b = 0x00;
  s_snapshot.short_trim_bank1_pct = profile.short_trim_pct;
  s_snapshot.long_trim_bank1_pct = profile.long_trim_pct;
  s_snapshot.short_trim_bank2_pct = profile.short_trim_pct > 0 ? profile.short_trim_pct - 2 : profile.short_trim_pct + 1;
  s_snapshot.long_trim_bank2_pct = profile.long_trim_pct > 0 ? profile.long_trim_pct - 1 : profile.long_trim_pct + 2;
  s_snapshot.oil_temp_c = static_cast<int16_t>(s_snapshot.coolant_c + 2);
  s_snapshot.ethanol_pct = 10;
  s_snapshot.obd_standard = 0x01;
  s_snapshot.fuel_rate_centiliters_per_h = 0;
  s_snapshot.fuel_level_pct = clamp_u8(88 - static_cast<int>(min_value<uint32_t>(55, s_distance_m / 3500UL)));
}

void update_drive_snapshot(const dtc_profile_t &profile, uint32_t drive_elapsed_s) {
  const uint32_t cycle_s = drive_elapsed_s % 200UL;
  const uint8_t wave = static_cast<uint8_t>(((drive_elapsed_s / 3UL) + s_wave_offset) % 8UL);
  const drive_phase_t phase = resolve_phase(cycle_s);

  s_snapshot.engine_running = true;
  switch (phase) {
    case DRIVE_PHASE_PARKED:
      s_snapshot.engine_load_pct = static_cast<uint8_t>(16 + wave);
      s_snapshot.rpm = static_cast<uint16_t>(760 + wave * 18U);
      s_snapshot.speed_kph = 0;
      s_snapshot.throttle_pct = static_cast<uint8_t>(9 + wave);
      s_snapshot.intake_kpa = static_cast<uint8_t>(31 + wave);
      s_snapshot.coolant_c = static_cast<uint8_t>(72 + (wave / 2U));
      s_snapshot.intake_air_c = static_cast<int8_t>(27 + (wave / 3U));
      s_snapshot.ambient_air_c = static_cast<int8_t>(28 + (wave / 4U));
      s_snapshot.timing_advance_deg = 8;
      s_snapshot.maf_centigrams_per_s = static_cast<uint16_t>(210 + wave * 14U);
      break;
    case DRIVE_PHASE_IDLE:
      s_snapshot.engine_load_pct = static_cast<uint8_t>(18 + wave);
      s_snapshot.rpm = static_cast<uint16_t>(780 + wave * 22U);
      s_snapshot.speed_kph = 0;
      s_snapshot.throttle_pct = static_cast<uint8_t>(12 + wave);
      s_snapshot.intake_kpa = static_cast<uint8_t>(36 + wave);
      s_snapshot.coolant_c = static_cast<uint8_t>(78 + wave);
      s_snapshot.intake_air_c = static_cast<int8_t>(29 + (wave / 2U));
      s_snapshot.ambient_air_c = static_cast<int8_t>(29 + (wave / 3U));
      s_snapshot.timing_advance_deg = static_cast<int8_t>(10 + wave);
      s_snapshot.maf_centigrams_per_s = static_cast<uint16_t>(260 + wave * 18U);
      break;
    case DRIVE_PHASE_URBAN:
      s_snapshot.engine_load_pct = static_cast<uint8_t>(28 + wave * 2U);
      s_snapshot.rpm = static_cast<uint16_t>(1320 + wave * 95U);
      s_snapshot.speed_kph = static_cast<uint8_t>(22 + wave * 3U);
      s_snapshot.throttle_pct = static_cast<uint8_t>(22 + wave);
      s_snapshot.intake_kpa = static_cast<uint8_t>(48 + wave);
      s_snapshot.coolant_c = static_cast<uint8_t>(86 + wave);
      s_snapshot.intake_air_c = static_cast<int8_t>(31 + wave);
      s_snapshot.ambient_air_c = static_cast<int8_t>(30 + (wave / 2U));
      s_snapshot.timing_advance_deg = static_cast<int8_t>(13 + wave);
      s_snapshot.maf_centigrams_per_s = static_cast<uint16_t>(640 + wave * 34U);
      break;
    case DRIVE_PHASE_CRUISE:
      s_snapshot.engine_load_pct = static_cast<uint8_t>(42 + wave * 2U);
      s_snapshot.rpm = static_cast<uint16_t>(2180 + wave * 70U);
      s_snapshot.speed_kph = static_cast<uint8_t>(70 + wave * 3U);
      s_snapshot.throttle_pct = static_cast<uint8_t>(28 + wave);
      s_snapshot.intake_kpa = static_cast<uint8_t>(60 + wave);
      s_snapshot.coolant_c = static_cast<uint8_t>(90 + wave);
      s_snapshot.intake_air_c = static_cast<int8_t>(34 + wave);
      s_snapshot.ambient_air_c = static_cast<int8_t>(31 + (wave / 2U));
      s_snapshot.timing_advance_deg = static_cast<int8_t>(17 + wave);
      s_snapshot.maf_centigrams_per_s = static_cast<uint16_t>(1080 + wave * 42U);
      break;
    case DRIVE_PHASE_HIGHWAY:
      s_snapshot.engine_load_pct = static_cast<uint8_t>(62 + wave * 3U);
      s_snapshot.rpm = static_cast<uint16_t>(3040 + wave * 90U);
      s_snapshot.speed_kph = static_cast<uint8_t>(100 + wave * 3U);
      s_snapshot.throttle_pct = static_cast<uint8_t>(42 + wave * 2U);
      s_snapshot.intake_kpa = static_cast<uint8_t>(76 + wave);
      s_snapshot.coolant_c = static_cast<uint8_t>(94 + wave);
      s_snapshot.intake_air_c = static_cast<int8_t>(36 + wave);
      s_snapshot.ambient_air_c = static_cast<int8_t>(32 + (wave / 2U));
      s_snapshot.timing_advance_deg = static_cast<int8_t>(20 + wave);
      s_snapshot.maf_centigrams_per_s = static_cast<uint16_t>(1480 + wave * 48U);
      break;
    case DRIVE_PHASE_DECEL:
    default:
      s_snapshot.engine_load_pct = static_cast<uint8_t>(16 + wave);
      s_snapshot.rpm = static_cast<uint16_t>(1180 + wave * 42U);
      s_snapshot.speed_kph = static_cast<uint8_t>(18 + wave * 2U);
      s_snapshot.throttle_pct = static_cast<uint8_t>(10 + wave);
      s_snapshot.intake_kpa = static_cast<uint8_t>(32 + wave);
      s_snapshot.coolant_c = static_cast<uint8_t>(83 + wave);
      s_snapshot.intake_air_c = static_cast<int8_t>(30 + (wave / 2U));
      s_snapshot.ambient_air_c = static_cast<int8_t>(29 + (wave / 3U));
      s_snapshot.timing_advance_deg = static_cast<int8_t>(11 + wave);
      s_snapshot.maf_centigrams_per_s = static_cast<uint16_t>(340 + wave * 18U);
      break;
  }

  s_snapshot.abs_throttle_b_pct = clamp_u8(s_snapshot.throttle_pct + (s_snapshot.engine_running ? 3 : 1));
  s_snapshot.commanded_throttle_pct = clamp_u8(s_snapshot.throttle_pct + (s_snapshot.engine_running ? 5 : 2));
  s_snapshot.barometric_kpa = 100;
  s_snapshot.fuel_pressure_kpa = !s_snapshot.engine_running ? 285 : phase < DRIVE_PHASE_HIGHWAY ? 320 + wave * 3U : 345 + wave * 2U;
  s_snapshot.control_module_mv = s_snapshot.engine_running ? static_cast<uint16_t>(13750 + wave * 18) : static_cast<uint16_t>(12380 + wave * 11);
  s_snapshot.fuel_system_status_a = s_snapshot.engine_running ? 0x02 : 0x00;
  s_snapshot.fuel_system_status_b = 0x00;
  s_snapshot.short_trim_bank1_pct = profile.short_trim_pct;
  s_snapshot.long_trim_bank1_pct = profile.long_trim_pct;
  s_snapshot.short_trim_bank2_pct = profile.short_trim_pct > 0 ? profile.short_trim_pct - 2 : profile.short_trim_pct + 1;
  s_snapshot.long_trim_bank2_pct = profile.long_trim_pct > 0 ? profile.long_trim_pct - 1 : profile.long_trim_pct + 2;
  s_snapshot.oil_temp_c = static_cast<int16_t>(s_snapshot.coolant_c + 7);
  s_snapshot.ethanol_pct = 10;
  s_snapshot.obd_standard = 0x01;
  s_snapshot.fuel_rate_centiliters_per_h = s_snapshot.engine_running ? static_cast<uint16_t>(180 + s_snapshot.engine_load_pct * 6U) : 0;
  s_snapshot.fuel_level_pct = clamp_u8(88 - static_cast<int>(min_value<uint32_t>(55, s_distance_m / 3500UL)));
}

void begin_ignition_state(bool ignition_on, uint32_t now_s) {
  s_ignition_on = ignition_on;
  s_ignition_state_started_s = now_s;
  s_ignition_state_duration_s =
      ignition_on ? random_duration_s(k_ignition_on_min_s, k_ignition_on_max_s) : random_duration_s(k_ignition_off_min_s, k_ignition_off_max_s);
  if (ignition_on) {
    s_ignition_drive_started_s = now_s;
    s_profile_index = static_cast<uint8_t>(random(0, array_count(k_profiles)));
    s_wave_offset = static_cast<uint8_t>(random(0, 24));
  }
  log_ignition_state(ignition_on, s_ignition_state_duration_s);
}

void update_ignition_state(uint32_t now_s) {
  if (now_s - s_ignition_state_started_s < s_ignition_state_duration_s) {
    return;
  }
  begin_ignition_state(!s_ignition_on, now_s);
}

void maybe_complete_forced_cycle(uint32_t now_s) {
  if (!s_forced_cycle_active || now_s < s_forced_cycle_deadline_s) {
    return;
  }

  const bool return_state = s_forced_cycle_return_state;
  s_forced_cycle_active = false;
  s_forced_cycle_deadline_s = 0;
  begin_ignition_state(return_state, now_s);
  Serial.print(F("IGN TIMER END -> "));
  Serial.println(return_state ? F("ON") : F("OFF"));
}
}  // namespace

void ecu_model_begin() {
  randomSeed(static_cast<unsigned long>(analogRead(A0) ^ micros()));
  begin_ignition_state(true, 0);
}

void ecu_model_tick() {
  const uint32_t now_ms = millis();
  const uint32_t now_s = now_ms / 1000UL;
  const uint32_t delta_ms = s_last_tick_ms == 0 ? 0 : min_value<uint32_t>(1000UL, now_ms - s_last_tick_ms);
  s_last_tick_ms = now_ms;
  maybe_complete_forced_cycle(now_s);
  if (!s_forced_cycle_active) {
    update_ignition_state(now_s);
  }

  const dtc_profile_t &profile = k_profiles[s_profile_index % array_count(k_profiles)];
  copy_bucket(s_snapshot.stored_dtc, profile.stored, profile.stored_count);
  copy_bucket(s_snapshot.pending_dtc, profile.pending, profile.pending_count);
  copy_bucket(s_snapshot.permanent_dtc, profile.permanent, profile.permanent_count);

  s_snapshot.reported_dtc_count = s_snapshot.stored_dtc.count;
  s_snapshot.mil_on = s_snapshot.reported_dtc_count > 0;
  if (s_ignition_on) {
    update_drive_snapshot(profile, now_s - s_ignition_drive_started_s);
  } else {
    const uint8_t wave = static_cast<uint8_t>(((now_s - s_ignition_state_started_s) / 4UL) % 8UL);
    apply_ignition_off_snapshot(profile, wave);
  }

  if (delta_ms > 0) {
    if (s_snapshot.engine_running) {
      s_runtime_s += delta_ms / 1000UL;
      s_distance_m += static_cast<uint32_t>((static_cast<uint64_t>(s_snapshot.speed_kph) * delta_ms * 1000ULL) / 3600000ULL);
    }
    if (s_snapshot.engine_running && s_snapshot.mil_on) {
      s_time_with_mil_s += delta_ms / 1000UL;
      s_distance_with_mil_m += static_cast<uint32_t>((static_cast<uint64_t>(s_snapshot.speed_kph) * delta_ms * 1000ULL) / 3600000ULL);
    }
  }

  s_snapshot.run_time_s = static_cast<uint16_t>(min_value<uint32_t>(65535UL, s_runtime_s));
  s_snapshot.time_with_mil_s = static_cast<uint16_t>(min_value<uint32_t>(65535UL, s_time_with_mil_s));
  s_snapshot.distance_since_clear_km = static_cast<uint16_t>(min_value<uint32_t>(65535UL, s_distance_m / 1000UL));
  s_snapshot.distance_with_mil_km = static_cast<uint16_t>(min_value<uint32_t>(65535UL, s_distance_with_mil_m / 1000UL));
  s_snapshot.time_since_clear_min = static_cast<uint16_t>(min_value<uint32_t>(65535UL, now_s / 60UL));
  update_readiness(profile);
}

void ecu_model_force_ignition(bool ignition_on) {
  s_forced_cycle_active = false;
  s_forced_cycle_deadline_s = 0;
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
  begin_ignition_state(ignition_on, now_s);
  s_forced_cycle_active = true;
  s_forced_cycle_return_state = !ignition_on;
  s_forced_cycle_deadline_s = now_s + duration_s;

  Serial.print(F("IGN FORCED "));
  Serial.print(ignition_on ? F("ON") : F("OFF"));
  Serial.print(F(" for "));
  Serial.print(duration_s);
  Serial.print(F("s then "));
  Serial.println(s_forced_cycle_return_state ? F("ON") : F("OFF"));
}

bool ecu_model_is_ignition_on() {
  return s_ignition_on;
}

bool ecu_model_has_ignition_timer() {
  return s_forced_cycle_active;
}

uint32_t ecu_model_ignition_timer_remaining_s() {
  if (!s_forced_cycle_active) {
    return 0;
  }

  const uint32_t now_s = millis() / 1000UL;
  if (now_s >= s_forced_cycle_deadline_s) {
    return 0;
  }
  return s_forced_cycle_deadline_s - now_s;
}

const ecu_snapshot_t &ecu_model_get() {
  ecu_model_tick();
  return s_snapshot;
}
