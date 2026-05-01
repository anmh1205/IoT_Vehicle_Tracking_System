#include "offline_queue.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "esp_log.h"
#include "sdkconfig.h"

#include "mqtt_client.h"
#include "retry_manager.h"
#include "sd_log_store.h"
#include "telemetry_counters.h"
#include "util.h"

/**
 * @file offline_queue.c
 * @brief SD-backed offline queue with FIFO replay and publish-result commit.
 */

static const char *TAG = "OFFLINE_QUEUE";
/* Retry delayed SD mounts instead of probing every enqueue/replay tick. */
#define OFFLINE_QUEUE_SD_MOUNT_RETRY_MS 30000ULL
/* Keep replay traffic from monopolizing the MQTT link during recovery. */
#define OFFLINE_QUEUE_REPLAY_MIN_PUBLISH_INTERVAL_MS 600ULL

typedef struct {
    /** `true` once `offline_queue_init` completed successfully. */
    bool initialized;
    /** Caller-provided link state gate for replay. */
    bool online;
    /** Session ID stamped into new queue records. */
    uint32_t session_id;
    /** Next sequence number assigned on append. */
    uint32_t next_seq;
    /** Last time replay actually published a record. */
    uint64_t last_replay_publish_ms;
    /** Backoff state for replay publish failures. */
    retry_state_t replay_retry;
    /** Backoff state for remount attempts after SD failure/removal. */
    retry_state_t sd_mount_retry;
} offline_queue_ctx_t;

static offline_queue_ctx_t s_ctx;

#if CONFIG_TRACKER_SD_DIAG_ENABLE
static uint32_t offline_queue_depth_from_meta(const sd_log_meta_t *meta) {
    if (meta == NULL) {
        return 0;
    }

    uint32_t replay_seq = meta->replay_seq == 0 ? 1 : meta->replay_seq;
    if (meta->write_seq < replay_seq) {
        return 0;
    }

    return meta->write_seq - replay_seq + 1;
}

static void offline_queue_log_link_transition(bool previous_online, bool next_online) {
    if (!sd_log_store_is_mounted()) {
        ESP_LOGI(TAG,
                 "link transition prev_online=%d next_online=%d sd_mounted=0",
                 previous_online ? 1 : 0,
                 next_online ? 1 : 0);
        return;
    }

    sd_log_meta_t meta = {0};
    if (sd_log_store_get_meta(&meta) != ESP_OK) {
        ESP_LOGI(TAG,
                 "link transition prev_online=%d next_online=%d meta=unavailable",
                 previous_online ? 1 : 0,
                 next_online ? 1 : 0);
        return;
    }

    ESP_LOGI(TAG,
             "link transition prev_online=%d next_online=%d write_seq=%lu replay_seq=%lu ack_critical=%lu depth=%lu",
             previous_online ? 1 : 0,
             next_online ? 1 : 0,
             (unsigned long)meta.write_seq,
             (unsigned long)meta.replay_seq,
             (unsigned long)meta.ack_seq_critical,
             (unsigned long)offline_queue_depth_from_meta(&meta));
}

