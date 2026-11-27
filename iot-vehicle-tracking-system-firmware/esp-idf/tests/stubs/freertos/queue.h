#pragma once

typedef void *QueueHandle_t;

#define pdTRUE 1
int xQueueSend(QueueHandle_t queue, const void *item, unsigned ticks);
