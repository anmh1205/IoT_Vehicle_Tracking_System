/**
 * @file app_link.c
 * @brief Last observed modem and broker availability for app policy.
 *
 * Update link state on the app task. Callers use the broker-up result to gate
 * MQTT publishes and connection-sensitive operations.
 */
#include "device/device.h"

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
