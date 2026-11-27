/**
 * @file platform_rtos.c
 * @brief Task-context delays and mutex operations backed by FreeRTOS.
 *
 * The implementation keeps scheduler types out of device adapters. Calls honor
 * the native tick conversion and the existing unbounded mutex wait semantics.
 */
#include "platform/platform.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"

uint32_t platform_timeout_ticks(uint32_t ms)
{
    return pdMS_TO_TICKS(ms);
}

void platform_delay_ms(uint32_t ms)
{
    vTaskDelay(pdMS_TO_TICKS(ms));
}

platform_mutex_t platform_mutex_create(void)
{
    return (platform_mutex_t)xSemaphoreCreateMutex();
}

void platform_mutex_lock(platform_mutex_t mutex)
{
    (void)xSemaphoreTake((SemaphoreHandle_t)mutex, portMAX_DELAY);
}

bool platform_mutex_lock_for(platform_mutex_t mutex, uint32_t timeout_ms)
{
    return xSemaphoreTake((SemaphoreHandle_t)mutex, pdMS_TO_TICKS(timeout_ms)) == pdTRUE;
}

void platform_mutex_unlock(platform_mutex_t mutex)
{
    (void)xSemaphoreGive((SemaphoreHandle_t)mutex);
}
