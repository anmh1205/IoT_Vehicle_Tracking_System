#pragma once
#include <stdbool.h>

/* Load the receipt window before starting the app task. */
void cmd_receipts_init(void);
/* App task. Reload after an NVS error and query the durable receipt window. */
bool cmd_receipts_ready(void);
bool cmd_receipts_contains(const char *id);
/* App task. Add a completed command and persist it before publishing an ACK. */
void cmd_receipts_append(const char *id);
bool cmd_receipts_needs_checkpoint(void);
bool cmd_receipts_flush(void);
