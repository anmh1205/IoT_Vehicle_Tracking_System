#pragma once
#include "ivts_core/event/event.h"

/* Load an unacknowledged alarm during boot. */
void app_alarm_restore(void);
/* App task. Latch and persist an alarm on the transition into ALARM. */
void app_alarm_latch(bool provisioned, uint32_t boot_id);
/* App task. Persist a newly latched alarm and return true when a send attempt is due. */
bool app_alarm_tick(void);
bool app_alarm_has_unsent(void);
const ivts_motion_alarm_t *app_alarm_view(void);
void app_alarm_on_ack(bool ok);
