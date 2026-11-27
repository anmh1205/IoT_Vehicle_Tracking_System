#include "ivts_core/payload/payload.h"
#include "ivts_core/payload/json_writer.h"
#include "ivts_core/ota/contract.h"

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

    /* UUIDv8: giữ đủ 32 bit của boot và seq, dành 58 bit cho định danh thiết bị. */
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

static const char *ign_name(uint8_t v)
{
    return v == IVTS_IGN_ON ? "ON" : v == IVTS_IGN_OFF ? "OFF" : "UNKNOWN";
}
static const char *motion_name(uint8_t v)
{
    return v == IVTS_MOTION_MOVING ? "MOVING" : v == IVTS_MOTION_STATIONARY ? "STATIONARY" : "UNKNOWN";
}
static const char *vehicle_name(uint8_t v)
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
static const char *device_state_name(ivts_device_state_t s)
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

static const char *ecu_name(ivts_ecu_state_t e)
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

static const char *sleep_name(uint8_t s)
{
    switch (s) {
    case IVTS_SLEEP_FAKE:  return "FAKE";
    case IVTS_SLEEP_LIGHT: return "LIGHT";
    case IVTS_SLEEP_DEEP:  return "DEEP";
    default:               return "NONE";
    }
}

static void head(ivts_jw_t *w, const ivts_msg_meta_t *m, const char *schema)
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

