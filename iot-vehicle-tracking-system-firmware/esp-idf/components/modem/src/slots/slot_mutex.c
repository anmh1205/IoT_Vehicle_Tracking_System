#include "modem_slots.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

static SemaphoreHandle_t s_slot_mutex;

bool modem_slots_init(void)
{
    s_slot_mutex = xSemaphoreCreateMutex();
    return s_slot_mutex != NULL;
}

void modem_slots_lock(void) { (void)xSemaphoreTake(s_slot_mutex, portMAX_DELAY); }
void modem_slots_unlock(void) { (void)xSemaphoreGive(s_slot_mutex); }
