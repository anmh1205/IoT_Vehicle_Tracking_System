#pragma once

#include <stddef.h>
#include <stdint.h>

#include "esp_err.h"

typedef void (*modem_urc_cb_t)(const char *urc_line);

esp_err_t modem_at_init(void);
void modem_at_deinit(void);
esp_err_t modem_at_send(const char *cmd, char *response, size_t resp_len, uint32_t timeout_ms);
esp_err_t modem_at_send_expect(const char *cmd, const char *expect, uint32_t timeout_ms);
void modem_at_register_urc(const char *prefix, modem_urc_cb_t cb);
