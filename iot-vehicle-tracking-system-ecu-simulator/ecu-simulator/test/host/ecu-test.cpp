#include <assert.h>
#include <initializer_list>
#include "EEPROM.h"
#include "ecu-model.h"
#include "obd-can.h"

SerialPort Serial;
EepromDevice EEPROM;
static uint32_t now_ms;

uint32_t millis() { return now_ms; }
uint32_t micros() { return now_ms * 1000U; }

static void request(MCP2515 &can, uint32_t id, std::initializer_list<uint8_t> bytes) {
  can_frame frame = {};
  frame.can_id = id;
  frame.can_dlc = bytes.size();
  memcpy(frame.data, bytes.begin(), bytes.size());
  can.rx.push_back(frame);
  obd_can_poll();
}

static can_frame response(MCP2515 &can, uint8_t first_payload) {
  assert(can.tx.size() == 1);
  can_frame frame = can.tx.front();
  can.tx.pop_front();
  assert(frame.can_id == 0x7E8);
  assert(frame.can_dlc == 8);
  assert(frame.data[1] == first_payload);
  return frame;
}

static void advance(uint32_t duration_ms) {
  for (uint32_t ms = 0; ms < duration_ms; ms += 20) {
    now_ms += 20;
    ecu_model_tick();
  }
}

static void test_transport(MCP2515 &can) {
  request(can, 0x012, {2, 0x01, 0x0C});
  request(can, 0x7E1, {2, 0x01, 0x0C});
  request(can, 0x800007E0, {2, 0x01, 0x0C});
  request(can, 0x7E0, {3, 0x01, 0x0C});
  request(can, 0x7E0, {0x10, 0x01, 0x0C});
  request(can, 0x7E0, {2, 0x01, 0x60});
  assert(can.tx.empty());
  request(can, 0x7DF, {2, 0x01, 0x40});
  assert((response(can, 0x41).data[6] & 1U) == 0);
  request(can, 0x7E0, {2, 0x01, 0x0C});
  const can_frame rpm = response(can, 0x41);
  assert(rpm.data[0] == 4 && rpm.data[2] == 0x0C);
  request(can, 0x7E0, {1, 0x03});
  assert(response(can, 0x43).data[2] == 0);

  request(can, 0x7DF, {2, 0x09, 0x02});
  const can_frame first = response(can, 0x14);
  assert(first.data[0] == 0x10 && first.data[2] == 0x49 && first.data[3] == 2);
  request(can, 0x7DF, {0x30, 0, 0});
  obd_can_poll();
  assert(can.tx.empty());
  request(can, 0x7E0, {0x30, 1, 10});
  now_ms += 5;
  obd_can_poll();
  assert(can.tx.empty());
  now_ms += 5;
  can.send_blocked = true;
  obd_can_poll();
  assert(can.tx.empty());
  can.send_blocked = false;
  obd_can_poll();
  const can_frame second = response(can, 'A');
  assert(second.data[0] == 0x21);
  advance(20);
  obd_can_poll();
  assert(can.tx.empty());
  request(can, 0x7E0, {0x30, 0, 0});
  obd_can_poll();
  const can_frame third = response(can, '0');
  assert(third.data[0] == 0x22);
  char vin[18] = {};
  memcpy(vin, first.data + 5, 3);
  memcpy(vin + 3, second.data + 1, 7);
  memcpy(vin + 10, third.data + 1, 7);
  assert(strcmp(vin, "TSTATS116N0000001") == 0);

  request(can, 0x7DF, {2, 0x09, 0x02});
  response(can, 0x14);
  advance(1020);
  request(can, 0x7E0, {0x30, 0, 0});
  assert(can.tx.empty());
}

static void test_drive_and_diagnostics(MCP2515 &can) {
  ecu_model_force_ignition(false);
  advance(220);
  request(can, 0x7E0, {2, 0x01, 0x0C});
  assert(can.tx.empty());
  ecu_model_force_ignition(true);
  advance(1000);
  assert(!ecu_model_get().engine_running && ecu_model_get().rpm == 0);
  advance(650);
  assert(!ecu_model_get().engine_running);
  assert(ecu_model_get().rpm > 0 && ecu_model_get().rpm < 350);
  assert(ecu_model_get().control_module_mv < 11000);
  advance(1100);
  assert(ecu_model_get().engine_running && ecu_model_get().control_module_mv > 13000);
  assert(ecu_model_get().fuel_system_status_a == 1);
  advance(100000);
  assert(ecu_model_get().pending_dtc.count == 1);
  assert(ecu_model_get().stored_dtc.count == 0);
  ecu_model_force_ignition(false);
  advance(200);

  ecu_model_begin();  // Simulate MCU reset with the same EEPROM content.
  assert(ecu_model_get().pending_dtc.count == 1);
  advance(102000);
  assert(ecu_model_get().mil_on && ecu_model_get().stored_dtc.codes[0] == 0x0171);
  assert(ecu_model_get().permanent_dtc.count == 1);
  request(can, 0x7E0, {1, 0x03});
  const can_frame dtc = response(can, 0x43);
  assert(dtc.data[0] == 4 && dtc.data[2] == 1 && dtc.data[3] == 1 && dtc.data[4] == 0x71);
  request(can, 0x7E0, {3, 0x02, 0x02, 0});
  const can_frame freeze = response(can, 0x42);
  assert(freeze.data[2] == 2 && freeze.data[3] == 0 && freeze.data[5] == 0x71);
  request(can, 0x7E0, {1, 0x04});
  assert(can.tx.empty());

  ecu_model_force_ignition(false);
  advance(8000);
  ecu_model_force_ignition(true);
  advance(100);
  request(can, 0x7E0, {1, 0x04});
  response(can, 0x44);
  assert(!ecu_model_get().mil_on && ecu_model_get().stored_dtc.count == 0);
  assert(ecu_model_get().permanent_dtc.count == 1);
  assert(ecu_model_get_freeze_frame() == nullptr);
  ecu_model_begin();
  assert(ecu_model_get().permanent_dtc.count == 1);
  assert(ecu_model_get().stored_dtc.count == 0);
}

int main() {
  MCP2515 can;
  ecu_model_begin();
  obd_can_begin(can);
  test_transport(can);
  test_drive_and_diagnostics(can);
  now_ms = UINT32_MAX - 1000U;
  ecu_model_force_ignition(false);
  ecu_model_force_ignition_for(true, 2);
  advance(1200);
  assert(ecu_model_is_ignition_on() && ecu_model_ignition_timer_remaining_s() == 1);
  advance(1000);
  assert(!ecu_model_is_ignition_on());
}
