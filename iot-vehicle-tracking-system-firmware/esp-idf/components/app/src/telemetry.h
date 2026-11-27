#pragma once
#include "ivts_core/event/event.h"
#include "ivts_core/fsm/axes.h"
#include "ivts_core/model/telemetry.h"
#include "ivts_core/model/record.h"

/* App task. Apply incoming measurements and refresh freshness before reading the snapshot. */
void app_telemetry_on_event(const ivts_event_t *event);
void app_telemetry_set_axes(const ivts_axes_t *axes);
void app_telemetry_refresh(uint64_t now_ms);
/* App task. Borrow the current snapshot without mutating it. */
const ivts_telemetry_t *app_telemetry_view(void);
void app_telemetry_set_device(ivts_device_state_t device, ivts_sleep_mode_t sleep);
void app_telemetry_consume_imu_peak(void);

/* App task. Capture the current telemetry and allocate its sequence. May read the RTC. */
void app_record_capture(ivts_record_t *record);
