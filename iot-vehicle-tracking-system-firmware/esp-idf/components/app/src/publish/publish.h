/**
 * @file publish.h
 * @brief Private app-task publish, replay and control-message interfaces.
 *
 * One modem transaction can be outstanding. Registered ACK handlers run on the
 * app task and own their message-specific durable state changes.
 */
#pragma once
#include <stdbool.h>
#include "ivts_core/event/event.h"
#include "modem/modem.h"
#include "ivts_core/model/record.h"
#include "ivts_core/model/session.h"

/* The modem accepts one outstanding message. Keep its kind with the transaction ID. */
typedef enum {
    APP_MSG_NONE = 0,
    APP_MSG_RAW_LIVE,     /**< Live telemetry sample. */
    APP_MSG_RAW_REPLAY,   /**< Record read from the offline queue. */
    APP_MSG_LOCATION,     /**< Location requested by a cloud command. */
    APP_MSG_STATUS,       /**< Periodic device status. */
    APP_MSG_BOUNDARY,     /**< Session-open or session-close boundary retained in NVS. */
    APP_MSG_EVENT,        /**< Single device event, such as config_corrupt. */
    APP_MSG_ALARM,        /**< Motion alarm retained in NVS. */
    APP_MSG_FW,           /**< Firmware or OTA status report. */
    APP_MSG_CMD_ACK,      /**< Acknowledgement of a cloud command. */
    APP_MSG_COUNT,
} app_msg_kind_t;

typedef void (*app_msg_ack_fn)(bool ok);

/* Install the ACK table at boot. Handlers run in the app task. */
void app_publisher_set_ack_handlers(const app_msg_ack_fn handlers[APP_MSG_COUNT]);

/* App task. Copy a payload to the modem when the slot is available. */
bool app_publisher_send(app_msg_kind_t kind, modem_topic_t topic, const char *payload, size_t len);
/** @brief Report whether the single publish slot still has an outstanding result. */
bool app_publisher_is_busy(void);
void app_publisher_on_ack(const ivts_event_t *event);
/** @brief Recover the most recent modem ACK if its queue event was dropped. */
void app_publisher_poll(void);

/* App task. Build and send a live record, or spool it to SD. */
void app_messages_publish_live_record(void);
bool app_messages_publish_replay_record(const ivts_record_t *record);
bool app_messages_publish_status(bool heartbeat);
uint64_t app_messages_publish_session_boundary(const ivts_session_boundary_t *boundary);
bool app_messages_publish_event(const char *event_code);
void app_messages_publish_motion_alarm(const ivts_motion_alarm_t *alarm);
void app_messages_publish_fw_report(void);
bool app_messages_publish_command_ack(const char *command_id, const char *status, const char *response);
bool app_messages_publish_location(void);
/* App task ACK handler. Queue the live record if its publish failed. */
void app_messages_on_live_ack(bool ok);

/* App task ACK callbacks registered by boot wiring. */
void app_outbox_on_status_ack(bool ok);
void app_outbox_on_boundary_ack(bool ok);
void app_outbox_on_event_ack(bool ok);
/* App task. Record control messages that need publishing. */
void app_outbox_request_status(void);
void app_outbox_request_event(const char *event_code);
bool app_outbox_has_unsent_control(void);
/* App task. Publish control messages in priority order. */
void app_outbox_tick(bool heartbeat);

/* Choose the first pending control message after urgent firmware and alarm handling. */
app_msg_kind_t app_outbox_pick_next_control_message(bool boundary, bool status, bool firmware, bool event);

typedef enum {
    REPLAY_BUSY,                   /* Waiting on an older RAW record or outstanding SD operation. */
    REPLAY_DONE_BEFORE_BOUNDARY,   /* The next SD record follows the requested boundary. */
    REPLAY_EMPTY,
} app_replay_result_t;

/* App task. Issue the next peek or send when the modem slot is free. */
void app_replay_tick(void);
/** @brief Deliver older RAW records first, stopping at a supplied boundary or at an empty queue. */
app_replay_result_t app_replay_until(const ivts_session_boundary_t *boundary);
/** @brief Queue a token-checked pop after a successful replay acknowledgement. */
void app_replay_on_ack(bool ok);
/** @brief Release the outstanding peek wait after storage has filled its slot. */
void app_replay_on_queue_ready(void);
