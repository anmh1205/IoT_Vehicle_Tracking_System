#include "outbox_calc.h"

app_msg_kind_t app_outbox_pick_next_control_message(bool boundary, bool status, bool firmware, bool event)
{
    if (boundary) { return APP_MSG_BOUNDARY; }
    if (status) { return APP_MSG_STATUS; }
    if (firmware) { return APP_MSG_FW; }
    return event ? APP_MSG_EVENT : APP_MSG_NONE;
}
