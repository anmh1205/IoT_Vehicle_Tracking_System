#include <Arduino.h>
#include <SPI.h>
#include <mcp2515.h>

#include "ecu-model.h"
#include "obd-can.h"

namespace {
MCP2515 s_can_controller(10);
}

void setup() {
  Serial.begin(115200);
  ecu_model_begin();
  s_can_controller.reset();
  s_can_controller.setBitrate(CAN_500KBPS, MCP_8MHZ);
  s_can_controller.setNormalMode();
  obd_can_begin(s_can_controller);
  Serial.println(F("ECU simulator ready"));
}

void loop() {
  ecu_model_tick();
  obd_can_poll();
}
