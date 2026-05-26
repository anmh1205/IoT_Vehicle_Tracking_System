#include "state_publish_pipeline.h"

#include <string.h>

#include "cJSON.h"
#include "esp_log.h"

#include "data_formatter.h"
#include "imu_lis3dsh.h"
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
 *
 * ## Topic classes handled here
 *    - rawdata: high-rate telemetry with IMU/session metadata
 *    - status: lifecycle snapshots and authoritative boundaries
 *    - event: operator-visible diagnostics and warnings
 *    - firmware: OTA lifecycle status
 *
 * ## Pipeline contract
 *    1. Stamp shared metadata (`message_id`, `seq_no`, `boot_id`, trusted timestamp).
 *    2. Format the payload through the topic-specific formatter.
 *    3. Attempt live MQTT publish when connected.
 *    4. On publish failure or offline mode, enqueue the same payload to offline storage.
 *
 * This keeps metadata, counters, and fallback behavior aligned across all
 * outbound payload types without duplicating publish logic in the FSM itself.
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
    const char *boundary_event;
} state_publish_status_args_t;

typedef struct {
    const char *event_type;
    int code;
    const char *message;
} state_publish_event_args_t;

static const char *TAG = "PUBLISH_PIPE";

/**
 * @brief Return whether the current session identity is safe to emit.
 */
static bool state_publish_should_emit_session_identity(void) {
    // A restored session stays provisional until ignition confirms it; do not leak old identifiers before that point.
    return !s_session_restore_pending && s_session_id != 0U;
}

/**
 * @brief Return the local session key that may be exposed to the cloud contract.
 */
static uint32_t state_publish_effective_local_session_key(void) {
    // Keep provisional restored sessions invisible on the wire until runtime revalidates them.
    return state_publish_should_emit_session_identity() ? s_session_id : 0U;
}

/**
 * @brief Return the canonical session ID that may be exposed to the cloud contract.
 */
static uint64_t state_publish_effective_canonical_session_id(void) {
    // Canonical IDs are only meaningful once the active local session has been revalidated.
    return state_publish_should_emit_session_identity() ? s_canonical_session_id : 0U;
}

/**
 * @brief Return the boot ID that should tag the current session-aware payload.
 */
static const char *state_publish_effective_session_boot_id(void) {
    // Prefer the session-specific boot ID once the session is confirmed active; otherwise keep the current boot scope.
    if (!state_publish_should_emit_session_identity()) {
        return s_boot_id;
    }
    return util_string_empty(s_session_boot_id) ? s_boot_id : s_session_boot_id;
}

static char *state_publish_format_rawdata(const config_t *cfg,
                                         const telemetry_t *telemetry,
                                         const void *format_arg,
                                         bool include_auth_token,
                                         bool timestamp_trusted,
                                         uint64_t timestamp_ms,
                                         const char *message_id,
                                         uint32_t seq_no,
                                         const char *boot_id) {
    // Format the rawdata payload with the shared metadata/session envelope expected by the cloud contract.
    (void)format_arg;
    return data_format_rawdata(cfg,
                               telemetry,
                               include_auth_token,
                               timestamp_trusted,
                               timestamp_ms,
                               message_id,
                               seq_no,
                               boot_id,
                               state_publish_effective_local_session_key(),
                               state_publish_effective_canonical_session_id(),
                               state_publish_effective_session_boot_id());
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
    // Format status publishes with boundary metadata so lifecycle transitions can be reconstructed server-side.
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
                              boot_id,
                              state_publish_effective_local_session_key(),
                              state_publish_effective_canonical_session_id(),
                              state_publish_effective_session_boot_id(),
                              args->boundary_event);
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
    // Format operator-visible events with the same identity/timestamp metadata used by other outbound payloads.
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
    // Format OTA lifecycle status with the shared firmware contract before it enters the common publish path.
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

/**
 * @brief Format, publish, and offline-buffer one outbound tracker payload.
 *
 * All rawdata/status/event/firmware publishes flow through this helper so
 * metadata stamping, live publish attempts, counters, and offline fallback
 * stay consistent across topic classes.
 */
