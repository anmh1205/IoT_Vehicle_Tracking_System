/**
 * @file src/device/app_link.c
 * @brief Last observed modem and broker availability for app policy.
 *
 * Dispatch and the sleep controller update the app-task snapshot. Publishing and runtime
 * use it to gate connection-sensitive operations. The modem owns the live connection and
 * reports its state separately.
 */
#include "device/device.h"

/* The app task owns this snapshot. Dispatch samples the modem state separately. */
static ivts_link_t s_link;

bool app_link_update(ivts_link_t link)
{
    if (s_link == link) { return false; }
    s_link = link;
    return true;
}

bool app_link_is_broker_up(void)
{
    return s_link == IVTS_LINK_BROKER_UP;
}
