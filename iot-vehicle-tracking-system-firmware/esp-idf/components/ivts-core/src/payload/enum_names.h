#pragma once
#include "ivts_core/model/telemetry.h"

/* Payload spellings are part of the cloud contract. */
const char *ivts_payload_ignition_name(uint8_t value);
const char *ivts_payload_motion_name(uint8_t value);
const char *ivts_payload_vehicle_name(uint8_t value);
const char *ivts_payload_device_name(ivts_device_state_t value);
const char *ivts_payload_ecu_name(ivts_ecu_state_t value);
const char *ivts_payload_sleep_name(uint8_t value);
