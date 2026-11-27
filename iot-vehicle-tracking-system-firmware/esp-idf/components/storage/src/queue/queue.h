#pragma once
#include "esp_err.h"
#include "storage/offline_queue.h"

/* Initialization runs before the storage task. Queue writers run only on that task. */
void storage_queue_slot_init(void);
esp_err_t storage_queue_open(void);
ivts_err_t storage_queue_do_push(const uint8_t *record, size_t len);
ivts_err_t storage_queue_do_peek(void);
ivts_err_t storage_queue_do_pop(uint32_t token);
