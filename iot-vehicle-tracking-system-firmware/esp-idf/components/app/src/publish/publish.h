/**
 * @file src/publish/publish.h
 * @brief Private app-task interfaces for publishing and offline replay.
 *
 * The app task owns one outstanding modem transaction and invokes registered ACK handlers on that task.
 * The modem copies payload bytes on submission. Storage owns SD mutation and authorizes a replay pop
 * with its peek token. Session, command and firmware modules own their durable records.
 */
#pragma once
#include <stdbool.h>
#include "ivts_core/event/event.h"
#include "modem/modem.h"
#include "ivts_core/model/record.h"
#include "ivts_core/model/session.h"

/** @brief Publish kind stored with the transaction ID for app-task ACK routing. */
typedef enum {
    APP_MSG_NONE = 0,     /**< No pending control message selected. */
    APP_MSG_RAW_LIVE,     /**< Live telemetry sample. */
    APP_MSG_RAW_REPLAY,   /**< Record read from the offline queue. */
    APP_MSG_LOCATION,     /**< Location requested by a cloud command. */
    APP_MSG_STATUS,       /**< Periodic device status. */
    APP_MSG_BOUNDARY,     /**< Session-open or session-close boundary retained in NVS. */
    APP_MSG_EVENT,        /**< Single device event, such as config_corrupt. */
    APP_MSG_ALARM,        /**< Motion alarm retained in NVS. */
    APP_MSG_FW,           /**< Firmware or OTA status report. */
    APP_MSG_CMD_ACK,      /**< Acknowledgement of a cloud command. */
    APP_MSG_COUNT,       /**< Number of publish kinds and ACK table entries. */
} app_msg_kind_t;

/**
 * @brief Apply the modem result for a publish kind.
 * @param ok True for success, false for failure.
 * @note Context: app task. Blocking: depends on the handler.
 */
typedef void (*app_msg_ack_fn)(bool ok);

/**
 * @brief Install the publish-result callback table.
 *
 * @param handlers Table of APP_MSG_COUNT entries borrowed for the firmware lifetime, or NULL to disable
 *     callbacks. A null entry has no handler. Valid callbacks run on the app task.
 *
 * @note Context: Startup task. Blocking: non-blocking.
 */
void app_publisher_set_ack_handlers(const app_msg_ack_fn handlers[APP_MSG_COUNT]);

/**
 * @brief Submit a payload to the modem publish slot.
 *
 * The modem copies the bytes before return. The publisher reserves its slot until the matching result
 * arrives.
 *
 * @param kind Message kind above APP_MSG_NONE and below APP_MSG_COUNT, used for ACK routing.
 * @param topic Modem topic identifier from zero through MODEM_TOPIC_COUNT minus one.
 * @param payload Non-null payload containing at least len readable bytes.
 * @param len Number of payload bytes, from 1 through MODEM_PAYLOAD_MAX.
 * @retval true when the modem accepts the payload.
 * @retval false if the broker is down, the app slot is occupied or submission fails.
 *
 * @note Context: App task. Blocking: may wait on the modem slot mutex without a timeout. MQTT completion is
 * asynchronous.
 */
bool app_publisher_send(app_msg_kind_t kind, modem_topic_t topic, const char *payload, size_t len);
/**
 * @brief Check whether the app publish slot awaits a result.
 *
 * @retval true when a transaction is outstanding.
 * @retval false when no transaction is outstanding.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool app_publisher_is_busy(void);
/**
 * @brief Route a matching modem publish result to its registered handler.
 *
 * Release the app slot before invoking the handler. Ignore stale or duplicate transaction results.
 *
 * @param event Non-null MQTT ACK event borrowed for the call.
 *
 * @note Context: App task. Blocking: inherits the callback's waits, including possible synchronous NVS
 * access.
 */
void app_publisher_on_ack(const ivts_event_t *event);
/**
 * @brief Recover the modem publish result if its queue notification is lost.
 *
 * Read only the result for the in-flight transaction and apply the same dispatch as for the event.
 *
 * @note Context: App task. Blocking: may wait on the modem slot mutex and on the matching callback's
 * operations.
 */
void app_publisher_poll(void);

/**
 * @brief Capture and route a live RAW record.
 *
 * Consume the IMU peak at capture. Submit directly only with no pending boundary or offline backlog.
 * Otherwise
 * queue the encoded record for SD. A failed live ACK uses the same captured identity for fallback.
 *
 * @note Context: App task. Blocking: up to two RTC reads, each with a 100 ms I2C lock timeout and a 50 ms
 * transfer timeout, plus storage or modem mutex waits.
 */
