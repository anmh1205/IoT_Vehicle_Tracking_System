/**
 * @file fsm_actions.c
 * @brief Application effects requested by the platform-independent FSM.
 *
 * The app task applies actions to the board, modem, OBD and publishing
 * services in the established order.
 */
#include "runtime/runtime.h"
#include "command/command.h"
#include "device/device.h"
#include "obd/obd.h"
#include "power/power.h"
#include "publish/publish.h"

void app_fsm_actions_execute(const ivts_fsm_out_t *o, ivts_fsm_t *fsm, ivts_axes_t *axes,
                             const ivts_axes_cfg_t *axes_cfg)
{
    app_gnss_arbiter_apply(o->actions, app_cmd_needs_gnss());
    if (o->actions & IVTS_ACT_OBD_START) { (void)obd_start(); }
    if (o->actions & IVTS_ACT_OBD_STOP)  { (void)obd_stop(); }
    if (o->actions & IVTS_ACT_PUBLISH_STATUS) { app_outbox_request_status(); }
    if (o->actions & IVTS_ACT_SLEEP) {
        app_sleep_enter(o, fsm, axes, axes_cfg);
        return;
    }
    app_outbox_tick(fsm->state == IVTS_ST_HEARTBEAT || !app_device_tracking_enabled());
    if ((o->actions & IVTS_ACT_PUBLISH_RAW) &&
        (fsm->state != IVTS_ST_DRIVING || app_device_tracking_enabled())) {
        app_messages_publish_live_record();
    }
    if (o->actions & IVTS_ACT_REPLAY) { app_replay_tick(); }
}
