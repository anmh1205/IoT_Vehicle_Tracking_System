#pragma once
#include "session/obd_session.h"

/* OBD task. Probe the ECU and publish one round of decoded live PIDs. */
bool obd_poll_sample(obd_session_t *session);
