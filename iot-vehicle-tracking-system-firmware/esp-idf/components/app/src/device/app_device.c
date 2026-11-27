#include "device/device.h"
#include <stddef.h>

static ivts_config_t s_config;
static uint32_t s_boot_id;
static bool s_is_provisioned;
static bool s_is_tracking_enabled;
static void (*s_config_handler)(const ivts_config_t *);

const ivts_config_t *app_device_config(void) { return &s_config; }

void app_device_set_config(const ivts_config_t *config)
{
    s_config = *config;
    if (s_config_handler != NULL) { s_config_handler(&s_config); }
}

void app_device_bind_config_handler(void (*handler)(const ivts_config_t *config))
{
    s_config_handler = handler;
}

uint32_t app_device_boot_id(void) { return s_boot_id; }
void app_device_set_boot_id(uint32_t boot_id) { s_boot_id = boot_id; }
bool app_device_is_provisioned(void) { return s_is_provisioned; }
void app_device_set_provisioned(bool provisioned) { s_is_provisioned = provisioned; }
bool app_device_tracking_enabled(void) { return s_is_tracking_enabled; }
void app_device_set_tracking_enabled(bool enabled) { s_is_tracking_enabled = enabled; }
