/**
 * @file src/payload/payload_common.c
 * @brief Common MQTT JSON fields, escaping and stable wire enum names.
 *
 * RAW and control builders share metadata, wire names and session fields.
 * All writes use each caller's local writer, and returned names are immutable.
 * The app supplies device identity and time and owns publication and retries.
 */
#include "payload/payload_internal.h"

/* Immutable digit table shared by all caller tasks. */
static const char s_hex[] = "0123456789abcdef";

void ivts_boot_id_format(char out[IVTS_BOOT_ID_SIZE], uint32_t boot_id)
{
    for (unsigned i = 0; i < 8u; i++) {
        out[i] = s_hex[(boot_id >> (28u - 4u * i)) & 0xfu];
    }
    out[8] = '\0';
}

void ivts_msg_id_format(char out[IVTS_MSG_ID_SIZE], const char *device_id, uint32_t boot_id, uint32_t seq)
{
    uint64_t hash = UINT64_C(14695981039346656037);
    for (const unsigned char *p = (const unsigned char *)device_id; *p != 0u; p++) {
        hash = (hash ^ *p) * UINT64_C(1099511628211);
    }

    /* The UUIDv8 identity uses 32 bits each for boot ID and sequence and 58 bits for device identity. */
    uint8_t bytes[] = {
        (uint8_t)(boot_id >> 24), (uint8_t)(boot_id >> 16), (uint8_t)(boot_id >> 8), (uint8_t)boot_id,
        (uint8_t)(seq >> 24), (uint8_t)(seq >> 16),
        (uint8_t)(0x80u | ((hash >> 56) & 0x0fu)), (uint8_t)(hash >> 48),
        (uint8_t)(0x80u | ((hash >> 40) & 0x3fu)), (uint8_t)(hash >> 32), (uint8_t)(hash >> 24),
        (uint8_t)(hash >> 16), (uint8_t)(hash >> 8), (uint8_t)hash,
        (uint8_t)(seq >> 8), (uint8_t)seq
    };
    size_t pos = 0;
    for (size_t i = 0; i < sizeof bytes; i++) {
        if (i == 4u || i == 6u || i == 8u || i == 10u) { out[pos++] = '-'; }
        out[pos++] = s_hex[bytes[i] >> 4];
        out[pos++] = s_hex[bytes[i] & 0x0fu];
    }
    out[pos] = '\0';
}

void ivts_payload_write_header(ivts_jw_t *w, const ivts_msg_meta_t *m, const char *schema)
{
    char id[IVTS_MSG_ID_SIZE], boot[IVTS_BOOT_ID_SIZE];
    ivts_msg_id_format(id, m->device_id, m->boot_id, m->seq);
    ivts_boot_id_format(boot, m->boot_id);
    bool trusted = m->time_trusted && m->sent_unix_ms != 0u;
    uint64_t timestamp = trusted ? m->sent_unix_ms : m->uptime_ms;
    if (timestamp == 0u) { timestamp = 1u; }

    ivts_jw_obj_begin(w, NULL);
    ivts_jw_str(w, "device_id", m->device_id);
    if (m->auth_token != NULL) { ivts_jw_str(w, "auth_token", m->auth_token); }
    ivts_jw_uint(w, "timestamp", timestamp);
    ivts_jw_bool(w, "timestamp_trusted", trusted);
    ivts_jw_obj_begin(w, "metadata");
    ivts_jw_str(w, "schema_version", schema);
    ivts_jw_str(w, "message_id", id);
    ivts_jw_str(w, "boot_id", boot);
    ivts_jw_uint(w, "seq_no", m->seq);
    ivts_jw_uint(w, "sent_at", timestamp);
    ivts_jw_obj_end(w);
}

void ivts_payload_write_session(ivts_jw_t *w, const ivts_session_id_t *session)
{
    if (session == NULL || session->local_key == 0u) { return; }
    char boot[IVTS_BOOT_ID_SIZE];
    ivts_boot_id_format(boot, session->boot_id);
    ivts_jw_str(w, "boot_id", boot);
    ivts_jw_uint(w, "local_session_key", session->local_key);
    /* The wire format carries canonical IDs as decimal strings. */
    if (session->canonical_id != 0u) {
        char id[21];
        size_t pos = sizeof id - 1u;
        id[pos] = '\0';
        uint64_t n = session->canonical_id;
        do {
            id[--pos] = (char)('0' + n % 10u);
            n /= 10u;
        } while (n != 0u);
        ivts_jw_str(w, "canonical_session_id", &id[pos]);
    }
}

void ivts_payload_write_state(ivts_jw_t *w, uint8_t ign, uint8_t motion, uint8_t vehicle, uint8_t device, uint8_t sleep)
{
    ivts_jw_obj_begin(w, "state");
    ivts_jw_str(w, "ignition_state", ivts_payload_ignition_name(ign));
    ivts_jw_str(w, "motion_state", ivts_payload_motion_name(motion));
    ivts_jw_str(w, "vehicle_state", ivts_payload_vehicle_name(vehicle));
    ivts_jw_str(w, "device_state", ivts_payload_device_name((ivts_device_state_t)device));
    ivts_jw_str(w, "sleep_mode", ivts_payload_sleep_name(sleep));
    ivts_jw_obj_end(w);
    if (device == IVTS_DEV_ALARM) {
        ivts_jw_arr_begin(w, "device_alerts");
        ivts_jw_obj_begin(w, NULL);
        ivts_jw_str(w, "code", "motion_while_ignition_off");
        ivts_jw_str(w, "severity", "high");
        ivts_jw_obj_end(w);
        ivts_jw_arr_end(w);
    }
}

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
