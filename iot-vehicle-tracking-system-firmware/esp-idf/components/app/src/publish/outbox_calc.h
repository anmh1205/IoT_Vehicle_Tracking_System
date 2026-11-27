#pragma once
#include "publisher.h"

/* Choose the first pending control message after urgent firmware and alarm handling. */
app_msg_kind_t app_outbox_pick_next_control_message(bool boundary, bool status, bool firmware, bool event);
