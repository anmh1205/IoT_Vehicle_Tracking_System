#include "fsm_actions.h"
#include "app_dispatch.h"
#include "command/command.h"
#include "device/app_device.h"
#include "obd/obd.h"
#include "power/gnss_arbiter.h"
#include "power/sleep_controller.h"
#include "publish/messages.h"
#include "publish/outbox.h"
#include "publish/replay.h"

void app_fsm_actions_execute(const ivts_fsm_out_t *o, ivts_fsm_t *fsm, ivts_axes_t *axes,
                             const ivts_axes_cfg_t *axes_cfg)
{
    app_gnss_arbiter_apply(o->actions, app_cmd_needs_gnss());
    if (o->actions & IVTS_ACT_OBD_START) { (void)obd_start(); }
    if (o->actions & IVTS_ACT_OBD_STOP)  { (void)obd_stop(); }
    if (o->actions & IVTS_ACT_PUBLISH_STATUS) { app_outbox_request_status(); }
    if (o->actions & IVTS_ACT_SLEEP) {
        app_sleep_enter(o, fsm, axes, axes_cfg, app_dispatch_next);
        return;
    }
    app_outbox_tick(fsm->state == IVTS_ST_HEARTBEAT || !app_device_tracking_enabled());
    if ((o->actions & IVTS_ACT_PUBLISH_RAW) &&
        (fsm->state != IVTS_ST_DRIVING || app_device_tracking_enabled())) {
        app_messages_publish_live_record();
    }
    if (o->actions & IVTS_ACT_REPLAY) { app_replay_tick(); }
}
