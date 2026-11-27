/**
 * @file src/device/gnss_arbiter.c
 * @brief Reconciliation of FSM and command demands for GNSS power.
 *
 * The app task runs this arbiter when applying FSM effects. It combines retained FSM demand
 * with current command demand. A rejected request can be retried on the next pass. The modem
 * owns actual GNSS power and fix acquisition.
 */
#include "device/device.h"
#include "ivts_core/fsm/fsm.h"
#include "modem/modem.h"

/* The app task owns both demand flags. The modem flag records the last accepted request. */
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
