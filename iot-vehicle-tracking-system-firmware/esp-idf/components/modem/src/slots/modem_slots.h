#pragma once
#include "modem/modem.h"

/* One mutex protects publication and command FIFO copies. */
bool modem_slots_init(void);
void modem_slots_lock(void);
void modem_slots_unlock(void);

/* Modem task takes the publish slot and releases it after broker confirmation or an error. */
bool modem_tx_take(modem_topic_t *topic, const char **payload, size_t *len, uint32_t *tx_id);
void modem_tx_done(bool ok, int16_t error);

/* Modem task. Store a validated command then signal the app queue. */
void modem_cmd_store(const char *payload, size_t len);
