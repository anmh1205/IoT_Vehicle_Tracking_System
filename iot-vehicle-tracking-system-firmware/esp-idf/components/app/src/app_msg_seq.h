#pragma once
#include <stdint.h>

/* Allocate and inspect message sequence numbers in the app task. */
uint32_t app_msg_seq_next(void);
uint32_t app_msg_seq_current(void);
/* Restore the sequence when loading or saving a deep-sleep RTC context. */
void app_msg_seq_restore(uint32_t seq);
