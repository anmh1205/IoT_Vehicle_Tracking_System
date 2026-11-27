#pragma once
#include "ivts_core/model/record.h"
#include "ivts_core/model/session.h"
#include "ivts_core/event/event.h"

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
