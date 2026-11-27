#pragma once
#include "modem_task.h"

/** @brief Execute an HTTP operation on the modem task and return its result. */
ivts_err_t modem_http_handle(const modem_req_t *request);
bool modem_http_on_line(const char *line);
bool modem_http_route_raw(const uint8_t *data, size_t len, bool is_last);
void modem_http_discard_raw(void);
