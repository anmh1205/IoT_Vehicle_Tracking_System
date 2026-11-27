#pragma once
#include <stdbool.h>

/* Modem task. Reconcile requested GNSS power and publish fixes when due. */
void modem_gnss_init(void);
void modem_gnss_request(bool enabled);
void modem_gnss_reset_power(void);
void modem_gnss_step(void);
