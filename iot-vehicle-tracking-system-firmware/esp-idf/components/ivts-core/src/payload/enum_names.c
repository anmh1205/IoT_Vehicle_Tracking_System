#include "enum_names.h"

const char *ivts_payload_ignition_name(uint8_t v)
{
    return v == IVTS_IGN_ON ? "ON" : v == IVTS_IGN_OFF ? "OFF" : "UNKNOWN";
}
const char *ivts_payload_motion_name(uint8_t v)
{
    return v == IVTS_MOTION_MOVING ? "MOVING" : v == IVTS_MOTION_STATIONARY ? "STATIONARY" : "UNKNOWN";
}
const char *ivts_payload_vehicle_name(uint8_t v)
{
    switch (v) {
    case IVTS_VEH_PARKED_OFF:         return "PARKED_OFF";
    case IVTS_VEH_ROLLING_IGN_OFF:    return "ROLLING_IGN_OFF";
    case IVTS_VEH_IDLING_ON:          return "IDLING_ON";
    case IVTS_VEH_MOVING_ON:          return "MOVING_ON";
    case IVTS_VEH_UNKNOWN_STATIONARY: return "UNKNOWN_STATIONARY";
    case IVTS_VEH_UNKNOWN_MOVING:     return "UNKNOWN_MOVING";
    default:                          return "UNKNOWN";
    }
}
const char *ivts_payload_device_name(ivts_device_state_t s)
{
    switch (s) {
    case IVTS_DEV_BOOTING:       return "BOOTING";
    case IVTS_DEV_ACTIVE:        return "ACTIVE";
    case IVTS_DEV_SLEEP_PREPARE: return "SLEEP_PREPARE";
    case IVTS_DEV_SLEEPING:      return "SLEEPING";
    case IVTS_DEV_WAKING:        return "WAKING";
    case IVTS_DEV_ALARM:         return "ALARM";
    case IVTS_DEV_OTA:           return "OTA";
    case IVTS_DEV_FAULT:         return "FAULT";
    }
    return "FAULT";
}

const char *ivts_payload_ecu_name(ivts_ecu_state_t e)
{
    switch (e) {
    case IVTS_ECU_DISCONNECTED: return "disconnected";
    case IVTS_ECU_LIVE:         return "live";
    case IVTS_ECU_STOPPED:      return "stopped";
    case IVTS_ECU_NO_DATA:      return "no_data";
    case IVTS_ECU_UNKNOWN:      break;
    }
    return "unknown";
}

const char *ivts_payload_sleep_name(uint8_t s)
{
    switch (s) {
    case IVTS_SLEEP_FAKE:  return "FAKE";
    case IVTS_SLEEP_LIGHT: return "LIGHT";
    case IVTS_SLEEP_DEEP:  return "DEEP";
    default:               return "NONE";
    }
}
