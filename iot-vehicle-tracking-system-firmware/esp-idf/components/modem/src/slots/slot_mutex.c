#include "modem_slots.h"
#include "platform/platform.h"

static platform_mutex_t s_slot_mutex;

bool modem_slots_init(void)
{
    s_slot_mutex = platform_mutex_create();
    return s_slot_mutex != NULL;
}

void modem_slots_lock(void) { platform_mutex_lock(s_slot_mutex); }
void modem_slots_unlock(void) { platform_mutex_unlock(s_slot_mutex); }
