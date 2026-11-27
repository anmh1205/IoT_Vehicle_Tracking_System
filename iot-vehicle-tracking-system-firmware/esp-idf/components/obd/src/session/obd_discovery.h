#pragma once
#include "obd_session.h"

/* OBD task. Discover the service and characteristics and enable RX notifications. */
bool obd_discovery_configure(obd_session_t *session);
