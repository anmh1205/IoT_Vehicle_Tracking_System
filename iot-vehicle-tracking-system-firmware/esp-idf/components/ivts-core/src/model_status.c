/**
 * @file model_status.c
 * @brief Pure formatting of the periodic console status lines.
 */
#include "ivts_core/model/status.h"
#include <stdarg.h>
#include <stdbool.h>
#include <stdio.h>
#include "ivts_core/base/civil.h"

const char *ivts_ignition_name(ivts_ignition_t ignition)
{
    switch (ignition) {
    case IVTS_IGN_OFF: return "OFF";
    case IVTS_IGN_ON: return "ON";
    default: return "UNKNOWN";
    }
}

const char *ivts_motion_name(ivts_motion_t motion)
{
    switch (motion) {
    case IVTS_MOTION_STATIONARY: return "STATIONARY";
    case IVTS_MOTION_MOVING: return "MOVING";
    default: return "UNKNOWN";
    }
}

const char *ivts_vehicle_name(ivts_vehicle_t vehicle)
{
    switch (vehicle) {
    case IVTS_VEH_PARKED_OFF: return "PARKED_OFF";
    case IVTS_VEH_ROLLING_IGN_OFF: return "ROLLING_IGN_OFF";
    case IVTS_VEH_IDLING_ON: return "IDLING_ON";
    case IVTS_VEH_MOVING_ON: return "MOVING_ON";
    case IVTS_VEH_UNKNOWN_STATIONARY: return "UNKNOWN_STATIONARY";
    case IVTS_VEH_UNKNOWN_MOVING: return "UNKNOWN_MOVING";
    default: return "UNKNOWN";
    }
}

const char *ivts_link_name(ivts_link_t link)
{
    switch (link) {
    case IVTS_LINK_NET_UP: return "NET_UP";
    case IVTS_LINK_BROKER_UP: return "BROKER_UP";
    default: return "DOWN";
    }
}

const char *ivts_ecu_name(ivts_ecu_state_t ecu)
{
    switch (ecu) {
    case IVTS_ECU_DISCONNECTED: return "DISCONNECTED";
    case IVTS_ECU_LIVE: return "LIVE";
    case IVTS_ECU_STOPPED: return "STOPPED";
    case IVTS_ECU_NO_DATA: return "NO_DATA";
    default: return "UNKNOWN";
    }
}

const char *ivts_device_state_name(ivts_device_state_t device)
{
    switch (device) {
    case IVTS_DEV_BOOTING: return "BOOTING";
    case IVTS_DEV_ACTIVE: return "ACTIVE";
    case IVTS_DEV_SLEEP_PREPARE: return "SLEEP_PREPARE";
    case IVTS_DEV_SLEEPING: return "SLEEPING";
    case IVTS_DEV_WAKING: return "WAKING";
    case IVTS_DEV_ALARM: return "ALARM";
    case IVTS_DEV_OTA: return "OTA";
    case IVTS_DEV_FAULT: return "FAULT";
    default: return "UNKNOWN";
    }
}

const char *ivts_sleep_mode_name(ivts_sleep_mode_t sleep)
{
    switch (sleep) {
    case IVTS_SLEEP_NONE: return "NONE";
    case IVTS_SLEEP_FAKE: return "FAKE";
    case IVTS_SLEEP_LIGHT: return "LIGHT";
    case IVTS_SLEEP_DEEP: return "DEEP";
    default: return "UNKNOWN";
    }
}

/** Bounded append writer. */
typedef struct {
    char  *buf;
    size_t cap;
    size_t len;
} line_t;

static void put(line_t *line, const char *fmt, ...)
{
    if (line->len + 1u >= line->cap) { return; }
    va_list args;
    va_start(args, fmt);
    int n = vsnprintf(line->buf + line->len, line->cap - line->len, fmt, args);
    va_end(args);
    if (n < 0) { return; }
    size_t room = line->cap - line->len - 1u;
    line->len += (size_t)n < room ? (size_t)n : room;
}

/** Append millivolts as volts with two decimals, e.g. 13520 -> 13.52V. */
static void put_volts(line_t *line, const char *key, uint16_t mv)
{
    put(line, " %s=%u.%02uV", key, (unsigned)(mv / 1000u), (unsigned)(mv % 1000u / 10u));
}

/** Append a coordinate stored as degrees times 10^7. */
static void put_coord(line_t *line, int32_t e7)
{
    int64_t v = e7;
    bool negative = v < 0;
    uint64_t magnitude = (uint64_t)(negative ? -v : v);
    put(line, "%s%lu.%07lu", negative ? "-" : "", (unsigned long)(magnitude / 10000000u),
        (unsigned long)(magnitude % 10000000u));
}

static void format_core(line_t *line, const ivts_status_view_t *v)
{
    const ivts_telemetry_t *t = v->telemetry;
    uint64_t s = v->uptime_ms / 1000u;
    put(line, "status fsm=%s dev=%s ign=%s motion=%s vehicle=%s link=%s queue=%lu up=%02lu:%02lu:%02lu",
        ivts_fsm_state_name(v->fsm), ivts_device_state_name(t->device_state), ivts_ignition_name(t->ignition), ivts_motion_name(t->motion),
        ivts_vehicle_name(t->vehicle), ivts_link_name(v->link), (unsigned long)v->queue_pending,
        (unsigned long)(s / 3600u), (unsigned long)(s / 60u % 60u), (unsigned long)(s % 60u));
}

