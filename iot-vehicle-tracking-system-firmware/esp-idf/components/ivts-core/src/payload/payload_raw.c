#include "payload/payload.h"

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
    ivts_jw_str(w, "ecu_state", ivts_payload_ecu_name(t->obd_ecu_state));
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
    ivts_payload_write_header(&w, &capture, "v2.0.0");
    ivts_jw_uint(&w, "uptime", r->uptime_ms);
    ivts_payload_write_session(&w, &r->session);
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
    ivts_payload_write_state(&w, r->ignition, r->motion, r->vehicle, r->device, r->sleep);
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
