#pragma once
#include <stdbool.h>
#include "ivts_core/model/config.h"
#include "ivts_core/event/event.h"
#include <stdint.h>

/* The boot code initializes device data; the app task owns it once running. */
const ivts_config_t *app_device_config(void);
void app_device_set_config(const ivts_config_t *config);
void app_device_bind_config_handler(void (*handler)(const ivts_config_t *config));
uint32_t app_device_boot_id(void);
void app_device_set_boot_id(uint32_t boot_id);
bool app_device_is_provisioned(void);
void app_device_set_provisioned(bool provisioned);
bool app_device_tracking_enabled(void);
void app_device_set_tracking_enabled(bool enabled);

/* App task. Record the latest link state, returning true on transition. */
bool app_link_update(ivts_link_t link);
bool app_link_is_broker_up(void);

/* App task. Reconcile the FSM and command requests with the modem's GNSS state. */
void app_gnss_arbiter_apply(uint32_t actions, bool command_requests_gnss);
