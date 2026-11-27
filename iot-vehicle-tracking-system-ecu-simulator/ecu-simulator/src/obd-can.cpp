#include "obd-can.h"

#include <avr/pgmspace.h>

#include "ecu-model.h"

namespace {
constexpr uint16_t k_functional_id = 0x7DF;
constexpr uint16_t k_request_id = 0x7E0;
constexpr uint16_t k_response_id = 0x7E8;
constexpr uint32_t k_flow_timeout_us = 1000000UL;
constexpr uint8_t k_max_payload = 20;
const char k_vin[] PROGMEM = "TSTATS116N0000001";
static_assert(sizeof(k_vin) == 18, "VIN must have 17 characters");

MCP2515 *s_can = nullptr;
struct tx_state_t {
  uint8_t data[k_max_payload];
  uint8_t length;
  uint8_t offset;
  uint8_t sequence;
  uint8_t block_left;
  uint8_t waits;
  bool unlimited;
  bool wait_for_flow;
  uint32_t separation_us;
  uint32_t next_us;
  uint32_t deadline_us;
};
tx_state_t s_tx = {};

const uint8_t k_supported_pids[] = {
    0x01, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
    0x10, 0x11, 0x1C, 0x1F, 0x20, 0x21, 0x2F, 0x31, 0x33, 0x40, 0x42, 0x46, 0x47, 0x4C,
    0x4D, 0x4E, 0x52, 0x5C, 0x5E,
};

uint8_t encode_percent(uint8_t pct) { return static_cast<uint8_t>((static_cast<uint16_t>(pct) * 255U) / 100U); }
uint8_t encode_trim(int8_t pct) { return static_cast<uint8_t>(constrain(128 + ((pct * 128) / 100), 0, 255)); }
uint8_t encode_temp(int16_t celsius) { return static_cast<uint8_t>(constrain(celsius + 40, 0, 255)); }
uint8_t encode_timing(int8_t degrees) { return static_cast<uint8_t>(constrain((degrees + 64) * 2, 0, 255)); }

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

bool send_frame(const uint8_t *bytes, uint8_t length) {
  can_frame frame = {};
  frame.can_id = k_response_id;
  frame.can_dlc = 8;
  memcpy(frame.data, bytes, length);
  return s_can->sendMessage(&frame) == MCP2515::ERROR_OK;
}

bool reached(uint32_t now, uint32_t deadline) {
  return static_cast<int32_t>(now - deadline) >= 0;
}

void send_payload(const uint8_t *payload, uint8_t length, uint32_t now) {
  if (length <= 7) {
    uint8_t frame[8] = {length};
    memcpy(frame + 1, payload, length);
    (void)send_frame(frame, length + 1U);
    return;
  }
  if (length > sizeof(s_tx.data)) {
    return;
  }

  uint8_t frame[8] = {0x10, length};
  memcpy(frame + 2, payload, 6);
  if (send_frame(frame, sizeof(frame))) {
    s_tx = {};
    memcpy(s_tx.data, payload, length);
    s_tx.length = length;
    s_tx.offset = 6;
    s_tx.sequence = 1;
    s_tx.wait_for_flow = true;
    s_tx.deadline_us = now + k_flow_timeout_us;
  }
}

void handle_flow_control(const can_frame &frame, uint32_t now) {
  if (frame.can_id != k_request_id || frame.can_dlc < 3 || !s_tx.wait_for_flow) {
    return;
  }

  const uint8_t status = frame.data[0] & 0x0F;
  if (status == 1 && s_tx.waits < 3) {
    ++s_tx.waits;
    s_tx.deadline_us = now + k_flow_timeout_us;
    return;
  }
  if (status != 0) {
    s_tx.length = 0;
    return;
  }

  const uint8_t stmin = frame.data[2];
  if (stmin <= 0x7F) {
    s_tx.separation_us = static_cast<uint32_t>(stmin) * 1000UL;
  } else if (stmin >= 0xF1 && stmin <= 0xF9) {
    s_tx.separation_us = static_cast<uint32_t>(stmin - 0xF0) * 100UL;
  } else {
    s_tx.separation_us = 127000UL;
  }
  s_tx.unlimited = frame.data[1] == 0;
  s_tx.block_left = frame.data[1];
  s_tx.wait_for_flow = false;
  s_tx.next_us = now + s_tx.separation_us;
  s_tx.deadline_us = now + k_flow_timeout_us;
}

void advance_transfer(uint32_t now) {
  if (s_tx.length == 0) {
    return;
  }
  if (reached(now, s_tx.deadline_us)) {
    s_tx.length = 0;
    return;
  }
  if (s_tx.wait_for_flow || !reached(now, s_tx.next_us)) {
    return;
  }

  uint8_t frame[8] = {static_cast<uint8_t>(0x20U | s_tx.sequence)};
  const uint8_t count = min(static_cast<uint8_t>(7), static_cast<uint8_t>(s_tx.length - s_tx.offset));
  memcpy(frame + 1, s_tx.data + s_tx.offset, count);
  if (!send_frame(frame, count + 1U)) {
    return;
  }
  s_tx.offset += count;
  s_tx.sequence = (s_tx.sequence + 1U) & 0x0F;
  if (s_tx.offset == s_tx.length) {
    s_tx.length = 0;
    return;
  }
  s_tx.wait_for_flow = !s_tx.unlimited && --s_tx.block_left == 0;
  s_tx.next_us = now + s_tx.separation_us;
  s_tx.deadline_us = now + k_flow_timeout_us;
}

bool build_pid_payload(const ecu_snapshot_t &snap, uint8_t pid, uint8_t *data, uint8_t &len) {
  switch (pid) {
    case 0x00:
    case 0x20:
    case 0x40:
    {
      const uint32_t bits = build_bitmap(pid);
      data[0] = bits >> 24;
      data[1] = bits >> 16;
      data[2] = bits >> 8;
      data[3] = bits;
      len = 4;
      return true;
    }
    case 0x01: for (uint8_t i = 0; i < 4; ++i) { data[i] = snap.readiness_bytes[i]; } len = 4; return true;
    case 0x03: data[0] = snap.fuel_system_status_a; data[1] = snap.fuel_system_status_b; len = 2; return true;
    case 0x04: data[0] = encode_percent(snap.engine_load_pct); len = 1; return true;
    case 0x05: data[0] = encode_temp(snap.coolant_c); len = 1; return true;
    case 0x06: data[0] = encode_trim(snap.short_trim_bank1_pct); len = 1; return true;
    case 0x07: data[0] = encode_trim(snap.long_trim_bank1_pct); len = 1; return true;
    case 0x08: data[0] = encode_trim(snap.short_trim_bank2_pct); len = 1; return true;
    case 0x09: data[0] = encode_trim(snap.long_trim_bank2_pct); len = 1; return true;
    case 0x0A: data[0] = static_cast<uint8_t>(min(snap.fuel_pressure_kpa / 3U, 255U)); len = 1; return true;
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
    case 0x4D: {
      const uint16_t minutes = snap.time_with_mil_s / 60U;
      data[0] = minutes >> 8;
      data[1] = minutes;
      len = 2;
      return true;
    }
    case 0x4E: data[0] = static_cast<uint8_t>(snap.time_since_clear_min >> 8); data[1] = static_cast<uint8_t>(snap.time_since_clear_min); len = 2; return true;
    case 0x52: data[0] = encode_percent(snap.ethanol_pct); len = 1; return true;
    case 0x5C: data[0] = encode_temp(snap.oil_temp_c); len = 1; return true;
    case 0x5E: data[0] = static_cast<uint8_t>((snap.fuel_rate_centiliters_per_h / 5U) >> 8); data[1] = static_cast<uint8_t>(snap.fuel_rate_centiliters_per_h / 5U); len = 2; return true;
    default: return false;
  }
}

void send_current_data(uint8_t pid, uint32_t now) {
  uint8_t payload[6] = {0x41, pid};
  uint8_t length = 0;
  if (build_pid_payload(ecu_model_get(), pid, payload + 2, length)) {
    send_payload(payload, length + 2U, now);
  }
}

void send_freeze_frame(uint8_t pid, uint32_t now) {
  const ecu_snapshot_t *snapshot = ecu_model_get_freeze_frame();
  if (snapshot == nullptr) {
    return;
  }
  uint8_t payload[7] = {0x42, pid, 0};
  uint8_t length = 0;
  switch (pid) {
    case 0x00:
      // Supported freeze-frame PIDs: DTC, load, coolant temperature, RPM, speed.
      payload[3] = 0x58;
      payload[4] = 0x18;
      length = 4;
      break;
    case 0x02:
      payload[3] = snapshot->stored_dtc.codes[0] >> 8;
      payload[4] = snapshot->stored_dtc.codes[0];
      length = 2;
      break;
    case 0x04:
    case 0x05:
    case 0x0C:
    case 0x0D:
      (void)build_pid_payload(*snapshot, pid, payload + 3, length);
      break;
    default:
      return;
  }
  send_payload(payload, length + 3U, now);
}

void send_dtc(uint8_t mode, const obd_dtc_bucket_t &bucket, uint32_t now) {
  uint8_t payload[8] = {static_cast<uint8_t>(mode + 0x40), bucket.count};
  for (uint8_t i = 0; i < bucket.count; ++i) {
    payload[2U + i * 2U] = static_cast<uint8_t>(bucket.codes[i] >> 8);
    payload[3U + i * 2U] = static_cast<uint8_t>(bucket.codes[i]);
  }
  send_payload(payload, 2U + bucket.count * 2U, now);
}

void send_vehicle_info(uint8_t pid, uint32_t now) {
  if (pid == 0x00) {
    const uint8_t supported[] = {0x49, 0x00, 0x40, 0, 0, 0};
    send_payload(supported, sizeof(supported), now);
  } else if (pid == 0x02) {
    uint8_t payload[k_max_payload] = {0x49, 0x02, 0x01};
    memcpy_P(payload + 3, k_vin, sizeof(k_vin) - 1U);
    send_payload(payload, sizeof(payload), now);
  }
}

void handle_request(const can_frame &frame, uint32_t now) {
  if ((frame.can_id != k_functional_id && frame.can_id != k_request_id) ||
      frame.can_dlc < 2 || frame.can_dlc > 8) {
    return;
  }
  if (s_tx.length != 0) {
    if ((frame.data[0] & 0xF0) == 0x30) {
      handle_flow_control(frame, now);
    }
    return;
  }
  const uint8_t length = frame.data[0];
  if (length == 0 || length >= frame.can_dlc || length > 7) {
    return;
  }
  const uint8_t mode = frame.data[1];
  if (length == 2 && mode == 0x01) {
    send_current_data(frame.data[2], now);
  } else if (length == 3 && mode == 0x02 && frame.data[3] == 0) {
    send_freeze_frame(frame.data[2], now);
  } else if (length == 2 && mode == 0x09) {
    send_vehicle_info(frame.data[2], now);
  } else if (length == 1) {
    const ecu_snapshot_t &snapshot = ecu_model_get();
    switch (mode) {
      case 0x03: send_dtc(mode, snapshot.stored_dtc, now); break;
      case 0x04: {
        if (ecu_model_clear_diagnostics()) {
          const uint8_t response = 0x44;
          send_payload(&response, 1, now);
        }
        break;
      }
      case 0x07: send_dtc(mode, snapshot.pending_dtc, now); break;
      case 0x0A: send_dtc(mode, snapshot.permanent_dtc, now); break;
    }
  }
}
}  // namespace

void obd_can_begin(MCP2515 &can_controller) {
  s_can = &can_controller;
  s_tx = {};
}

void obd_can_poll() {
  if (s_can == nullptr) {
    return;
  }
  const uint32_t now = micros();
  if (ecu_model_is_ignition_on()) {
    advance_transfer(now);
  } else {
    s_tx.length = 0;
  }
  // Bound the work per loop while draining both MCP2515 receive buffers.
  for (uint8_t i = 0; i < 2; ++i) {
    can_frame frame = {};
    if (s_can->readMessage(&frame) != MCP2515::ERROR_OK) {
      break;
    }
    if (ecu_model_is_ignition_on()) {
      handle_request(frame, now);
    }
  }
}
