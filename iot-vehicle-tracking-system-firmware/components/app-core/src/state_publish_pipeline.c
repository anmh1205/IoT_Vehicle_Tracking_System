#include "state_publish_pipeline.h"

#include <string.h>

#include "cJSON.h"
#include "esp_log.h"

#include "data_formatter.h"
#include "mqtt_client.h"
#include "offline_queue.h"
#include "state_machine_internal.h"
#include "state_runtime_context.h"
#include "state_wake_prelude.h"
#include "telemetry_counters.h"
#include "util.h"

/**
 * @file state_publish_pipeline.c
 * @brief Unified MQTT publish/fallback pipeline for tracker runtime outputs.
 */

typedef char *(*state_publish_formatter_t)(const config_t *cfg,
                                          const telemetry_t *telemetry,
                                          const void *format_arg,
                                          bool include_auth_token,
                                          bool timestamp_trusted,
                                          uint64_t timestamp_ms,
                                          const char *message_id,
                                          uint32_t seq_no,
                                          const char *boot_id);

typedef esp_err_t (*state_publish_sender_t)(const char *payload);

typedef struct {
    const char *status;
    uint32_t session_id;
} state_publish_status_args_t;

typedef struct {
    const char *event_type;
    int code;
    const char *message;
} state_publish_event_args_t;

static const char *TAG = STATE_MACHINE_TAG;

static char *state_publish_format_rawdata(const config_t *cfg,
                                         const telemetry_t *telemetry,
                                         const void *format_arg,
                                         bool include_auth_token,
                                         bool timestamp_trusted,
                                         uint64_t timestamp_ms,
                                         const char *message_id,
                                         uint32_t seq_no,
                                         const char *boot_id) {
    (void)format_arg;
    return data_format_rawdata(cfg,
                               telemetry,
                               include_auth_token,
                               timestamp_trusted,
                               timestamp_ms,
                               message_id,
                               seq_no,
                               boot_id);
}

static char *state_publish_format_status(const config_t *cfg,
                                        const telemetry_t *telemetry,
                                        const void *format_arg,
                                        bool include_auth_token,
                                        bool timestamp_trusted,
                                        uint64_t timestamp_ms,
                                        const char *message_id,
                                        uint32_t seq_no,
                                        const char *boot_id) {
    const state_publish_status_args_t *args = (const state_publish_status_args_t *)format_arg;
    return data_format_status(cfg,
                              args->status,
                              args->session_id,
                              telemetry,
                              include_auth_token,
                              timestamp_trusted,
                              timestamp_ms,
                              message_id,
                              seq_no,
                              boot_id);
}

static char *state_publish_format_event(const config_t *cfg,
                                       const telemetry_t *telemetry,
                                       const void *format_arg,
                                       bool include_auth_token,
                                       bool timestamp_trusted,
                                       uint64_t timestamp_ms,
                                       const char *message_id,
                                       uint32_t seq_no,
                                       const char *boot_id) {
    (void)telemetry;
    const state_publish_event_args_t *args = (const state_publish_event_args_t *)format_arg;
    return data_format_event(cfg,
                             args->event_type,
                             args->code,
                             args->message,
                             include_auth_token,
                             timestamp_trusted,
                             timestamp_ms,
                             message_id,
                             seq_no,
                             boot_id);
}

static char *state_publish_format_firmware(const config_t *cfg,
                                          const telemetry_t *telemetry,
                                          const void *format_arg,
                                          bool include_auth_token,
                                          bool timestamp_trusted,
                                          uint64_t timestamp_ms,
                                          const char *message_id,
                                          uint32_t seq_no,
                                          const char *boot_id) {
    (void)telemetry;
    return data_format_firmware(cfg,
                                (const firmware_status_t *)format_arg,
                                include_auth_token,
                                timestamp_trusted,
                                timestamp_ms,
                                message_id,
                                seq_no,
                                boot_id);
}

static void state_publish_via_pipeline(const char *log_label,
                                       offline_record_type_t record_type,
                                       const void *format_arg,
                                       state_publish_formatter_t formatter,
                                       state_publish_sender_t sender,
                                       bool sync_axes,
                                       bool update_raw_publish_ms) {
    if (formatter == NULL || sender == NULL) {
        return;
    }

    state_machine_update_time_source();
    if (sync_axes) {
        state_machine_sync_runtime_axes(s_runtime_state_hint);
    }

    char message_id[TRACKER_METADATA_MESSAGE_ID_LEN] = {0};
    state_machine_fill_message_id(message_id, sizeof(message_id));
    uint32_t seq_no = state_machine_next_seq_no();

    ESP_LOGD(TAG,
             "mqtt metadata topic_class=%s mid=%s seq=%lu boot=%s ts=%llu",
             log_label,
             message_id,
             (unsigned long)seq_no,
             s_boot_id,
             (unsigned long long)s_event_timestamp_ms);

    char *payload = formatter(&s_config,
                              &s_telemetry,
                              format_arg,
                              true,
                              s_time_trusted,
                              s_event_timestamp_ms,
                              message_id,
                              seq_no,
                              s_boot_id);
    if (payload == NULL) {
        return;
    }

    bool live_connected = tracker_mqtt_is_connected();
    if (live_connected) {
        esp_err_t live_err = sender(payload);
        if (live_err == ESP_OK) {
            telemetry_counters_inc_mqtt_publish_ok();
            cJSON_free(payload);
            if (update_raw_publish_ms) {
                s_last_raw_publish_ms = util_uptime_ms();
            }
            return;
        }

        telemetry_counters_inc_mqtt_publish_fail();
        ESP_LOGW(TAG,
                 "mqtt publish failed topic_class=%s err=%s seq=%lu fallback=offline_queue",
                 log_label,
                 esp_err_to_name(live_err),
                 (unsigned long)seq_no);
    }

    telemetry_counters_inc_mqtt_publish_fallback();
    esp_err_t queue_err = offline_queue_enqueue(record_type,
                                                payload,
                                                s_telemetry.gnss.fix_valid,
                                                live_connected,
                                                s_time_trusted,
                                                s_event_timestamp_ms);
    if (queue_err != ESP_OK) {
        ESP_LOGW(TAG,
                 "mqtt fallback enqueue failed topic_class=%s err=%s seq=%lu",
                 log_label,
                 esp_err_to_name(queue_err),
                 (unsigned long)seq_no);
    }
    cJSON_free(payload);
    if (update_raw_publish_ms) {
        s_last_raw_publish_ms = util_uptime_ms();
    }
}

