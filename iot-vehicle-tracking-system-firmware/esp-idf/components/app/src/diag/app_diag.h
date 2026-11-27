#pragma once
#include <stdint.h>

/* App task. Sample stack and heap usage when diagnostics are enabled. */
void app_diag_tick(uint64_t now_ms);