void app_messages_publish_live_record(void);
/**
 * @brief Submit stored telemetry using its original message identity.
 *
 * Build the payload from the stored record and current device credentials.
 *
 * @param record Non-null decoded RAW record borrowed for encoding.
 * @retval true when the modem accepts the payload.
 * @retval false when encoding or submission fails.
 *
 * @note Context: App task. Blocking: may wait on the modem slot mutex without a timeout. MQTT completion is
 * asynchronous.
 */
bool app_messages_publish_replay_record(const ivts_record_t *record);
/**
 * @brief Submit a status snapshot with a fresh message sequence.
 *
 * @param heartbeat True to set the payload status to heartbeat.
 * @retval true when the modem accepts the payload.
 * @retval false when encoding or submission fails.
 *
 * @note Context: App task. Blocking: up to two RTC reads, each with a 100 ms I2C lock timeout and a 50 ms
 * transfer timeout, plus a modem slot mutex wait.
 */
bool app_messages_publish_status(bool heartbeat);
/**
 * @brief Attempt to submit a durable session boundary as status.
 *
 * Use the boundary's stored message identity and time on each attempt.
 *
 * @param boundary Non-null open or close boundary borrowed for encoding.
 * @return Monotonic time in milliseconds sampled after encoding and before submission, even if the attempt
 *     fails.
 *
 * @note Context: App task. Blocking: may wait on the modem slot mutex without a timeout. MQTT completion is
 * asynchronous.
 */
uint64_t app_messages_publish_session_boundary(const ivts_session_boundary_t *boundary);
/**
 * @brief Submit a warning event with a fresh message sequence.
 *
 * @param event_code NUL-terminated event message borrowed for encoding, or NULL to omit it.
 * @retval true when the modem accepts the payload.
 * @retval false when encoding or submission fails.
 *
 * @note Context: App task. Blocking: up to two RTC reads, each with a 100 ms I2C lock timeout and a 50 ms
 * transfer timeout, plus a modem slot mutex wait.
 */
bool app_messages_publish_event(const char *event_code);
/**
 * @brief Attempt to submit a motion event with its retained identity.
 *
 * @param alarm Non-null pending alarm borrowed for encoding. Its boot ID, sequence and timestamps are reused.
 *
 * @note Context: App task. Blocking: may wait on the modem slot mutex without a timeout. MQTT completion is
 * asynchronous.
 */
void app_messages_publish_motion_alarm(const ivts_motion_alarm_t *alarm);
/**
 * @brief Submit the current firmware report with a fresh message sequence.
 *
 * Clear the pending submission flag only if the modem accepts the report.
 *
 * @note Context: App task. Blocking: up to two RTC reads, each with a 100 ms I2C lock timeout and a 50 ms
 * transfer timeout, plus a modem slot mutex wait.
 */
void app_messages_publish_fw_report(void);
/**
 * @brief Submit the application result of a cloud command.
 *
 * @param command_id Non-null, NUL-terminated ID of the completed command, borrowed for encoding.
 * @param status Non-null, NUL-terminated result status, borrowed for encoding.
 * @param response Optional NUL-terminated failure reason, borrowed for encoding. NULL omits the field.
 * @retval true when the modem accepts the ACK payload.
 * @retval false when encoding or submission fails.
 *
 * @note Context: App task. Blocking: may wait on the modem slot mutex without a timeout. MQTT completion is
 * asynchronous.
 */
bool app_messages_publish_command_ack(const char *command_id, const char *status, const char *response);
/**
 * @brief Attempt to submit current position as a RAW location response.
 *
 * Require a valid fix, no pending boundary, an idle publisher and the broker link. Once captured, the record
 * consumes the IMU peak even if submission fails. This path has no offline fallback.
 *
 * @retval true when the modem accepts the location payload.
 * @retval false if a prerequisite, encoding or submission fails.
 *
 * @note Context: App task. Blocking: up to two RTC reads, each with a 100 ms I2C lock timeout and a 50 ms
 * transfer timeout, plus a modem slot mutex wait.
 */
