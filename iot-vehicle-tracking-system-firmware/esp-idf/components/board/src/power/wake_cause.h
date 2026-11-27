#pragma once
#include "board/board_power.h"

/* Capture the boot wake source before initializing any drivers. */
void board_power_capture_wake(void);
/* Read the reason for the most recent wake, including light sleep. */
board_wake_t board_power_read_wake_cause(void);
