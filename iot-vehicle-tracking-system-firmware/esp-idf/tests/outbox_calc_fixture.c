#include <assert.h>
#include "publish/publish.h"

int main(void)
{
    assert(app_outbox_pick_next_control_message(true, true, true, true) == APP_MSG_BOUNDARY);
    assert(app_outbox_pick_next_control_message(false, true, true, true) == APP_MSG_STATUS);
    assert(app_outbox_pick_next_control_message(false, false, true, true) == APP_MSG_FW);
    assert(app_outbox_pick_next_control_message(false, false, false, true) == APP_MSG_EVENT);
    assert(app_outbox_pick_next_control_message(false, false, false, false) == APP_MSG_NONE);
}