static void offline_queue_log_enqueue_result(const sd_log_record_t *rec) {
    if (rec == NULL) {
        return;
    }

    if (!sd_log_store_is_mounted()) {
        ESP_LOGI(TAG,
                 "enqueue seq=%lu type=%u critical=%d net_up=%d gps_fix=%d time_trusted=%d sd_mounted=0",
                 (unsigned long)rec->seq,
                 (unsigned int)rec->type,
                 rec->critical ? 1 : 0,
                 rec->net_up ? 1 : 0,
                 rec->gps_fix ? 1 : 0,
                 rec->time_trusted ? 1 : 0);
        return;
    }

    sd_log_meta_t meta = {0};
    if (sd_log_store_get_meta(&meta) != ESP_OK) {
        ESP_LOGI(TAG,
                 "enqueue seq=%lu type=%u critical=%d net_up=%d gps_fix=%d time_trusted=%d meta=unavailable",
                 (unsigned long)rec->seq,
                 (unsigned int)rec->type,
                 rec->critical ? 1 : 0,
                 rec->net_up ? 1 : 0,
                 rec->gps_fix ? 1 : 0,
                 rec->time_trusted ? 1 : 0);
        return;
    }

    ESP_LOGI(TAG,
             "enqueue seq=%lu type=%u critical=%d net_up=%d gps_fix=%d time_trusted=%d write_seq=%lu replay_seq=%lu ack_critical=%lu depth=%lu",
             (unsigned long)rec->seq,
             (unsigned int)rec->type,
             rec->critical ? 1 : 0,
             rec->net_up ? 1 : 0,
             rec->gps_fix ? 1 : 0,
             rec->time_trusted ? 1 : 0,
             (unsigned long)meta.write_seq,
             (unsigned long)meta.replay_seq,
             (unsigned long)meta.ack_seq_critical,
             (unsigned long)offline_queue_depth_from_meta(&meta));
}
#endif

static retry_policy_t offline_queue_replay_retry_policy(void) {
    retry_policy_t policy = {
        .mode = RETRY_MODE_EXPONENTIAL,
        .base_delay_ms = (uint32_t)CONFIG_TRACKER_SD_RETRY_BASE_MS,
        .max_delay_ms = (uint32_t)CONFIG_TRACKER_SD_RETRY_MAX_MS,
        .max_attempts = 0,
        .jitter_ms = 250,
    };
    return policy;
}

static const retry_policy_t s_sd_mount_retry_policy = {
    .mode = RETRY_MODE_FIXED,
    .base_delay_ms = (uint32_t)OFFLINE_QUEUE_SD_MOUNT_RETRY_MS,
    .max_delay_ms = (uint32_t)OFFLINE_QUEUE_SD_MOUNT_RETRY_MS,
    .max_attempts = 0,
    .jitter_ms = 0,
};

static bool offline_queue_is_critical(offline_record_type_t type) {
    return type == OFFLINE_RECORD_STATUS || type == OFFLINE_RECORD_EVENT ||
           type == OFFLINE_RECORD_FIRMWARE;
}

static const char *offline_queue_type_name(offline_record_type_t type) {
    switch (type) {
        case OFFLINE_RECORD_STATUS:
            return "status";
        case OFFLINE_RECORD_EVENT:
            return "event";
        case OFFLINE_RECORD_FIRMWARE:
            return "firmware";
        case OFFLINE_RECORD_RAWDATA:
        default:
            return "rawdata";
    }
}

static const char *offline_queue_topic_from_type(offline_record_type_t type) {
    switch (type) {
        case OFFLINE_RECORD_STATUS:
            return tracker_mqtt_status_topic();
        case OFFLINE_RECORD_EVENT:
            return tracker_mqtt_events_topic();
        case OFFLINE_RECORD_FIRMWARE:
            return tracker_mqtt_firmware_topic();
        case OFFLINE_RECORD_RAWDATA:
        default:
            return tracker_mqtt_rawdata_topic();
    }
}

static void offline_queue_try_mount(uint64_t now_ms) {
    if (!CONFIG_TRACKER_SD_LOG_ENABLE || sd_log_store_is_mounted()) {
        return;
    }

    if (!retry_state_can_run(&s_ctx.sd_mount_retry, now_ms)) {
        return;
    }

    esp_err_t err = sd_log_store_mount();
    if (err == ESP_OK) {
        retry_state_reset(&s_ctx.sd_mount_retry);
        if (s_ctx.session_id != 0) {
            /* Preserve session continuity across temporary card removal/remount. */
            (void)sd_log_store_start_session(s_ctx.session_id);
        }
        ESP_LOGI(TAG, "SD log store mounted");
        return;
    }

    uint32_t delay_ms = retry_state_current_delay_ms(&s_ctx.sd_mount_retry,
                                                     &s_sd_mount_retry_policy,
                                                     now_ms);
    (void)retry_state_schedule(&s_ctx.sd_mount_retry,
                               &s_sd_mount_retry_policy,
                               now_ms,
                               err);
    ESP_LOGW(TAG,
             "retry step=sd_mount err=%s attempt=%lu next_delay_ms=%lu",
             esp_err_to_name(err),
             (unsigned long)s_ctx.sd_mount_retry.attempts,
             (unsigned long)delay_ms);
}