#define YN(value) ((value) ? "yes" : "no")

static void format_net(line_t *line, const ivts_status_view_t *v)
{
    put(line, "status net link=%s publishing=%s control_pending=%s queue=%lu unflushed=%s ota=%s tracking=%s",
        ivts_link_name(v->link), YN(v->publishing), YN(v->control_pending), (unsigned long)v->queue_pending,
        YN(v->queue_unflushed), YN(v->ota_active), YN(v->tracking_enabled));
}

static void format_time(line_t *line, const ivts_status_view_t *v)
{
    if (v->utc_unix_ms == 0u) {
        put(line, "status time utc=unknown rtc=%s", v->rtc_trusted ? "trusted" : "untrusted");
        return;
    }
    ivts_civil_t c;
    ivts_unix_ms_to_civil(v->utc_unix_ms, &c);
    put(line, "status time utc=%04u-%02u-%02uT%02u:%02u:%02uZ rtc=%s", (unsigned)c.year, (unsigned)c.month,
        (unsigned)c.day, (unsigned)c.hour, (unsigned)c.min, (unsigned)c.sec, v->rtc_trusted ? "trusted" : "untrusted");
}

static void format_power(line_t *line, const ivts_status_view_t *v)
{
    put(line, "status power");
    put_volts(line, "vehicle", v->telemetry->vehicle_mv);
    put_volts(line, "device", v->telemetry->device_mv);
    put(line, " imu_peak=%lummps2", (unsigned long)v->telemetry->imu_accel_delta_mmps2);
}

static void format_gnss(line_t *line, const ivts_status_view_t *v)
{
    const ivts_gnss_t *g = &v->telemetry->gnss;
    if (!g->fix_valid) {
        put(line, "status gnss fix=no");
        return;
    }
    put(line, "status gnss fix=yes sats=%u pos=", (unsigned)g->sats);
    put_coord(line, g->lat_e7);
    put(line, ",");
    put_coord(line, g->lon_e7);
    unsigned tenths_kmh = (unsigned)((uint32_t)g->speed_cm_s * 36u / 100u);   /* cm/s * 0.036 = km/h */
    put(line, " speed=%u.%ukm/h course=%u.%u", tenths_kmh / 10u, tenths_kmh % 10u,
        (unsigned)(g->course_deg_x10 / 10u), (unsigned)(g->course_deg_x10 % 10u));
}

static void format_obd(line_t *line, const ivts_status_view_t *v)
{
    const ivts_telemetry_t *t = v->telemetry;
    put(line, "status obd ble=%s elm=%s ecu=%s", t->obd_ble_connected ? "up" : "down",
        t->obd_elm_ready ? "ready" : "no", ivts_ecu_name(t->obd_ecu_state));
    const ivts_obd_sample_t *o = &t->obd;
    if (!t->obd_ble_connected) { return; }
    if (o->valid_mask & IVTS_OBD_HAS_RPM) { put(line, " rpm=%u", (unsigned)o->rpm); }
    if (o->valid_mask & IVTS_OBD_HAS_SPEED) { put(line, " speed=%ukm/h", (unsigned)o->speed_kmh); }
    if (o->valid_mask & IVTS_OBD_HAS_COOLANT) { put(line, " coolant=%dC", (int)o->coolant_c); }
    if (o->valid_mask & IVTS_OBD_HAS_FUEL) { put(line, " fuel=%u%%", (unsigned)o->fuel_pct); }
    if (o->valid_mask & IVTS_OBD_HAS_LOAD) { put(line, " load=%u%%", (unsigned)o->load_pct); }
    if (t->obd_sample_age_ms != UINT32_MAX) { put(line, " age=%lums", (unsigned long)t->obd_sample_age_ms); }
}

static void format_sys(line_t *line, const ivts_status_view_t *v)
{
    put(line, "status sys heap=%lukB heap_min=%lukB event_drops=%lu cmd_drops=%lu",
        (unsigned long)(v->heap_free_bytes / 1024u), (unsigned long)(v->heap_min_bytes / 1024u),
        (unsigned long)v->event_drops, (unsigned long)v->cmd_drops);
}

size_t ivts_status_format(const ivts_status_view_t *view, ivts_status_group_t group, char *buf, size_t cap)
{
    if (buf == NULL || cap == 0u) { return 0u; }
    line_t line = { .buf = buf, .cap = cap, .len = 0u };
    buf[0] = '\0';
    if (view == NULL || view->telemetry == NULL) { return 0u; }
    switch (group) {
    case IVTS_STATUS_CORE: format_core(&line, view); break;
    case IVTS_STATUS_NET: format_net(&line, view); break;
    case IVTS_STATUS_TIME: format_time(&line, view); break;
    case IVTS_STATUS_POWER: format_power(&line, view); break;
    case IVTS_STATUS_GNSS: format_gnss(&line, view); break;
    case IVTS_STATUS_OBD: format_obd(&line, view); break;
    case IVTS_STATUS_SYS: format_sys(&line, view); break;
    case IVTS_STATUS_COUNT: break;
    }
    return line.len;
}
