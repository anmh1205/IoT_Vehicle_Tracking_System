#pragma once
#include "at_engine.h"

/* Initialize the engine and its parser before the modem task starts. */
void modem_at_dispatch_init(void);
/* Modem task. Pump UART or run one synchronous AT command while servicing URCs. */
void modem_at_dispatch_pump(uint32_t wait_ms);
void modem_expect_raw(size_t len);
at_result_t modem_at(const at_cmd_t *command);
at_result_t modem_at_simple(const char *command, uint32_t timeout_ms);
const char *modem_at_response(void);