static bool offline_queue_replace_fragment(char *payload,
                                           size_t payload_len,
                                           const char *needle,
                                           const char *replacement) {
    if (payload == NULL || payload_len == 0 || needle == NULL || replacement == NULL) {
        return false;
    }

    char *match = strstr(payload, needle);
    if (match == NULL) {
        return false;
    }

    size_t old_len = strlen(needle);
    size_t new_len = strlen(replacement);
    size_t current_len = strlen(payload);
    if (new_len > old_len && (current_len + (new_len - old_len)) >= payload_len) {
        ESP_LOGW(TAG, "record sanitize skipped reason=buffer_too_small");
        return false;
    }

    size_t tail_len = strlen(match + old_len);
    if (new_len != old_len) {
        /* Shift the tail in-place so the caller keeps one self-contained buffer. */
        memmove(match + new_len, match + old_len, tail_len + 1);
    }
    memcpy(match, replacement, new_len);
    return true;
}

static const char *offline_queue_payload_for_publish(const sd_log_record_t *rec,
                                                     char *scratch_payload,
                                                     size_t scratch_len) {
    ESP_RETURN_ON_FALSE(rec != NULL, "", TAG, "record null");
    ESP_RETURN_ON_FALSE(scratch_payload != NULL && scratch_len > 0, rec->payload, TAG, "scratch invalid");

    bool needs_job_patch = rec->type == OFFLINE_RECORD_FIRMWARE &&
                           strstr(rec->payload, "\"jobId\":\"\"") != NULL;
    if (!needs_job_patch) {
        return rec->payload;
    }

    /*
     * Replay should publish data that matches the current cloud contract even if
     * older on-disk firmware records were generated without a job ID.
     */
    util_copy_string(scratch_payload, scratch_len, rec->payload);

    bool patched = false;
    if (needs_job_patch) {
        patched |= offline_queue_replace_fragment(scratch_payload,
                                                  scratch_len,
                                                  "\"jobId\":\"\"",
                                                  "\"jobId\":\"replay\"");
    }
    return patched ? scratch_payload : rec->payload;
}

/**
 * @brief Detect legacy rawdata records that contain stale OBD signals.
 *
 * Older firmware could serialize `diagnostics.channel` as disconnected/not-ready
 * while still carrying the previous `signals.rpm` snapshot. Replaying those
 * records would recreate misleading server-side OBD data, so replay advances
 * past them instead of publishing.
 */
static bool offline_queue_is_stale_obd_rawdata_record(const sd_log_record_t *rec) {
    if (rec == NULL || rec->type != OFFLINE_RECORD_RAWDATA) {
        return false;
    }

    bool channel_not_ready = strstr(rec->payload, "\"ble_obd_connected\":false") != NULL ||
                             strstr(rec->payload, "\"elm_ready\":false") != NULL;
    bool contains_obd_signal = strstr(rec->payload, "\"signals\":{\"rpm\"") != NULL;
    return channel_not_ready && contains_obd_signal;
}