static bool state_publish_via_pipeline(const char *log_label,
                                       offline_record_type_t record_type,
                                       const void *format_arg,
                                       state_publish_formatter_t formatter,
                                       state_publish_sender_t sender,
                                       bool sync_axes,
                                       bool update_raw_publish_ms) {
    // Run every outbound payload through this shared pipeline so formatting, metadata, and fallback behavior stay aligned.
    if (formatter == NULL || sender == NULL) {
        return false;
    }

    // Refresh timestamps/runtime axes first so every publish attempt sees the same authoritative metadata snapshot.
    state_machine_update_time_source();
    if (sync_axes) {
        state_machine_sync_runtime_axes(s_runtime_state_hint);
    }

    // Allocate the message identity once per payload before formatting so live and offline paths share the same envelope.
    char message_id[TRACKER_METADATA_MESSAGE_ID_LEN] = {0};
    state_machine_fill_message_id(message_id, sizeof(message_id));
    uint32_t seq_no = state_machine_next_seq_no();

    ESP_LOGD(TAG,
             "event=mqtt_publish_metadata topic_class=%s mid=%s seq=%lu boot=%s ts=%llu",
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
        return false;
    }

    bool live_connected = tracker_mqtt_is_connected();
    if (live_connected) {
        // When MQTT is live, always give the direct publish path the first chance before falling back to offline storage.
        esp_err_t live_err = sender(payload);
        if (live_err == ESP_OK) {
            telemetry_counters_inc_mqtt_publish_ok();
            cJSON_free(payload);
            if (update_raw_publish_ms) {
                s_last_raw_publish_ms = util_uptime_ms();
            }
            return true;
        }

        telemetry_counters_inc_mqtt_publish_fail();
        ESP_LOGW(TAG,
                 "event=mqtt_publish_failed topic_class=%s err=%s seq=%lu fallback=offline_queue",
                 log_label,
                 esp_err_to_name(live_err),
                 (unsigned long)seq_no);
    }

    // The exact same payload is enqueued offline on failure/offline mode so replay preserves the original cloud contract.
    telemetry_counters_inc_mqtt_publish_fallback();
    esp_err_t queue_err = offline_queue_enqueue(record_type,
                                                payload,
                                                s_telemetry.gnss.fix_valid,
                                                live_connected,
                                                s_time_trusted,
                                                s_event_timestamp_ms);
    if (queue_err != ESP_OK) {
        ESP_LOGW(TAG,
                 "event=mqtt_fallback_enqueue_failed topic_class=%s err=%s seq=%lu",
                 log_label,
                 esp_err_to_name(queue_err),
                 (unsigned long)seq_no);
    }
    cJSON_free(payload);
    if (update_raw_publish_ms) {
        s_last_raw_publish_ms = util_uptime_ms();
    }
    return queue_err == ESP_OK;
}

/**
 * @brief Keep firmware status for the next connected publish opportunity.
 */
