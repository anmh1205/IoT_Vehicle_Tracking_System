#pragma once

#include <assert.h>
#include <stdint.h>
#include "esp_err.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"

typedef int BaseType_t;
int xQueuePeek(QueueHandle_t queue, void *item, unsigned ticks);
SemaphoreHandle_t xSemaphoreCreateBinary(void);
void vSemaphoreDelete(SemaphoreHandle_t semaphore);

#define ESP_RETURN_ON_FALSE(condition, error, tag, ...) \
    do { (void)(tag); if (!(condition)) { return (error); } } while (0)
#define ESP_RETURN_ON_ERROR(expression, tag, ...) \
    do { (void)(tag); esp_err_t result = (expression); if (result != ESP_OK) { return result; } } while (0)

#define GPIO_MODE_OUTPUT 1
typedef struct {
    uint64_t pin_bit_mask;
    int mode;
} gpio_config_t;
esp_err_t gpio_config(const gpio_config_t *config);
esp_err_t gpio_set_level(int pin, int level);

#define ESP_PM_NO_LIGHT_SLEEP 1
typedef bool *esp_pm_lock_handle_t;
esp_err_t esp_pm_lock_create(int type, int arg, const char *name, esp_pm_lock_handle_t *lock);
esp_err_t esp_pm_lock_acquire(esp_pm_lock_handle_t lock);
esp_err_t esp_pm_lock_release(esp_pm_lock_handle_t lock);
