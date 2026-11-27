#pragma once
#include <stdbool.h>
#include <stdint.h>

/** Read monotonic milliseconds since boot. */
uint64_t app_now(void);

/** Read the board RTC, returning zero when untrusted. May wait for the I2C bus. */
uint64_t app_clock_unix_ms_or_zero(bool *trusted_out);
