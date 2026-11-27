#pragma once

typedef void *QueueHandle_t;

#define pdTRUE 1
int xQueueSend(QueueHandle_t queue, const void *item, unsigned ticks);
QueueHandle_t xQueueCreate(unsigned length, unsigned item_size);
int xQueueReceive(QueueHandle_t queue, void *item, unsigned ticks);
