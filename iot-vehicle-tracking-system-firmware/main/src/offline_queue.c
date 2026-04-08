#include "offline_queue.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "sdkconfig.h"

#include "mqtt_client.h"
#include "retry_manager.h"
#include "sd_log_store.h"
#include "telemetry_counters.h"
#include "util.h"

static const char *TAG = "OFFLINE_QUEUE";
#define OFFLINE_QUEUE_SD_MOUNT_RETRY_MS 30000ULL

typedef struct {
    bool initialized;
    bool online;
    uint32_t session_id;
    uint32_t next_seq;
    int pending_msg_id;
    int acked_msg_id;
    uint32_t pending_seq;
    uint64_t pending_since_ms;
    retry_state_t replay_retry;
    retry_state_t sd_mount_retry;
    portMUX_TYPE ack_lock;
} offline_queue_ctx_t;

static offline_queue_ctx_t s_ctx;

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

static esp_err_t offline_queue_publish_record(const sd_log_record_t *rec) {
    const char *topic = offline_queue_topic_from_type((offline_record_type_t)rec->type);
    int qos = rec->critical ? 1 : 0;
    int msg_id = tracker_mqtt_publish_with_msg_id(topic, rec->payload, qos);
    if (msg_id < 0) {
        return ESP_FAIL;
    }

    if (qos == 0) {
        telemetry_counters_inc_replay_success();
        s_ctx.pending_msg_id = -1;
        s_ctx.pending_seq = 0;
        return sd_log_store_set_replay_seq(rec->seq + 1);
    }

    taskENTER_CRITICAL(&s_ctx.ack_lock);
    int previous_acked_msg_id = s_ctx.acked_msg_id;
    s_ctx.pending_msg_id = msg_id;
    s_ctx.pending_seq = rec->seq;
    s_ctx.pending_since_ms = util_uptime_ms();
    if (previous_acked_msg_id != msg_id) {
        s_ctx.acked_msg_id = -1;
    }
    taskEXIT_CRITICAL(&s_ctx.ack_lock);
    return ESP_OK;
}

esp_err_t offline_queue_init(void) {
    memset(&s_ctx, 0, sizeof(s_ctx));
    s_ctx.pending_msg_id = -1;
    s_ctx.acked_msg_id = -1;
    retry_state_reset(&s_ctx.replay_retry);
    retry_state_reset(&s_ctx.sd_mount_retry);
    s_ctx.ack_lock = (portMUX_TYPE)portMUX_INITIALIZER_UNLOCKED;
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
    util_copy_string(rec.payload, sizeof(rec.payload), payload);

    if (CONFIG_TRACKER_SD_LOG_ENABLE) {
        offline_queue_try_mount(util_uptime_ms());
        if (!sd_log_store_is_mounted()) {
            return ESP_OK;
        }

        esp_err_t err = sd_log_store_append(&rec);
        ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "sd append failed");
        (void)sd_log_store_gc_if_needed();
    }

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

    int pending_msg_id = -1;
    uint32_t pending_seq = 0;
    uint64_t pending_since_ms = 0;
    int acked_msg_id = -1;
    taskENTER_CRITICAL(&s_ctx.ack_lock);
    pending_msg_id = s_ctx.pending_msg_id;
    pending_seq = s_ctx.pending_seq;
    pending_since_ms = s_ctx.pending_since_ms;
    acked_msg_id = s_ctx.acked_msg_id;
    taskEXIT_CRITICAL(&s_ctx.ack_lock);

    if (acked_msg_id >= 0 && acked_msg_id == pending_msg_id && pending_seq > 0) {
        if (sd_log_store_ack_critical_and_advance_replay(pending_seq, pending_seq + 1) == ESP_OK) {
            telemetry_counters_inc_replay_success();
            taskENTER_CRITICAL(&s_ctx.ack_lock);
            if (s_ctx.pending_msg_id == pending_msg_id && s_ctx.pending_seq == pending_seq) {
                s_ctx.pending_msg_id = -1;
                s_ctx.pending_seq = 0;
                s_ctx.pending_since_ms = 0;
                if (s_ctx.acked_msg_id == acked_msg_id) {
                    s_ctx.acked_msg_id = -1;
                }
            }
            taskEXIT_CRITICAL(&s_ctx.ack_lock);
            retry_state_reset(&s_ctx.replay_retry);
        } else {
            telemetry_counters_inc_replay_retry();
        }
        return;
    }

    if (pending_msg_id >= 0) {
        if ((now_ms - pending_since_ms) >= (uint64_t)CONFIG_TRACKER_SD_ACK_TIMEOUT_MS) {
            telemetry_counters_inc_replay_retry();
            taskENTER_CRITICAL(&s_ctx.ack_lock);
            if (s_ctx.pending_msg_id == pending_msg_id && s_ctx.pending_seq == pending_seq) {
                s_ctx.pending_msg_id = -1;
                s_ctx.pending_seq = 0;
                s_ctx.pending_since_ms = 0;
                s_ctx.acked_msg_id = -1;
            }
            taskEXIT_CRITICAL(&s_ctx.ack_lock);
            retry_policy_t replay_policy = offline_queue_replay_retry_policy();
            uint32_t delay_ms = retry_state_current_delay_ms(&s_ctx.replay_retry,
                                                             &replay_policy,
                                                             now_ms);
            (void)retry_state_schedule(&s_ctx.replay_retry,
                                       &replay_policy,
                                       now_ms,
                                       ESP_ERR_TIMEOUT);
            ESP_LOGW(TAG,
                     "retry step=replay_ack_timeout err=%s attempt=%lu next_delay_ms=%lu",
                     esp_err_to_name(ESP_ERR_TIMEOUT),
                     (unsigned long)s_ctx.replay_retry.attempts,
                     (unsigned long)delay_ms);
        }
        return;
    }

    if (!retry_state_can_run(&s_ctx.replay_retry, now_ms)) {
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
        (void)sd_log_store_set_replay_seq(rec.seq + 1);
        return;
    }

    if (offline_queue_publish_record(&rec) == ESP_OK) {
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

void offline_queue_handle_publish_ack(int msg_id) {
    if (msg_id <= 0) {
        return;
    }
    taskENTER_CRITICAL(&s_ctx.ack_lock);
    s_ctx.acked_msg_id = msg_id;
    taskEXIT_CRITICAL(&s_ctx.ack_lock);
}

bool offline_queue_should_throttle_rawdata(void) {
    sd_log_stats_t stats = {0};
    if (sd_log_store_get_stats(&stats) != ESP_OK || stats.quota_bytes == 0) {
        return false;
    }

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
