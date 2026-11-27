#pragma once
#include "obd/obd.h"

#define OBD_TAG "obd"

/* Configuration is set at boot and read by the OBD task and BLE callbacks. */
const obd_cfg_t *obd_config(void);
void obd_emit(const ivts_event_t *event);
