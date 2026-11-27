#pragma once
#include <stdbool.h>

/* Initialize command state and load the durable receipt window before starting the app task. */
void app_cmd_init(void);
/* App task. Take one command, then service location, reboot and ACK deadlines. */
void app_cmd_handle(void);
void app_cmd_tick(void);
bool app_cmd_pending(void);
bool app_cmd_blocks_sleep(void);
bool app_cmd_needs_gnss(void);

/* App task callbacks registered with the publisher at boot. */
void app_cmd_on_ack(bool ok);
void app_cmd_on_location_ack(bool ok);
