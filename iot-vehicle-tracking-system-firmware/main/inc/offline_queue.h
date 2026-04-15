#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

/**
 * @file offline_queue.h
 * @brief Queue-first telemetry flow with FIFO replay and ACK pointer semantics.
 */

typedef enum {
    OFFLINE_RECORD_RAWDATA = 0,
    OFFLINE_RECORD_STATUS = 1,
    OFFLINE_RECORD_EVENT = 2,
    OFFLINE_RECORD_FIRMWARE = 3,
} offline_record_type_t;

esp_err_t offline_queue_init(void);
void offline_queue_set_session(uint32_t session_id);
void offline_queue_set_online(bool online);
esp_err_t offline_queue_enqueue(offline_record_type_t type,
                                const char *payload,
                                bool gps_fix,
                                bool net_up,
                                bool time_trusted,
                                uint64_t timestamp_ms);
void offline_queue_replay_tick(void);
void offline_queue_handle_publish_ack(int msg_id);
bool offline_queue_should_throttle_rawdata(void);
void offline_queue_stop_session(bool clean_shutdown);
uint32_t offline_queue_depth(void);
