#pragma once
#include "session/obd_session.h"

/* Create the copy mutex before starting the OBD task. */
bool obd_diag_init(void);
/* OBD task. Read readiness and DTCs, then publish the completed snapshot. */
bool obd_diag_poll(obd_session_t *session);