static void state_machine_defer_firmware_report(const firmware_status_t *firmware) {
    if (firmware == NULL) {
        return;
    }

    s_deferred_firmware_report = *firmware;
    s_deferred_firmware_report_pending = true;
    ESP_LOGI(TAG,
             "defer firmware status=%s progress=%u job=%s until mqtt connected",
             firmware->status,
             (unsigned)firmware->progress,
             firmware->job_id);
}

static void state_machine_fill_firmware_status(firmware_status_t *firmware,
                                               const char *status,
                                               uint8_t progress,
                                               const char *version,
                                               const char *job_id,
                                               const char *partition,
                                               const char *error) {
    if (firmware == NULL) {
        return;
    }

    memset(firmware, 0, sizeof(*firmware));
    util_copy_string(firmware->status, sizeof(firmware->status), status);
    firmware->progress = progress;
    util_copy_string(firmware->job_id, sizeof(firmware->job_id), job_id);
    util_copy_string(firmware->target_version, sizeof(firmware->target_version), version);
    util_copy_string(firmware->current_version, sizeof(firmware->current_version), s_current_version);
    if (!util_string_empty(partition)) {
        util_copy_string(firmware->partition, sizeof(firmware->partition), partition);
    }
    if (!util_string_empty(error)) {
        util_copy_string(firmware->error, sizeof(firmware->error), error);
    }
}

void state_machine_publish_rawdata(void) {
    state_publish_via_pipeline("rawdata",
                               OFFLINE_RECORD_RAWDATA,
                               NULL,
                               state_publish_format_rawdata,
                               tracker_mqtt_publish_rawdata,
                               true,
                               true);
}

void state_machine_publish_status(const char *status) {
    const state_publish_status_args_t args = {
        .status = status,
        .session_id = s_session_id,
    };
    state_publish_via_pipeline("status",
                               OFFLINE_RECORD_STATUS,
                               &args,
                               state_publish_format_status,
                               tracker_mqtt_publish_status,
                               true,
                               false);
}

void state_machine_publish_event(const char *event_type, int code, const char *message) {
    const state_publish_event_args_t args = {
        .event_type = event_type,
        .code = code,
        .message = message,
    };
    state_publish_via_pipeline("event",
                               OFFLINE_RECORD_EVENT,
                               &args,
                               state_publish_format_event,
                               tracker_mqtt_publish_event,
                               false,
                               false);
}

void state_machine_publish_firmware_payload(const firmware_status_t *firmware) {
    state_publish_via_pipeline("firmware",
                               OFFLINE_RECORD_FIRMWARE,
                               firmware,
                               state_publish_format_firmware,
                               tracker_mqtt_publish_firmware,
                               false,
                               false);
}

void state_machine_publish_firmware_status(const char *status,
                                           uint8_t progress,
                                           const char *version,
                                           const char *job_id,
                                           const char *partition,
                                           const char *error) {
    firmware_status_t firmware = {0};
    state_machine_fill_firmware_status(&firmware, status, progress, version, job_id, partition, error);
    state_machine_publish_firmware_payload(&firmware);
}

static void state_machine_stage_firmware_status_for_online_publish(const char *status,
                                                                   uint8_t progress,
                                                                   const char *version,
                                                                   const char *job_id,
                                                                   const char *partition,
                                                                   const char *error) {
    firmware_status_t firmware = {0};
    state_machine_fill_firmware_status(&firmware, status, progress, version, job_id, partition, error);
    state_machine_defer_firmware_report(&firmware);
}

void state_machine_publish_or_stage_firmware_status(const char *status,
                                                    uint8_t progress,
                                                    const char *version,
                                                    const char *job_id,
                                                    const char *partition,
                                                    const char *error) {
    if (tracker_mqtt_is_connected()) {
        state_machine_publish_firmware_status(status, progress, version, job_id, partition, error);
        return;
    }

    state_machine_stage_firmware_status_for_online_publish(status,
                                                           progress,
                                                           version,
                                                           job_id,
                                                           partition,
                                                           error);
}

void state_machine_try_flush_deferred_firmware_report(void) {
    if (!s_deferred_firmware_report_pending || !tracker_mqtt_is_connected() || s_ota_in_progress) {
        return;
    }

    state_machine_publish_firmware_payload(&s_deferred_firmware_report);
    s_deferred_firmware_report_pending = false;
}
