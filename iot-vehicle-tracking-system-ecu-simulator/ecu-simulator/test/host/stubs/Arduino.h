#pragma once
#include <stddef.h>
#include <stdint.h>
#include <string.h>

#define F(text) text
template <typename A, typename B> auto min(A a, B b) -> decltype(a < b ? a : b) { return a < b ? a : b; }
template <typename A, typename B> auto max(A a, B b) -> decltype(a > b ? a : b) { return a > b ? a : b; }
#define constrain(x, low, high) ((x) < (low) ? (low) : ((x) > (high) ? (high) : (x)))

uint32_t millis();
uint32_t micros();

struct SerialPort {
  template <typename T> void println(T) {}
};
extern SerialPort Serial;
