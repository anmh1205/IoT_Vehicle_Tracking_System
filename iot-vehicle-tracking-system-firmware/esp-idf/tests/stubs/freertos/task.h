#pragma once

int xTaskCreate(void (*task)(void *), const char *name, unsigned stack,
                void *arg, unsigned prio, void *handle);
void vTaskDelay(unsigned ticks);
