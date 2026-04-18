#include "obd-can.h"

#include "ecu-model.h"

namespace {
MCP2515 *s_can = nullptr;

const uint8_t k_supported_pids[] = {
    0x01, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
    0x10, 0x11, 0x1C, 0x1F, 0x20, 0x21, 0x2F, 0x31, 0x33, 0x40, 0x42, 0x46, 0x47, 0x4C,
    0x4D, 0x4E, 0x52, 0x5C, 0x5E, 0x60,
};

uint8_t encode_percent(uint8_t pct) { return static_cast<uint8_t>((static_cast<uint16_t>(pct) * 255U) / 100U); }
uint8_t encode_trim(int8_t pct) { return static_cast<uint8_t>(constrain(128 + ((pct * 128) / 100), 0, 255)); }
uint8_t encode_temp(int16_t celsius) { return static_cast<uint8_t>(constrain(celsius + 40, 0, 255)); }
uint8_t encode_timing(int8_t degrees) { return static_cast<uint8_t>(constrain((degrees + 64) * 2, 0, 255)); }
uint16_t response_id_for(uint16_t request_id) { return request_id >= 0x7E0 && request_id <= 0x7E7 ? request_id + 8 : 0x7E8; }

uint32_t build_bitmap(uint8_t base_pid) {
  uint32_t bits = 0;
  for (uint8_t pid : k_supported_pids) {
    if (pid <= base_pid || pid > static_cast<uint8_t>(base_pid + 0x20)) {
      continue;
    }
    bits |= (1UL << (31U - static_cast<uint8_t>(pid - base_pid - 1U)));
  }
  return bits;
}

void send_payload(uint16_t response_id, const uint8_t *payload, uint8_t payload_len) {
  if (s_can == nullptr) {
    return;
  }
  struct can_frame frame = {};
  frame.can_id = response_id;
  frame.can_dlc = static_cast<uint8_t>(min(8, payload_len + 1U));
  frame.data[0] = payload_len;
  for (uint8_t i = 0; i < payload_len && i < 7; ++i) {
    frame.data[i + 1] = payload[i];
  }
  const MCP2515::ERROR send_error = s_can->sendMessage(&frame);
  if (send_error != MCP2515::ERROR_OK) {
    Serial.print(F("CAN send failed err="));
    Serial.println(static_cast<int>(send_error));
  }
}

bool build_pid_payload(uint8_t pid, uint8_t *data, uint8_t &len) {
  const ecu_snapshot_t &snap = ecu_model_get();
  switch (pid) {
    case 0x00: case 0x20: case 0x40: case 0x60: { const uint32_t bits = build_bitmap(pid); data[0] = bits >> 24; data[1] = bits >> 16; data[2] = bits >> 8; data[3] = bits; len = 4; return true; }
    case 0x01: for (uint8_t i = 0; i < 4; ++i) { data[i] = snap.readiness_bytes[i]; } len = 4; return true;
    case 0x03: data[0] = snap.fuel_system_status_a; data[1] = snap.fuel_system_status_b; len = 2; return true;
    case 0x04: data[0] = encode_percent(snap.engine_load_pct); len = 1; return true;
    case 0x05: data[0] = encode_temp(snap.coolant_c); len = 1; return true;
    case 0x06: data[0] = encode_trim(snap.short_trim_bank1_pct); len = 1; return true;
    case 0x07: data[0] = encode_trim(snap.long_trim_bank1_pct); len = 1; return true;
    case 0x08: data[0] = encode_trim(snap.short_trim_bank2_pct); len = 1; return true;
    case 0x09: data[0] = encode_trim(snap.long_trim_bank2_pct); len = 1; return true;
    case 0x0A: data[0] = snap.fuel_pressure_kpa / 3; len = 1; return true;
    case 0x0B: data[0] = snap.intake_kpa; len = 1; return true;
    case 0x0C: data[0] = static_cast<uint8_t>((snap.rpm * 4U) >> 8); data[1] = static_cast<uint8_t>(snap.rpm * 4U); len = 2; return true;
    case 0x0D: data[0] = snap.speed_kph; len = 1; return true;
    case 0x0E: data[0] = encode_timing(snap.timing_advance_deg); len = 1; return true;
    case 0x0F: data[0] = encode_temp(snap.intake_air_c); len = 1; return true;
    case 0x10: data[0] = static_cast<uint8_t>(snap.maf_centigrams_per_s >> 8); data[1] = static_cast<uint8_t>(snap.maf_centigrams_per_s); len = 2; return true;
    case 0x11: data[0] = encode_percent(snap.throttle_pct); len = 1; return true;
    case 0x1C: data[0] = snap.obd_standard; len = 1; return true;
    case 0x1F: data[0] = static_cast<uint8_t>(snap.run_time_s >> 8); data[1] = static_cast<uint8_t>(snap.run_time_s); len = 2; return true;
    case 0x21: data[0] = static_cast<uint8_t>(snap.distance_with_mil_km >> 8); data[1] = static_cast<uint8_t>(snap.distance_with_mil_km); len = 2; return true;
    case 0x2F: data[0] = encode_percent(snap.fuel_level_pct); len = 1; return true;
    case 0x31: data[0] = static_cast<uint8_t>(snap.distance_since_clear_km >> 8); data[1] = static_cast<uint8_t>(snap.distance_since_clear_km); len = 2; return true;
    case 0x33: data[0] = snap.barometric_kpa; len = 1; return true;
    case 0x42: data[0] = static_cast<uint8_t>(snap.control_module_mv >> 8); data[1] = static_cast<uint8_t>(snap.control_module_mv); len = 2; return true;
    case 0x46: data[0] = encode_temp(snap.ambient_air_c); len = 1; return true;
    case 0x47: data[0] = encode_percent(snap.abs_throttle_b_pct); len = 1; return true;
    case 0x4C: data[0] = encode_percent(snap.commanded_throttle_pct); len = 1; return true;
    case 0x4D: data[0] = static_cast<uint8_t>(snap.time_with_mil_s >> 8); data[1] = static_cast<uint8_t>(snap.time_with_mil_s); len = 2; return true;
    case 0x4E: data[0] = static_cast<uint8_t>(snap.time_since_clear_min >> 8); data[1] = static_cast<uint8_t>(snap.time_since_clear_min); len = 2; return true;
    case 0x52: data[0] = encode_percent(snap.ethanol_pct); len = 1; return true;
    case 0x5C: data[0] = encode_temp(snap.oil_temp_c); len = 1; return true;
    case 0x5E: data[0] = static_cast<uint8_t>((snap.fuel_rate_centiliters_per_h / 5U) >> 8); data[1] = static_cast<uint8_t>(snap.fuel_rate_centiliters_per_h / 5U); len = 2; return true;
    default: return false;
  }
}

void send_current_data(uint16_t response_id, uint8_t pid) {
  uint8_t pid_data[4] = {};
  uint8_t pid_len = 0;
  if (!build_pid_payload(pid, pid_data, pid_len)) {
    return;
  }
  uint8_t payload[7] = {0x41, pid, 0, 0, 0, 0, 0};
  for (uint8_t i = 0; i < pid_len; ++i) {
    payload[i + 2] = pid_data[i];
  }
  send_payload(response_id, payload, static_cast<uint8_t>(pid_len + 2U));
}

void send_dtc(uint16_t response_id, uint8_t mode, const obd_dtc_bucket_t &bucket) {
  uint8_t payload[7] = {static_cast<uint8_t>(mode + 0x40), 0, 0, 0, 0, 0, 0};
  uint8_t out = 1;
  for (uint8_t i = 0; i < bucket.count && out + 1 < 7; ++i) {
    payload[out++] = static_cast<uint8_t>(bucket.codes[i] >> 8);
    payload[out++] = static_cast<uint8_t>(bucket.codes[i]);
  }
  if (bucket.count == 0) {
    payload[out++] = 0x00;
    payload[out++] = 0x00;
  }
  send_payload(response_id, payload, out);
}
}  // namespace