bool app_messages_publish_location(void);
/**
 * @brief Queue the captured live record for SD after a failed publish.
 *
 * The storage request owns a copy of the encoded bytes on acceptance. A successful result needs no SD write.
 *
 * @param ok True for a successful modem publish result, false for failure.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_messages_on_live_ack(bool ok);

/**
 * @brief Apply the modem result for a status publish.
 *
 * A successful result counts toward OTA health. A failed result marks status pending again.
 *
 * @param ok True for a successful modem publish result, false for failure.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_outbox_on_status_ack(bool ok);
/**
 * @brief Process delivery of the oldest session boundary.
 *
 * A successful result counts toward OTA health and attempts durable removal. Clear the retry deadline only
 * after removal succeeds. Publish failure leaves the boundary and retry deadline as they are.
 *
 * @param ok True for a successful modem publish result, false for failure.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
void app_outbox_on_boundary_ack(bool ok);
/**
 * @brief Requeue an event after a failed publish result.
 *
 * A failure marks the current event buffer pending again. Success leaves pending state unchanged.
 *
 * @param ok True for a successful modem publish result, false for failure.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_outbox_on_event_ack(bool ok);
/**
 * @brief Mark the latest status for publishing.
 *
 * Multiple requests coalesce into a single pending status.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_outbox_request_status(void);
/**
 * @brief Replace the pending event text and mark it for publishing.
 *
 * @param event_code Non-null NUL-terminated message copied into a 32-byte buffer including NUL.
 *     Longer inputs are truncated to 31 bytes.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_outbox_request_event(const char *event_code);
/**
 * @brief Check whether the app counts control work as pending.
 *
 * @retval true when status, a boundary, firmware reporting or a motion alarm is pending.
 * @retval false when none of those are pending. Event and command ACK state are outside this check.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool app_outbox_has_unsent_control(void);
/**
 * @brief Service pending control messages in priority order.
 *
 * Try urgent firmware reporting before alarms. Order the remaining work by boundary, status, firmware and
 * event.
 * A boundary waits for preceding RAW records and its retry timer.
 *
 * @param heartbeat True to format a pending status as a heartbeat.
 *
 * @note Context: App task. Blocking: may wait on NVS, the RTC and adapter slot mutexes. MQTT and SD
 * operations run on their workers.
 */
void app_outbox_tick(bool heartbeat);

/**
 * @brief Choose the highest-priority ordinary control message.
 *
 * The caller handles urgent firmware reports and alarms separately.
 *
 * @param boundary True when a session boundary is pending.
 * @param status True when device status is pending.
 * @param firmware True when a firmware report is pending.
 * @param event True when an event is pending.
 * @return First pending kind in boundary, status, firmware, event order, or APP_MSG_NONE.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
app_msg_kind_t app_outbox_pick_next_control_message(bool boundary, bool status, bool firmware, bool event);

/** @brief Progress of the app task as it drains RAW records up to an optional boundary. */
typedef enum {
    REPLAY_BUSY,                   /**< A record or pending storage operation still blocks progress. */
    REPLAY_DONE_BEFORE_BOUNDARY,   /**< The head record does not precede the boundary. */
    REPLAY_EMPTY,                  /**< No queued record and no pending push. */
} app_replay_result_t;

/**
 * @brief Advance offline replay while the broker and publish slot are available.
 *
 * Leave replay to boundary scheduling while a boundary is pending.
 *
 * @note Context: App task. Blocking: may wait on the storage peek or modem slot mutex without a timeout. SD
 * work runs on the storage task.
 */
void app_replay_tick(void);
/**
 * @brief Service offline RAW replay up to an optional session boundary.
 *
 * Use the cached head or request a peek, retrying an outstanding peek after 5000 ms. Request removal for an
 * undecodable entry. Request removal of a submitted record only after a successful publish result.
 *
 * @param boundary Non-null boundary to compare against, borrowed for this call, or NULL for ordinary replay.
 * @return REPLAY_BUSY while work remains, REPLAY_DONE_BEFORE_BOUNDARY when the head does not precede the
 *     boundary, or REPLAY_EMPTY when no record or push is pending.
 *
 * @note Context: App task. Blocking: may wait on the storage peek or modem slot mutex without a timeout. SD
 * work runs on the storage task.
 */
app_replay_result_t app_replay_until(const ivts_session_boundary_t *boundary);
/**
 * @brief Request removal of the replayed record after successful delivery.
 *
 * Use the peek token to identify the head. A failed publish or a rejected pop request leaves the record
 * available for another publish attempt.
 *
 * @param ok True for a successful modem publish result, false for failure.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_replay_on_ack(bool ok);
/**
 * @brief Clear the outstanding peek wait when storage reports a ready slot.
 *
 * The next replay iteration copies the slot separately.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_replay_on_queue_ready(void);
