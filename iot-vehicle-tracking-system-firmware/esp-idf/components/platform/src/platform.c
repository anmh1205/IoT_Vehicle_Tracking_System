/**
 * @file src/platform.c
 * @brief Monotonic time, restart and ESP-IDF result translation.
 *
 * Firmware tasks and adapters use boot-relative time for deadlines and events.
 * App startup and runtime use the restart wrapper after making their own restart decision.
 * Adapters translate SDK results here. The wrappers keep no mutable state.
 */
#include "platform/platform.h"
#include "platform/log.h"
#include "esp_system.h"
#include "esp_timer.h"

uint64_t platform_uptime_ms(void)
{
    return (uint64_t)esp_timer_get_time() / 1000u;
}

void platform_restart(const char *reason)
{
    IVTS_LOGW("sys", "restart reason=%s", reason);
    esp_restart();
}

ivts_err_t platform_err_from_esp(esp_err_t error)
{
    switch (error) {
    case ESP_OK:                return IVTS_OK;
    case ESP_ERR_INVALID_ARG:   return IVTS_ERR_INVALID_ARG;
    case ESP_ERR_INVALID_STATE: return IVTS_ERR_INVALID_STATE;
    case ESP_ERR_TIMEOUT:       return IVTS_ERR_TIMEOUT;
    case ESP_ERR_NOT_FOUND:     return IVTS_ERR_NOT_FOUND;
    case ESP_ERR_NO_MEM:        return IVTS_ERR_FULL;
    default:                    return IVTS_ERR_IO;
    }
}