static void session_fields(ivts_jw_t *w, const ivts_session_id_t *session)
{
    if (session == NULL || session->local_key == 0u) { return; }
    char boot[IVTS_BOOT_ID_SIZE];
    ivts_boot_id_format(boot, session->boot_id);
    ivts_jw_str(w, "boot_id", boot);
    ivts_jw_uint(w, "local_session_key", session->local_key);
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

static void state_obj(ivts_jw_t *w, uint8_t ign, uint8_t motion, uint8_t vehicle, uint8_t device, uint8_t sleep)
{
    ivts_jw_obj_begin(w, "state");
    ivts_jw_str(w, "ignition_state", ign_name(ign));
    ivts_jw_str(w, "motion_state", motion_name(motion));
    ivts_jw_str(w, "vehicle_state", vehicle_name(vehicle));
    ivts_jw_str(w, "device_state", device_state_name((ivts_device_state_t)device));
    ivts_jw_str(w, "sleep_mode", sleep_name(sleep));
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

static void dtc_arr(ivts_jw_t *w, const char *key, const ivts_dtc_list_t *d)
{
    if (!d->valid) { return; }
    ivts_jw_arr_begin(w, key);
    for (uint8_t i = 0; i < d->count && i < IVTS_DTC_MAX_CODES; i++) {
        ivts_jw_str(w, NULL, d->codes[i]);
    }
    ivts_jw_arr_end(w);
}

static void signals_obj(ivts_jw_t *w, const ivts_obd_sample_t *o)
{
    if (o->valid_mask == 0u) { return; }
    ivts_jw_obj_begin(w, "signals");
    if (o->valid_mask & IVTS_OBD_HAS_RPM)     { ivts_jw_uint(w, "rpm", o->rpm); }
    if (o->valid_mask & IVTS_OBD_HAS_SPEED)   { ivts_jw_uint(w, "obd_speed_kph", o->speed_kmh); }
    if (o->valid_mask & IVTS_OBD_HAS_COOLANT) { ivts_jw_int(w, "coolant_c", o->coolant_c); }
    if (o->valid_mask & IVTS_OBD_HAS_FUEL)    { ivts_jw_uint(w, "fuel_level_pct", o->fuel_pct); }
    if (o->valid_mask & IVTS_OBD_HAS_LOAD)    { ivts_jw_uint(w, "engine_load_pct", o->load_pct); }
    ivts_jw_obj_end(w);
}

static void readiness_obj(ivts_jw_t *w, const ivts_obd_readiness_t *r)
{
    ivts_jw_bool(w, "mil_on", r->mil_on);
    ivts_jw_uint(w, "reported_dtc_count", r->reported_dtc_count);
    const struct { const char *key; ivts_monitor_status_t value; } monitors[] = {
        { "misfire", r->misfire },
        { "fuel_system", r->fuel_system },
        { "comprehensive_components", r->comprehensive_components },
        { "catalyst", r->catalyst },
        { "heated_catalyst", r->heated_catalyst },
        { "evaporative_system", r->evaporative_system },
        { "secondary_air_system", r->secondary_air_system },
        { "ac_refrigerant", r->ac_refrigerant },
        { "oxygen_sensor", r->oxygen_sensor },
        { "oxygen_sensor_heater", r->oxygen_sensor_heater },
        { "egr_vvt_system", r->egr_vvt_system },
        { "nmhc_catalyst", r->nmhc_catalyst },
        { "nox_aftertreatment", r->nox_aftertreatment },
        { "boost_pressure", r->boost_pressure },
        { "exhaust_gas_sensor", r->exhaust_gas_sensor },
        { "pm_filter", r->pm_filter },
    };
    static const char *const status[] = {
        [IVTS_MON_UNKNOWN] = NULL, [IVTS_MON_COMPLETE] = "complete",
        [IVTS_MON_INCOMPLETE] = "incomplete", [IVTS_MON_UNSUPPORTED] = "unsupported",
    };
    ivts_jw_obj_begin(w, "readiness");
    for (size_t i = 0; i < sizeof monitors / sizeof monitors[0]; i++) {
        unsigned value = (unsigned)monitors[i].value;
        if (value > IVTS_MON_UNKNOWN && value < sizeof status / sizeof status[0]) {
            ivts_jw_str(w, monitors[i].key, status[value]);
        }
    }
    ivts_jw_obj_end(w);
}

static void live_diagnostics(ivts_jw_t *w, const ivts_telemetry_t *t)
{
    if (t == NULL) { return; }
    ivts_jw_obj_begin(w, "channel");
    ivts_jw_bool(w, "ble_obd_connected", t->obd_ble_connected);
    ivts_jw_bool(w, "elm_ready", t->obd_elm_ready);
    ivts_jw_str(w, "ecu_state", ecu_name(t->obd_ecu_state));
    ivts_jw_obj_end(w);
    ivts_jw_obj_begin(w, "quality");
    ivts_jw_uint(w, "sample_age_ms", t->obd_sample_age_ms);
    ivts_jw_obj_end(w);
    if (t->obd_readiness.valid) {
        readiness_obj(w, &t->obd_readiness);
    }
    if (t->dtc_stored.valid || t->dtc_pending.valid || t->dtc_permanent.valid) {
        ivts_jw_obj_begin(w, "dtc");
        dtc_arr(w, "stored", &t->dtc_stored);
        dtc_arr(w, "pending", &t->dtc_pending);
        dtc_arr(w, "permanent", &t->dtc_permanent);
        ivts_jw_obj_end(w);
    }
}

ivts_err_t ivts_payload_rawdata(const ivts_msg_meta_t *m, const ivts_record_t *r,
                                const ivts_telemetry_t *live, char *buf, size_t cap, size_t *len)
{
    if (m == NULL || m->device_id == NULL || r == NULL) { return IVTS_ERR_INVALID_ARG; }
    ivts_msg_meta_t capture = *m;
    capture.boot_id = r->boot_id;
    capture.seq = r->seq;
    capture.sent_unix_ms = r->captured_unix_ms;
    capture.time_trusted = r->captured_unix_ms != 0u;
    capture.uptime_ms = r->uptime_ms;
    ivts_jw_t w;
    ivts_jw_init(&w, buf, cap);
    head(&w, &capture, "v2.0.0");
    ivts_jw_uint(&w, "uptime", r->uptime_ms);
    session_fields(&w, &r->session);
    ivts_jw_obj_begin(&w, "data");
    ivts_jw_fixed(&w, "imu_accel_delta_mps2", r->imu_delta_mmps2, 3);
    if (r->vehicle_mv != 0u) { ivts_jw_fixed(&w, "vehicle_battery", r->vehicle_mv, 3); }
    if (r->device_mv != 0u) { ivts_jw_fixed(&w, "device_battery", r->device_mv, 3); }
    if (r->ignition != IVTS_IGN_UNKNOWN) { ivts_jw_bool(&w, "ignition", r->ignition == IVTS_IGN_ON); }
    if (r->gnss.fix_valid) {
        ivts_jw_fixed(&w, "latitude", r->gnss.lat_e7, 7);
        ivts_jw_fixed(&w, "longitude", r->gnss.lon_e7, 7);
        ivts_jw_fixed(&w, "speed", ((int64_t)r->gnss.speed_cm_s * 36 + 50) / 100, 1);
        if (r->gnss.src == IVTS_GNSS_SRC_FULL && r->gnss.course_deg_x10 <= 3600u) {
            ivts_jw_fixed(&w, "course", r->gnss.course_deg_x10, 1);
        }
        ivts_jw_uint(&w, "satellites", r->gnss.sats);
    }
    ivts_jw_obj_end(&w);
    state_obj(&w, r->ignition, r->motion, r->vehicle, r->device, r->sleep);
    ivts_jw_obj_begin(&w, "diagnostics");
    ivts_jw_obj_begin(&w, "gnss");
    if (r->gnss.src == IVTS_GNSS_SRC_APPROX) { ivts_jw_str(&w, "query_mode", "cgpsinfo_fallback"); }
    ivts_jw_bool(&w, "fix_valid", r->gnss.fix_valid);
    ivts_jw_uint(&w, "satellites_reported", r->gnss.sats);
    ivts_jw_obj_end(&w);
    signals_obj(&w, &r->obd);
    live_diagnostics(&w, live);
    ivts_jw_obj_end(&w);
    ivts_jw_obj_end(&w);
    return ivts_jw_finish(&w, len);
}

ivts_err_t ivts_payload_status(const ivts_msg_meta_t *m, const ivts_telemetry_t *t,
                               const ivts_session_id_t *session, ivts_boundary_kind_t boundary, bool heartbeat,
                               char *buf, size_t cap, size_t *len)
{
    if (m == NULL || m->device_id == NULL || t == NULL) { return IVTS_ERR_INVALID_ARG; }
    ivts_jw_t w;
    ivts_jw_init(&w, buf, cap);
    head(&w, m, "v2.0.0");
    const char *status = "heartbeat";
    const char *boundary_name = "none";
    if (boundary == IVTS_BOUNDARY_STARTED) {
        status = "running";
        boundary_name = "started";
    } else if (boundary == IVTS_BOUNDARY_ENDED) {
        status = "stopped";
        boundary_name = "ended";
    } else if (!heartbeat) {
        if (session != NULL && session->local_key != 0u) { status = "running"; }
        else if (t->ignition == IVTS_IGN_OFF) { status = "stopped"; }
    }
    ivts_jw_str(&w, "status", status);
    ivts_jw_str(&w, "boundary_event", boundary_name);
    session_fields(&w, session);
    state_obj(&w, (uint8_t)t->ignition, (uint8_t)t->motion, (uint8_t)t->vehicle,
              (uint8_t)t->device_state, (uint8_t)t->sleep_mode);
    ivts_jw_obj_end(&w);
    return ivts_jw_finish(&w, len);
}

ivts_err_t ivts_payload_event(const ivts_msg_meta_t *m, int32_t code, const char *severity,
                              const char *message, char *buf, size_t cap, size_t *len)
{
    if (m == NULL || m->device_id == NULL) { return IVTS_ERR_INVALID_ARG; }
    ivts_jw_t w;
    ivts_jw_init(&w, buf, cap);
    head(&w, m, "v1.0.0");
    ivts_jw_str(&w, "event_type", severity != NULL ? severity : "info");
    if (code != 0) { ivts_jw_int(&w, "code", code); }
    if (message != NULL) { ivts_jw_str(&w, "message", message); }
    ivts_jw_obj_end(&w);
    return ivts_jw_finish(&w, len);
}

ivts_err_t ivts_payload_firmware(const ivts_msg_meta_t *m, const ivts_fw_status_t *s,
                                 char *buf, size_t cap, size_t *len)
{
    if (m == NULL || m->device_id == NULL || s == NULL) { return IVTS_ERR_INVALID_ARG; }
    ivts_jw_t w;
    ivts_jw_init(&w, buf, cap);
    head(&w, m, "v1.0.0");
    ivts_jw_str(&w, "status", ivts_ota_status_name((ivts_ota_status_t)s->status));
    ivts_jw_uint(&w, "progress", s->progress);
    ivts_jw_str(&w, "jobId", s->job_id);
    ivts_jw_str(&w, "targetVersion", s->target_version[0] != '\0' ? s->target_version : s->current_version);
    ivts_jw_str(&w, "currentVersion", s->current_version);
    if (s->partition[0] != '\0') { ivts_jw_str(&w, "partition", s->partition); }
    if (s->error != IVTS_OTA_E_NONE) {
        ivts_jw_str(&w, "error", ivts_ota_err_name((ivts_ota_err_t)s->error));
    }
    ivts_jw_obj_end(&w);
    return ivts_jw_finish(&w, len);
}
