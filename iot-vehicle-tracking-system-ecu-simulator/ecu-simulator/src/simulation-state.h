#pragma once

#include <Arduino.h>

enum selector_position_t : uint8_t {
  SELECTOR_POSITION_P = 0,
  SELECTOR_POSITION_R,
  SELECTOR_POSITION_N,
  SELECTOR_POSITION_D,
};

enum drive_intent_t : uint8_t {
  DRIVE_INTENT_PARKED = 0,
  DRIVE_INTENT_REVERSE,
  DRIVE_INTENT_NEUTRAL_IDLE,
  DRIVE_INTENT_BRAKE_HOLD,
  DRIVE_INTENT_CREEP,
  DRIVE_INTENT_ACCEL,
  DRIVE_INTENT_CRUISE,
  DRIVE_INTENT_KICKDOWN,
  DRIVE_INTENT_DECEL,
  DRIVE_INTENT_STOP,
};

struct powertrain_config_t {
  float gear_ratios[4];
  float reverse_ratio;
  float final_drive;
  float tire_circumference_m;
  uint16_t idle_rpm_cold;
  uint16_t idle_rpm_hot;
  uint16_t loaded_idle_rpm_cold;
  uint16_t loaded_idle_rpm_hot;
  uint16_t redline_rpm;
  uint16_t shift_inhibit_ms;
  uint8_t creep_target_kph;
  float converter_slip_base_rpm;
  float converter_slip_gain_rpm;
  float converter_slip_decay;
  float converter_slip_min_rpm;
  float converter_slip_max_rpm;
  float closed_throttle_drag_by_gear[4];
  uint8_t upshift_kph[4][3];
  uint8_t downshift_kph[4][3];
};

struct driver_command_t {
  selector_position_t selector;
  drive_intent_t intent;
  float throttle_pct;
  float brake_pct;
  float target_speed_kph;
  bool hold_stopped;
};

struct ignition_cycle_state_t {
  bool ignition_on;
  uint32_t started_s;
  uint32_t duration_s;
  uint32_t drive_started_s;
  bool forced_cycle_active;
  bool forced_cycle_return_state;
  uint32_t forced_cycle_deadline_s;
};

struct powertrain_state_t {
  bool engine_running;
  selector_position_t selector;
  drive_intent_t intent;
  uint8_t gear;
  float speed_kph;
  float rpm;
  float throttle_demand_pct;
  float throttle_actual_pct;
  float brake_pct;
  float converter_slip_rpm;
  float coolant_c;
  float oil_temp_c;
  float intake_air_c;
  float ambient_air_c;
  float fuel_level_pct;
  uint16_t barometric_kpa;
  uint16_t control_module_mv;
  uint16_t fuel_pressure_kpa;
  uint32_t shift_inhibit_remaining_ms;
  uint32_t runtime_s;
  uint32_t time_with_mil_s;
  uint32_t distance_m;
  uint32_t distance_with_mil_m;
  uint32_t total_elapsed_s;
};

enum fault_kind_t : uint8_t {
  FAULT_KIND_LEAN_CRUISE = 0,
  FAULT_KIND_MISFIRE_LOAD,
  FAULT_KIND_CATALYST_EFFICIENCY,
};

struct fault_profile_t {
  fault_kind_t kind;
  uint16_t primary_code;
  uint16_t secondary_code;
  uint16_t permanent_code;
  int8_t short_trim_pct;
  int8_t long_trim_pct;
};

struct diagnostic_state_t {
  fault_profile_t profile;
  uint32_t active_ms;
  bool pending;
  bool stored;
  bool permanent;
  bool secondary_stored;
  bool mil_on;
  uint8_t reported_dtc_count;
  uint8_t readiness_bytes[4];
};
