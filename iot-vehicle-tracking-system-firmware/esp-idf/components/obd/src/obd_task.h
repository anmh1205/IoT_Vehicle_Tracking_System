#pragma once
#include "ble/obd_ble_events.h"
#include "ivts_core/base/err.h"
#include "session/obd_session.h"

#define OBD_BLE_WAIT_ANY  0xffu
#define OBD_BLE_WAIT_NONE 0xfeu

/* Lifecycle and flags shared with the app task. */
int obd_task_start(void);
ivts_err_t obd_task_set_enabled(bool enabled);
bool obd_task_is_enabled(void);
/* Nonblocking post from the NimBLE host; only the OBD task receives. */
bool obd_task_post(const obd_ble_event_t *event);
bool obd_task_wait_event(obd_session_t *session, uint8_t want, uint32_t timeout_ms, obd_ble_event_t *out);