static bool offline_queue_is_stale_firmware_record(const sd_log_record_t *rec) {
    if (rec == NULL || rec->type != OFFLINE_RECORD_FIRMWARE) {
        return false;
    }

    const char *payload = rec->payload;
    if (strstr(payload, "\"status\":\"success\"") == NULL) {
        return false;
    }
    if (strstr(payload, "\"targetVersion\":\"unknown\"") == NULL) {
        return false;
    }
    if (strstr(payload, "\"currentVersion\":\"unknown\"") == NULL) {
        return false;
    }

    /*
     * Old boot/replay success payloads are not useful once the device is healthy
     * again and can create confusing duplicate firmware history upstream.
     */
    return strstr(payload, "\"jobId\":\"replay\"") != NULL ||
           strstr(payload, "\"jobId\":\"\"") != NULL ||
           strstr(payload, "\"jobId\":\"boot\"") != NULL;
}

static esp_err_t offline_queue_publish_record(const sd_log_record_t *rec) {
    offline_record_type_t type = (offline_record_type_t)rec->type;
    const char *topic = offline_queue_topic_from_type(type);
    const char *topic_class = offline_queue_type_name(type);
    int qos = rec->critical ? 1 : 0;
    char payload_scratch[sizeof(rec->payload)] = {0};
    const char *payload = offline_queue_payload_for_publish(rec, payload_scratch, sizeof(payload_scratch));
    int msg_id = tracker_mqtt_publish_with_msg_id(topic, payload, qos);
    if (msg_id < 0) {
        ESP_LOGW(TAG,
                 "replay publish failed seq=%lu topic_class=%s qos=%d",
                 (unsigned long)rec->seq,
                 topic_class,
                 qos);
        return ESP_FAIL;
    }

    if (qos == 0) {
        /* QoS0 has no broker ACK; advancing replay_seq immediately is intentional. */
        telemetry_counters_inc_replay_success();
        ESP_LOGD(TAG,
                 "replay publish ok seq=%lu topic_class=%s qos=%d msg_id=%d",
                 (unsigned long)rec->seq,
                 topic_class,
                 qos,
                 msg_id);
        return sd_log_store_set_replay_seq(rec->seq + 1);
    }

    telemetry_counters_inc_replay_success();
    ESP_LOGD(TAG,
             "replay publish accepted seq=%lu topic_class=%s qos=%d msg_id=%d",
             (unsigned long)rec->seq,
             topic_class,
             qos,
             msg_id);
    return sd_log_store_ack_critical_and_advance_replay(rec->seq, rec->seq + 1);
}

esp_err_t offline_queue_init(void) {
    memset(&s_ctx, 0, sizeof(s_ctx));
    s_ctx.last_replay_publish_ms = 0;
    retry_state_reset(&s_ctx.replay_retry);
    retry_state_reset(&s_ctx.sd_mount_retry);
    esp_err_t err = sd_log_store_init();
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "sd_log_store_init failed");
    if (CONFIG_TRACKER_SD_LOG_ENABLE) {
        err = sd_log_store_mount();
        if (err != ESP_OK) {
            uint64_t now_ms = util_uptime_ms();
            uint32_t delay_ms = retry_state_current_delay_ms(&s_ctx.sd_mount_retry,
                                                             &s_sd_mount_retry_policy,
                                                             now_ms);
            (void)retry_state_schedule(&s_ctx.sd_mount_retry,
                                       &s_sd_mount_retry_policy,
                                       now_ms,
                                       err);
            ESP_LOGW(TAG,
                     "retry step=sd_mount err=%s attempt=%lu next_delay_ms=%lu",
                     esp_err_to_name(err),
                     (unsigned long)s_ctx.sd_mount_retry.attempts,
                     (unsigned long)delay_ms);
        }
    }

    sd_log_meta_t meta = {0};
    if (sd_log_store_get_meta(&meta) == ESP_OK) {
        /* Continue sequence numbering after the latest persisted write. */
        s_ctx.next_seq = meta.write_seq + 1;
        if (s_ctx.next_seq == 0) {
            s_ctx.next_seq = 1;
        }
        s_ctx.session_id = meta.session_id;
    } else {
        s_ctx.next_seq = 1;
    }

    s_ctx.initialized = true;
    return ESP_OK;
}