static void state_machine_defer_firmware_report(const firmware_status_t *firmware) {
    if (firmware == NULL) {
        return;
    }

    s_deferred_firmware_report = *firmware;
    s_deferred_firmware_report_pending = true;
    ESP_LOGI(TAG,
             "event=firmware_status_deferred status=%s progress=%u job=%s reason=mqtt_not_connected",
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

/**
 * @brief Publish the current rawdata snapshot through the unified pipeline.
 *
 * Successful rawdata publish also resets the IMU delta window so the next
 * publish interval accumulates a fresh vibration peak in `m/s^2`.
 */
void state_machine_publish_rawdata(void) {
    // Publish raw telemetry through the shared pipeline so fast-path data still gets uniform metadata and fallback handling.
    bool published = state_publish_via_pipeline("rawdata",
                                                OFFLINE_RECORD_RAWDATA,
                                                NULL,
                                                state_publish_format_rawdata,
                                                tracker_mqtt_publish_rawdata,
                                                true,
                                                true);
    if (published) {
        imu_reset_accel_delta_window();
    }
}

/**
 * @brief Publish one status payload with optional boundary semantics.
 *
 * @param[in] status Status label such as `running`, `stopped`, or `heartbeat`.
 * @param[in] boundary_event Boundary qualifier such as `started`, `ended`, or `none`.
 */
void state_machine_publish_status(const char *status, const char *boundary_event) {
    // Publish status through the shared pipeline so lifecycle boundaries follow the same offline-fallback rules.
    const state_publish_status_args_t args = {
        .status = status,
        .session_id = state_publish_effective_local_session_key(),
        .boundary_event = boundary_event,
    };
    (void)state_publish_via_pipeline("status",
                                     OFFLINE_RECORD_STATUS,
                                     &args,
                                     state_publish_format_status,
                                     tracker_mqtt_publish_status,
                                     true,
                                     false);
}

/**
 * @brief Publish an event payload through the unified pipeline.
 *
 * @param[in] event_type Event severity/type label.
 * @param[in] code Numeric event code.
 * @param[in] message Human-readable event message.
 */
void state_machine_publish_event(const char *event_type, int code, const char *message) {
    // Publish events through the shared pipeline so operator-facing diagnostics stay consistent online and offline.
    const state_publish_event_args_t args = {
        .event_type = event_type,
        .code = code,
        .message = message,
    };
    (void)state_publish_via_pipeline("event",
                                     OFFLINE_RECORD_EVENT,
                                     &args,
                                     state_publish_format_event,
                                     tracker_mqtt_publish_event,
                                     false,
                                     false);
}

/**
 * @brief Publish a fully prepared firmware status payload.
 *
 * @param[in] firmware Firmware status payload to publish.
 */
void state_machine_publish_firmware_payload(const firmware_status_t *firmware) {
    // Publish a fully prepared firmware payload through the common pipeline without rebuilding scalar fields again.
    (void)state_publish_via_pipeline("firmware",
                                     OFFLINE_RECORD_FIRMWARE,
                                     firmware,
                                     state_publish_format_firmware,
                                     tracker_mqtt_publish_firmware,
                                     false,
                                     false);
}

/**
 * @brief Build and publish a firmware status payload from scalar arguments.
 *
 * @param[in] status Firmware lifecycle status.
 * @param[in] progress OTA progress percentage/state.
 * @param[in] version Target firmware version.
 * @param[in] job_id OTA job identifier.
 * @param[in] partition OTA/running partition label.
 * @param[in] error Optional firmware error code/string.
 */
void state_machine_publish_firmware_status(const char *status,
                                           uint8_t progress,
                                           const char *version,
                                           const char *job_id,
                                           const char *partition,
                                           const char *error) {
    // Publish firmware status through the shared pipeline so OTA progress uses the same metadata and retry rules.
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
    // Cache the firmware status locally so the next connected window can publish the exact same OTA report.
    firmware_status_t firmware = {0};
    state_machine_fill_firmware_status(&firmware, status, progress, version, job_id, partition, error);
    state_machine_defer_firmware_report(&firmware);
}

/**
 * @brief Publish firmware status immediately when online, otherwise defer it.
 *
 * @param[in] status Firmware lifecycle status.
 * @param[in] progress OTA progress percentage/state.
 * @param[in] version Target firmware version.
 * @param[in] job_id OTA job identifier.
 * @param[in] partition OTA/running partition label.
 * @param[in] error Optional firmware error code/string.
 */
void state_machine_publish_or_stage_firmware_status(const char *status,
                                                    uint8_t progress,
                                                    const char *version,
                                                    const char *job_id,
                                                    const char *partition,
                                                    const char *error) {
    // Publish firmware status immediately when possible, or stage it for the next connected window when MQTT is still down.
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

/**
 * @brief Flush one deferred firmware report once MQTT is connected again.
 */
void state_machine_try_flush_deferred_firmware_report(void) {
    if (!s_deferred_firmware_report_pending || !tracker_mqtt_is_connected() || s_ota_in_progress) {
        return;
    }

    state_machine_publish_firmware_payload(&s_deferred_firmware_report);
    s_deferred_firmware_report_pending = false;
}
