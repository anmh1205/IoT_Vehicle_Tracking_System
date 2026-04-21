#pragma once

#include <Arduino.h>

struct obd_dtc_bucket_t {
  uint16_t codes[3];
  uint8_t count;
};

struct ecu_snapshot_t {
  bool engine_running;
  bool mil_on;
  uint8_t reported_dtc_count;
  uint8_t readiness_bytes[4];
  uint8_t fuel_system_status_a;
  uint8_t fuel_system_status_b;
  int8_t short_trim_bank1_pct;
  int8_t long_trim_bank1_pct;
  int8_t short_trim_bank2_pct;
  int8_t long_trim_bank2_pct;
  uint8_t engine_load_pct;
  uint8_t coolant_c;
  uint16_t fuel_pressure_kpa;
  uint8_t intake_kpa;
  uint16_t rpm;
  uint8_t speed_kph;
  int8_t timing_advance_deg;
  int8_t intake_air_c;
  uint16_t maf_centigrams_per_s;
  uint8_t throttle_pct;
  uint8_t obd_standard;
  uint16_t run_time_s;
  uint16_t distance_with_mil_km;
  uint8_t fuel_level_pct;
  uint16_t distance_since_clear_km;
  uint8_t barometric_kpa;
  uint16_t control_module_mv;
  int8_t ambient_air_c;
  uint8_t abs_throttle_b_pct;
  uint8_t commanded_throttle_pct;
  uint16_t time_with_mil_s;
  uint16_t time_since_clear_min;
  uint8_t ethanol_pct;
  int16_t oil_temp_c;
  uint16_t fuel_rate_centiliters_per_h;
  obd_dtc_bucket_t stored_dtc;
  obd_dtc_bucket_t pending_dtc;
  obd_dtc_bucket_t permanent_dtc;
};

void ecu_model_begin();
void ecu_model_tick();
const ecu_snapshot_t &ecu_model_get();
