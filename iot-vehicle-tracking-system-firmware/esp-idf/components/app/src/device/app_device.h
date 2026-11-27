#pragma once
#include <stdbool.h>
#include "ivts_core/model/config.h"

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
