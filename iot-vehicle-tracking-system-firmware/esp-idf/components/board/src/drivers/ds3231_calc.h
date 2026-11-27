#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

#define DS3231_OSF 0x80u

ivts_err_t ds3231_decode_time(const uint8_t registers[7], uint64_t *unix_ms);
ivts_err_t ds3231_encode_time(uint64_t unix_ms, uint8_t registers[7]);
bool ds3231_is_trusted(uint8_t status, uint64_t unix_ms);
