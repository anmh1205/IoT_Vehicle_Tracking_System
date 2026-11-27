/**
 * @file src/event/event.c
 * @brief Stable names for typed cross-task events.
 *
 * These immutable names label the by-value event discriminators. Lookup is
 * stateless and borrows no buffers. The configured sink owns event delivery and
 * the app runtime owns queue consumption.
 */
#include "ivts_core/event/event.h"

const char *ivts_event_name(ivts_event_type_t t)
{
    switch (t) {
    case IVTS_EV_NONE:           return "NONE";
    case IVTS_EV_LINK_STATE:     return "LINK_STATE";
    case IVTS_EV_GNSS_FIX:       return "GNSS_FIX";
    case IVTS_EV_MQTT_ACK:       return "MQTT_ACK";
    case IVTS_EV_CMD_PENDING:    return "CMD_PENDING";
    case IVTS_EV_STORE_RESULT:   return "STORE_RESULT";
    case IVTS_EV_QUEUE_READY:    return "QUEUE_READY";
    case IVTS_EV_CONFIG_CORRUPT: return "CONFIG_CORRUPT";
    case IVTS_EV_OBD_LINK:       return "OBD_LINK";
    case IVTS_EV_OBD_SAMPLE:     return "OBD_SAMPLE";
    case IVTS_EV_OBD_DIAG_READY: return "OBD_DIAG_READY";
    case IVTS_EV_POWER_SAMPLE:   return "POWER_SAMPLE";
    case IVTS_EV_MOTION_IRQ:     return "MOTION_IRQ";
    case IVTS_EV_OTA_PROGRESS:   return "OTA_PROGRESS";
    case IVTS_EV_COUNT:          break;
    }
    return "UNKNOWN";
}
