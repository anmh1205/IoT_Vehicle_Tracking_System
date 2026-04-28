#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

/**
 * @file offline_queue.h
 * @brief Queue-first telemetry flow with FIFO replay and publish-result commit.
 */

typedef enum {
    /** High-rate raw telemetry, usually replayed with QoS 0. */
    OFFLINE_RECORD_RAWDATA = 0,
    /** Device status/heartbeat snapshot, treated as critical. */
    OFFLINE_RECORD_STATUS = 1,
    /** Alert/event payload, treated as critical. */
    OFFLINE_RECORD_EVENT = 2,
    /** OTA/firmware lifecycle payload, treated as critical. */
    OFFLINE_RECORD_FIRMWARE = 3,
} offline_record_type_t;

/** @brief Initialize offline replay state and the underlying SD log store. */
esp_err_t offline_queue_init(void);

/**
 * @brief Update the session ID stamped into newly queued records.
 *
 * @param session_id Current drive session ID.
 */
void offline_queue_set_session(uint32_t session_id);

/**
 * @brief Inform the queue whether network conditions currently allow replay.
 *
 * @param online true when the modem/network path is considered online.
 */
void offline_queue_set_online(bool online);

/**
 * @brief Persist one record into the offline queue.
 *
 * @param type Record class that selects MQTT topic + criticality.
 * @param payload JSON payload to persist.
 * @param gps_fix True when GNSS fix was valid at enqueue time.
 * @param net_up True when network was considered up at enqueue time.
 * @param time_trusted True when timestamp came from trusted wall-clock time.
 * @param timestamp_ms Event timestamp in milliseconds; `0` falls back to uptime.
 *
 * @return ESP_OK on success or when SD logging is disabled/unavailable, otherwise
 *         an error from the backing SD store.
 */
esp_err_t offline_queue_enqueue(offline_record_type_t type,
                                const char *payload,
                                bool gps_fix,
                                bool net_up,
                                bool time_trusted,
                                uint64_t timestamp_ms);

/**
 * @brief Execute one non-blocking replay step.
 *
 * This function advances publish retries and FIFO replay only when the queue
 * is initialized, online, mounted, and MQTT-connected.
 */
void offline_queue_replay_tick(void);

/**
 * @brief Indicate whether raw telemetry should slow down because SD usage is high.
 *
 * @return true when the store exceeds the configured soft quota threshold.
 */
bool offline_queue_should_throttle_rawdata(void);

/**
 * @brief Mark the current session closed in the backing SD metadata.
 *
 * @param clean_shutdown true when shutdown completed cleanly before sleep/reset.
 */
void offline_queue_stop_session(bool clean_shutdown);

/**
 * @brief Return the approximate number of queued records waiting for replay.
 *
 * @return Number of entries between `replay_seq` and `write_seq`, inclusive.
 */
uint32_t offline_queue_depth(void);
