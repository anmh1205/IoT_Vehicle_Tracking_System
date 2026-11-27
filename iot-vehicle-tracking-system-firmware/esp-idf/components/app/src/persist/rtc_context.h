#pragma once
#include <stdbool.h>
#include <stdint.h>

/* Restore boot identity from a validated RTC context after deep-sleep reset. */
bool app_rtc_ctx_load(uint32_t *boot_id, uint32_t *seq);
/* Save boot identity and sequence immediately before sleep. */
void app_rtc_ctx_save(uint32_t boot_id, uint32_t seq, uint8_t last_state);
