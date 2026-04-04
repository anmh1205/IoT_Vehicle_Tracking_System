#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "esp_err.h"

/**
 * @file sd_log_store.h
 * @brief Durable SD append-only store and replay primitives.
 */

typedef struct {
    uint32_t seq;
    uint64_t ts_ms;
    uint32_t session_id;
    uint8_t type;
    uint8_t critical;
    uint8_t gps_fix;
    uint8_t net_up;
    char payload[384];
} sd_log_record_t;

typedef struct {
    uint32_t write_seq;
    uint32_t ack_seq_critical;
    uint32_t replay_seq;
    uint32_t session_id;
    uint8_t clean_shutdown;
} sd_log_meta_t;

typedef struct {
    size_t bytes_used;
    size_t quota_bytes;
    uint32_t write_seq;
    uint32_t ack_seq_critical;
    bool mounted;
} sd_log_stats_t;

esp_err_t sd_log_store_init(void);
esp_err_t sd_log_store_mount(void);
void sd_log_store_unmount(void);
bool sd_log_store_is_mounted(void);
esp_err_t sd_log_store_start_session(uint32_t session_id);
esp_err_t sd_log_store_stop_session(bool clean_shutdown);
esp_err_t sd_log_store_append(const sd_log_record_t *record);
esp_err_t sd_log_store_get_meta(sd_log_meta_t *out_meta);
esp_err_t sd_log_store_set_ack_seq_critical(uint32_t ack_seq_critical);
esp_err_t sd_log_store_set_replay_seq(uint32_t replay_seq);
esp_err_t sd_log_store_peek_next(uint32_t min_seq, sd_log_record_t *out_record);
esp_err_t sd_log_store_gc_if_needed(void);
esp_err_t sd_log_store_get_stats(sd_log_stats_t *out_stats);