void offline_queue_set_session(uint32_t session_id) {
    s_ctx.session_id = session_id;
    if (session_id != 0 && sd_log_store_is_mounted()) {
        (void)sd_log_store_start_session(session_id);
    }
}

void offline_queue_set_online(bool online) {
#if CONFIG_TRACKER_SD_DIAG_ENABLE
    if (s_ctx.online != online) {
        offline_queue_log_link_transition(s_ctx.online, online);
    }
#endif
    s_ctx.online = online;
}

esp_err_t offline_queue_enqueue(offline_record_type_t type,
                                const char *payload,
                                bool gps_fix,
                                bool net_up,
                                bool time_trusted,
                                uint64_t timestamp_ms) {
    ESP_RETURN_ON_FALSE(s_ctx.initialized, ESP_ERR_INVALID_STATE, TAG, "queue not initialized");
    ESP_RETURN_ON_NULL(payload, ESP_ERR_INVALID_ARG, TAG, "payload null");

    sd_log_record_t rec = {0};
    rec.seq = s_ctx.next_seq;
    rec.ts_ms = timestamp_ms == 0 ? util_uptime_ms() : timestamp_ms;
    rec.session_id = s_ctx.session_id;
    rec.type = (uint8_t)type;
    rec.critical = offline_queue_is_critical(type) ? 1 : 0;
    rec.gps_fix = gps_fix ? 1 : 0;
    rec.net_up = net_up ? 1 : 0;
    rec.time_trusted = time_trusted ? 1 : 0;
    size_t payload_len = strlen(payload);
    if (payload_len >= sizeof(rec.payload)) {
        telemetry_counters_inc_sd_write_fail();
        ESP_LOGW(TAG,
                 "offline payload too large type=%u len=%u cap=%u",
                 (unsigned)type,
                 (unsigned)payload_len,
                 (unsigned)sizeof(rec.payload));
        return ESP_ERR_INVALID_SIZE;
    }
    memcpy(rec.payload, payload, payload_len + 1U);

    if (CONFIG_TRACKER_SD_LOG_ENABLE) {
        /* Treat a temporarily unavailable card as best-effort; do not fail caller telemetry paths. */
        offline_queue_try_mount(util_uptime_ms());
        if (!sd_log_store_is_mounted()) {
#if CONFIG_TRACKER_SD_DIAG_ENABLE
            offline_queue_log_enqueue_result(&rec);
#endif
            return ESP_OK;
        }

        esp_err_t err = sd_log_store_append(&rec);
        ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "sd append failed");
#if CONFIG_TRACKER_FIELD_VALIDATION_MODE
        static bool s_gc_skip_logged = false;
        if (!s_gc_skip_logged) {
            ESP_LOGW(TAG, "Field validation override: defer synchronous SD GC to keep OTA loop responsive");
            s_gc_skip_logged = true;
        }
#else
        (void)sd_log_store_gc_if_needed();
#endif
    }

#if CONFIG_TRACKER_SD_DIAG_ENABLE
    offline_queue_log_enqueue_result(&rec);
#endif
    s_ctx.next_seq += 1;
    return ESP_OK;
}

