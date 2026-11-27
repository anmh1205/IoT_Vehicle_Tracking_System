#include "app_link.h"

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
