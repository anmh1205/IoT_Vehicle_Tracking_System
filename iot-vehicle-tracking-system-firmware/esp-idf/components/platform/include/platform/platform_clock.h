#pragma once
#include <stdint.h>

/** Return monotonic milliseconds since boot. Safe to call from any firmware task. */
uint64_t platform_uptime_ms(void);
