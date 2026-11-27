#include "platform/platform_reset.h"
#include "esp_log.h"
#include "esp_system.h"

void platform_restart(const char *reason)
{
    ESP_LOGI("platform", "restart: %s", reason);
    esp_restart();
}
