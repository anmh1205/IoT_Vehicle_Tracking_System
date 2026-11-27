#pragma once
#include "ivts_core/model/record.h"

/* App task. Capture the current telemetry and allocate its sequence. May read the RTC. */
void app_record_capture(ivts_record_t *record);
