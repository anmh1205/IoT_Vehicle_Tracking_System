#include <Arduino.h>
#include <errno.h>
#include <SPI.h>
#include <mcp2515.h>

#include "ecu-model.h"
#include "obd-can.h"

namespace {
MCP2515 s_can_controller(10);
char s_command_buffer[32] = {0};
uint8_t s_command_length = 0;
bool s_command_overflow = false;
bool s_can_ready = false;
uint32_t s_last_can_init = 0;
#ifndef IVTS_MCP2515_CLOCK
#define IVTS_MCP2515_CLOCK MCP_8MHZ
#endif

void init_can() {
  s_last_can_init = millis();
  s_can_ready = s_can_controller.reset() == MCP2515::ERROR_OK &&
                s_can_controller.setBitrate(CAN_500KBPS, IVTS_MCP2515_CLOCK) == MCP2515::ERROR_OK &&
                s_can_controller.setNormalMode() == MCP2515::ERROR_OK;
  if (s_can_ready) {
    obd_can_begin(s_can_controller);
    Serial.println(F("ECU CAN ready"));
  } else {
    Serial.println(F("MCP2515 initialization failed"));
  }
}

bool parse_duration_s(const char *command, const char *prefix, uint32_t *duration_s) {
  if (command == nullptr || prefix == nullptr || duration_s == nullptr) {
    return false;
  }

  const size_t prefix_len = strlen(prefix);
  if (strncmp(command, prefix, prefix_len) != 0) {
    return false;
  }

  char *end_ptr = nullptr;
  if (command[prefix_len] < '0' || command[prefix_len] > '9') {
    return false;
  }
  errno = 0;
  unsigned long parsed = strtoul(command + prefix_len, &end_ptr, 10);
  if (end_ptr == command + prefix_len || *end_ptr != '\0') {
    return false;
  }

  *duration_s = static_cast<uint32_t>(parsed);
  return true;
}

void handle_serial_command(const char *command) {
  if (command == nullptr || command[0] == '\0') {
    return;
  }

  uint32_t duration_s = 0;
  if (parse_duration_s(command, "ign off ", &duration_s)) {
    ecu_model_force_ignition_for(false, duration_s);
    return;
  }

  if (parse_duration_s(command, "ign on ", &duration_s)) {
    ecu_model_force_ignition_for(true, duration_s);
    return;
  }

  if (strcmp(command, "ign off") == 0) {
    ecu_model_force_ignition(false);
    return;
  }

  if (strcmp(command, "ign on") == 0) {
    ecu_model_force_ignition(true);
    return;
  }

  if (strcmp(command, "ign status") == 0) {
    Serial.print(F("IGN STATUS "));
    Serial.print(ecu_model_is_ignition_on() ? F("ON") : F("OFF"));
    if (ecu_model_has_ignition_timer()) {
      Serial.print(F(" timer="));
      Serial.print(ecu_model_ignition_timer_remaining_s());
      Serial.print(F("s next="));
      Serial.print(ecu_model_is_ignition_on() ? F("OFF") : F("ON"));
    }
    Serial.println();
    return;
  }

  if (strcmp(command, "fault on") == 0 || strcmp(command, "fault off") == 0) {
    ecu_model_set_fault_enabled(strcmp(command, "fault on") == 0);
    Serial.println(F("OK"));
    return;
  }
  if (strncmp(command, "fault ", 6) == 0) {
    const char *profile = command + 6;
    uint8_t index = 255;
    if (strcmp(profile, "lean") == 0) {
      index = 0;
    } else if (strcmp(profile, "misfire") == 0) {
      index = 1;
    } else if (strcmp(profile, "catalyst") == 0) {
      index = 2;
    }
    Serial.println(ecu_model_set_fault_profile(index) ? F("OK") : F("Invalid profile or retained DTC"));
    return;
  }

  Serial.print(F("Unknown command: "));
  Serial.println(command);
}

void poll_serial_commands() {
  while (Serial.available() > 0) {
    char ch = static_cast<char>(Serial.read());
    if (ch == '\r' || ch == '\n') {
      s_command_buffer[s_command_length] = '\0';
      if (s_command_overflow) {
        Serial.println(F("Command too long"));
      } else {
        handle_serial_command(s_command_buffer);
      }
      s_command_overflow = false;
      s_command_length = 0;
      s_command_buffer[0] = '\0';
      continue;
    }

    if (ch < 32 || ch > 126) {
      continue;
    }

    if (ch >= 'A' && ch <= 'Z') {
      ch = static_cast<char>(ch - 'A' + 'a');
    }

    if (s_command_length + 1U < sizeof(s_command_buffer)) {
      s_command_buffer[s_command_length++] = ch;
      s_command_buffer[s_command_length] = '\0';
    }
  }
}
}

void setup() {
  Serial.begin(115200);
  ecu_model_begin();
  init_can();
}

void loop() {
  poll_serial_commands();
  ecu_model_tick();
  if (s_can_ready) {
    obd_can_poll();
  } else if (millis() - s_last_can_init >= 1000UL) {
    init_can();
  }
}