void offline_queue_replay_tick(void) {
    if (!s_ctx.initialized || !CONFIG_TRACKER_SD_REPLAY_ENABLE || !s_ctx.online) {
        return;
    }

    offline_queue_try_mount(util_uptime_ms());
    if (!sd_log_store_is_mounted()) {
        return;
    }

    if (!tracker_mqtt_is_connected()) {
        return;
    }

    uint64_t now_ms = util_uptime_ms();

    if (!retry_state_can_run(&s_ctx.replay_retry, now_ms)) {
        return;
    }

    if (s_ctx.last_replay_publish_ms != 0 &&
        (now_ms - s_ctx.last_replay_publish_ms) < OFFLINE_QUEUE_REPLAY_MIN_PUBLISH_INTERVAL_MS) {
        return;
    }

    sd_log_meta_t meta = {0};
    if (sd_log_store_get_meta(&meta) != ESP_OK) {
        return;
    }

    uint32_t replay_seq = meta.replay_seq == 0 ? 1 : meta.replay_seq;
    sd_log_record_t rec = {0};
    if (sd_log_store_peek_next(replay_seq, &rec) != ESP_OK) {
        return;
    }

    if (rec.critical && rec.seq <= meta.ack_seq_critical) {
        /* Metadata says this critical record was already committed earlier; skip duplicate replay. */
        (void)sd_log_store_set_replay_seq(rec.seq + 1);
        return;
    }

    if (offline_queue_is_stale_obd_rawdata_record(&rec)) {
        /*
         * This only affects already persisted legacy queue rows. New payloads
         * omit OBD signal fields when the OBD channel is disconnected/stale.
         */
        if (sd_log_store_set_replay_seq(rec.seq + 1) == ESP_OK) {
            telemetry_counters_inc_replay_drop();
            ESP_LOGW(TAG,
                     "replay drop stale OBD rawdata seq=%lu",
                     (unsigned long)rec.seq);
            retry_state_reset(&s_ctx.replay_retry);
            return;
        }
        telemetry_counters_inc_replay_retry();
    }

    if (offline_queue_is_stale_firmware_record(&rec)) {
        if (sd_log_store_ack_critical_and_advance_replay(rec.seq, rec.seq + 1) == ESP_OK) {
            telemetry_counters_inc_replay_success();
            ESP_LOGI(TAG,
                     "replay skip stale firmware seq=%lu job=boot/replay",
                     (unsigned long)rec.seq);
            retry_state_reset(&s_ctx.replay_retry);
            return;
        }
        telemetry_counters_inc_replay_retry();
    }

    if (offline_queue_publish_record(&rec) == ESP_OK) {
        s_ctx.last_replay_publish_ms = now_ms;
        retry_state_reset(&s_ctx.replay_retry);
        return;
    }

    telemetry_counters_inc_replay_retry();
    retry_policy_t replay_policy = offline_queue_replay_retry_policy();
    uint32_t delay_ms = retry_state_current_delay_ms(&s_ctx.replay_retry,
                                                     &replay_policy,
                                                     now_ms);
    (void)retry_state_schedule(&s_ctx.replay_retry,
                               &replay_policy,
                               now_ms,
                               ESP_FAIL);
    ESP_LOGW(TAG,
             "retry step=replay_publish err=%s attempt=%lu next_delay_ms=%lu",
             esp_err_to_name(ESP_FAIL),
             (unsigned long)s_ctx.replay_retry.attempts,
             (unsigned long)delay_ms);
}

bool offline_queue_should_throttle_rawdata(void) {
    sd_log_stats_t stats = {0};
    if (sd_log_store_get_stats(&stats) != ESP_OK || stats.quota_bytes == 0) {
        return false;
    }

    /* Raw telemetry slows down earlier than the hard GC threshold to reduce churn. */
    size_t soft_limit = (stats.quota_bytes * (size_t)CONFIG_TRACKER_SD_LOG_SOFT_QUOTA_PERCENT) / 100U;
    return stats.bytes_used >= soft_limit;
}

void offline_queue_stop_session(bool clean_shutdown) {
    if (!sd_log_store_is_mounted()) {
        return;
    }
    (void)sd_log_store_stop_session(clean_shutdown);
}

uint32_t offline_queue_depth(void) {
    sd_log_meta_t meta = {0};
    if (sd_log_store_get_meta(&meta) != ESP_OK) {
        return 0;
    }

    uint32_t replay_seq = meta.replay_seq == 0 ? 1 : meta.replay_seq;
    if (meta.write_seq < replay_seq) {
        return 0;
    }

    return meta.write_seq - replay_seq + 1;
}
