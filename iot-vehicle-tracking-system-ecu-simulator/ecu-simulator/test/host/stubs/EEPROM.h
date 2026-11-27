#pragma once
#include <stdint.h>
#include <string.h>

struct EepromDevice {
  uint8_t bytes[1024];
  EepromDevice() { memset(bytes, 0xFF, sizeof(bytes)); }

  void update(int address, uint8_t value) { bytes[address] = value; }
  template <typename T> void put(int address, const T &value) { memcpy(bytes + address, &value, sizeof(T)); }
  template <typename T> void get(int address, T &value) const { memcpy(&value, bytes + address, sizeof(T)); }
};
extern EepromDevice EEPROM;