void obd_can_begin(MCP2515 &can_controller) { s_can = &can_controller; }

void obd_can_poll() {
  if (s_can == nullptr) {
    return;
  }

  struct can_frame request = {};
  if (s_can->readMessage(&request) != MCP2515::ERROR_OK) {
    return;
  }

  if (request.can_dlc < 2) {
    return;
  }

  const uint8_t mode = request.data[1];
  const uint8_t pid = request.can_dlc >= 3 ? request.data[2] : 0x00;
  const uint16_t response_id = response_id_for(static_cast<uint16_t>(request.can_id));
  const ecu_snapshot_t &snap = ecu_model_get();
  Serial.print(F("REQ id=0x"));
  Serial.print(static_cast<uint16_t>(request.can_id), HEX);
  Serial.print(F(" mode=0x"));
  Serial.print(mode, HEX);
  Serial.print(F(" pid=0x"));
  Serial.println(pid, HEX);

  if (mode == 0x01) {
    send_current_data(response_id, pid);
    Serial.print(F("PID 0x"));
    Serial.print(pid, HEX);
    Serial.print(F(" rpm="));
    Serial.print(snap.rpm);
    Serial.print(F(" spd="));
    Serial.print(snap.speed_kph);
    Serial.print(F(" mil="));
    Serial.println(snap.mil_on ? F("on") : F("off"));
    return;
  }

  if (mode == 0x03) {
    send_dtc(response_id, mode, snap.stored_dtc);
    Serial.println(F("Sent stored DTC"));
    return;
  }
  if (mode == 0x07) {
    send_dtc(response_id, mode, snap.pending_dtc);
    Serial.println(F("Sent pending DTC"));
    return;
  }
  if (mode == 0x0A) {
    send_dtc(response_id, mode, snap.permanent_dtc);
    Serial.println(F("Sent permanent DTC"));
  }
}
