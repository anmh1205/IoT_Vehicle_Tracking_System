#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "esp_err.h"

/**
 * @file sd_log_store.h
 * @brief Durable SD append-only store and replay primitives.
 * This header belongs to the SDMMC FATFS storage adapter layer and exposes the storage boundary so higher layers do not depend on SD card or FATFS-private details.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


#define SD_LOG_RECORD_PAYLOAD_MAX_LEN 2048U

typedef struct {
    /** Monotonic queue sequence assigned at append time. */
    uint32_t seq;
    /** Event timestamp in milliseconds. */
    uint64_t ts_ms;
    /** Drive/session ID that produced this record. */
    uint32_t session_id;
    /** `offline_record_type_t` serialized as a byte. */
    uint8_t type;
    /** `1` for QoS1-like critical records, `0` for lossy/raw records. */
    uint8_t critical;
    /** GNSS fix flag captured when the record was created. */
    uint8_t gps_fix;
    /** Network-up flag captured when the record was created. */
    uint8_t net_up;
    /** Indicates whether `ts_ms` came from trusted wall-clock time. */
    uint8_t time_trusted;
    /** JSON payload body stored on disk. */
    char payload[SD_LOG_RECORD_PAYLOAD_MAX_LEN];
} sd_log_record_t;

typedef struct {
    /** Highest sequence that has been durably appended. */
    uint32_t write_seq;
    /** Highest critical sequence confirmed safe to drop/replay-skip. */
    uint32_t ack_seq_critical;
    /** Next sequence that replay should look for. */
    uint32_t replay_seq;
    /** Current session ID persisted for continuity after reboot/remount. */
    uint32_t session_id;
    /** Non-zero when the previous shutdown path completed cleanly. */
    uint8_t clean_shutdown;
} sd_log_meta_t;

typedef struct {
    /** Current size of `queue.log` in bytes. */
    size_t bytes_used;
    /** Configured SD quota for the queue file. */
    size_t quota_bytes;
    /** Latest appended sequence. */
    uint32_t write_seq;
    /** Latest acknowledged critical sequence. */
    uint32_t ack_seq_critical;
    /** `true` when the SD store is currently mounted and available. */
    bool mounted;
} sd_log_stats_t;

/** @brief Initialize internal SD store state. */
esp_err_t sd_log_store_init(void);

/**
 * @brief Mount the SD card and recover queue metadata/log files if needed.
 *
 * @return ESP_OK on success, or an SD/VFS error when mount/recovery fails.
 */
esp_err_t sd_log_store_mount(void);

/** @brief Unmount the SD store and clear mount-dependent cache state. */
void sd_log_store_unmount(void);

/**
 * @brief Check whether the SD-backed queue is mounted and card-present.
 *
 * @return true when the store is ready for I/O.
 */
bool sd_log_store_is_mounted(void);

/**
 * @brief Persist the session ID currently producing records.
 *
 * @param session_id Session identifier to store in metadata.
 *
 * @return ESP_OK on success, otherwise an SD metadata write error.
 */
esp_err_t sd_log_store_start_session(uint32_t session_id);

/**
 * @brief Persist clean/unclean session shutdown status.
 *
 * @param clean_shutdown true when the session ended normally.
 *
 * @return ESP_OK on success, otherwise an SD metadata write error.
 */
esp_err_t sd_log_store_stop_session(bool clean_shutdown);

/**
 * @brief Append one record to the queue log and update metadata.
 *
 * @param record Fully populated record to persist.
 *
 * @return ESP_OK on success, otherwise an SD write/fsync/metadata error.
 */
esp_err_t sd_log_store_append(const sd_log_record_t *record);

/**
 * @brief Read the latest in-memory metadata snapshot.
 *
 * @param out_meta Destination structure.
 *
 * @return ESP_OK on success or ESP_ERR_INVALID_ARG on null output.
 */
esp_err_t sd_log_store_get_meta(sd_log_meta_t *out_meta);

/**
 * @brief Advance the highest critical sequence known to be safely acknowledged.
 *
 * @param ack_seq_critical New ACK watermark.
 *
 * @return ESP_OK on success, otherwise an SD metadata write error.
 */
esp_err_t sd_log_store_set_ack_seq_critical(uint32_t ack_seq_critical);

/**
 * @brief Advance the replay pointer without changing the critical ACK watermark.
 *
 * @param replay_seq Next sequence replay should start from.
 *
 * @return ESP_OK on success, otherwise an SD metadata write error.
 */
esp_err_t sd_log_store_set_replay_seq(uint32_t replay_seq);

/**
 * @brief Atomically update both critical ACK and replay pointers.
 *
 * @param ack_seq_critical New critical ACK watermark.
 * @param replay_seq Next sequence replay should start from.
 *
 * @return ESP_OK on success, otherwise an SD metadata write error.
 */
esp_err_t sd_log_store_ack_critical_and_advance_replay(uint32_t ack_seq_critical, uint32_t replay_seq);

/**
 * @brief Read the next queued record whose sequence is at least `min_seq`.
 *
 * @param min_seq Lowest acceptable sequence number.
 * @param out_record Destination record.
 *
 * @return ESP_OK when a record is found, ESP_ERR_NOT_FOUND at EOF, or another
 *         error for invalid state/arguments.
 */
esp_err_t sd_log_store_peek_next(uint32_t min_seq, sd_log_record_t *out_record);

/**
 * @brief Perform quota-based log compaction when the queue grows too large.
 *
 * @return ESP_OK on success or when GC is unnecessary, otherwise an SD I/O error.
 */
esp_err_t sd_log_store_gc_if_needed(void);

/**
 * @brief Return high-level storage usage and replay watermarks.
 *
 * @param out_stats Destination statistics structure.
 *
 * @return ESP_OK on success or ESP_ERR_INVALID_ARG on null output.
 */
esp_err_t sd_log_store_get_stats(sd_log_stats_t *out_stats);
