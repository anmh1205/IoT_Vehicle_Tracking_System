/**
 * @file gnss_arbiter.c
 * @brief Reconciliation of FSM and command demands for GNSS power.
 *
 * The app task combines persistent FSM demand with temporary command demand
 * and sends a modem request only when the requested state changes.
 */
#include "device/device.h"
#include "ivts_core/fsm/fsm.h"
#include "modem/modem.h"

static bool s_fsm_requests_gnss;
static bool s_modem_requests_gnss;

void app_gnss_arbiter_apply(uint32_t actions, bool command_requests_gnss)
{
    if (actions & IVTS_ACT_GNSS_ON) { s_fsm_requests_gnss = true; }
    if (actions & IVTS_ACT_GNSS_OFF) { s_fsm_requests_gnss = false; }
    bool wanted = s_fsm_requests_gnss || command_requests_gnss;
    if (wanted != s_modem_requests_gnss && modem_set_gnss(wanted) == IVTS_OK) {
        s_modem_requests_gnss = wanted;
    }
}
