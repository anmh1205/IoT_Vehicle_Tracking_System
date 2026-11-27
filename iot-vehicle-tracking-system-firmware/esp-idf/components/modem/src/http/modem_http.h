#pragma once
#include "modem_task.h"

/* Modem task. Complete an RPC and give the waiting caller's semaphore. */
void modem_http_handle(const modem_req_t *request);
bool modem_http_on_line(const char *line);
bool modem_http_route_raw(const uint8_t *data, size_t len, bool is_last);
void modem_http_discard_raw(void);
