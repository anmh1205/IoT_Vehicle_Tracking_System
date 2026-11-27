#include "ivts_core/model/record.h"
#include <string.h>

typedef struct { uint8_t *p; size_t i; } wr_t;
typedef struct { const uint8_t *p; size_t i; } rd_t;

static void put8(wr_t *w, uint8_t v)   { w->p[w->i++] = v; }
static void put16(wr_t *w, uint16_t v) { put8(w, (uint8_t)v); put8(w, (uint8_t)(v >> 8)); }
static void put32(wr_t *w, uint32_t v) { put16(w, (uint16_t)v); put16(w, (uint16_t)(v >> 16)); }
static void put64(wr_t *w, uint64_t v) { put32(w, (uint32_t)v); put32(w, (uint32_t)(v >> 32)); }

static uint8_t  get8(rd_t *r)  { return r->p[r->i++]; }
static uint16_t get16(rd_t *r) { uint16_t lo = get8(r); return (uint16_t)(lo | ((uint16_t)get8(r) << 8)); }
static uint32_t get32(rd_t *r) { uint32_t lo = get16(r); return lo | ((uint32_t)get16(r) << 16); }
static uint64_t get64(rd_t *r) { uint64_t lo = get32(r); return lo | ((uint64_t)get32(r) << 32); }

ivts_err_t ivts_record_encode(const ivts_record_t *r, uint8_t *buf, size_t cap, size_t *out_len)
{
    if (r == NULL || buf == NULL || cap < IVTS_RECORD_V2_SIZE) {
        return IVTS_ERR_INVALID_ARG;
    }
    wr_t w = { buf, 0 };
    put8(&w, IVTS_RECORD_VERSION);
    put32(&w, r->boot_id);
    put32(&w, r->seq);
    put64(&w, r->gnss.ts_unix_ms);
    put32(&w, (uint32_t)r->gnss.lat_e7);       /* int32 -> uint32 giữ nguyên bit (bù 2). */
    put32(&w, (uint32_t)r->gnss.lon_e7);
    put16(&w, r->gnss.speed_cm_s);
    put16(&w, r->gnss.course_deg_x10);
    put8(&w, r->gnss.sats);
    put8(&w, r->gnss.src);
    put8(&w, r->gnss.fix_valid ? 1u : 0u);
    put16(&w, r->vehicle_mv);
    put16(&w, r->device_mv);
    put8(&w, r->ignition);
    put8(&w, r->motion);
    put8(&w, r->vehicle);
    put8(&w, r->obd.valid_mask);
    put16(&w, r->obd.rpm);
    put16(&w, (uint16_t)r->obd.coolant_c);
    put8(&w, r->obd.speed_kmh);
    put8(&w, r->obd.fuel_pct);
    put8(&w, r->obd.load_pct);
    put64(&w, r->captured_unix_ms);
    put32(&w, r->uptime_ms);
    put32(&w, r->imu_delta_mmps2);
    put32(&w, r->session.boot_id);
    put32(&w, r->session.local_key);
    put64(&w, r->session.canonical_id);
    put8(&w, r->device);
    put8(&w, r->sleep);
    if (out_len != NULL) {
        *out_len = w.i;
    }
    return IVTS_OK;
}

ivts_err_t ivts_record_decode(const uint8_t *buf, size_t len, ivts_record_t *r)
{
    if (buf == NULL || r == NULL || len < 1u) {
        return IVTS_ERR_INVALID_ARG;
    }
    bool legacy = buf[0] == 1u;
    if (!legacy && buf[0] != IVTS_RECORD_VERSION) {
        return IVTS_ERR_VERSION;
    }
    if (len < (legacy ? IVTS_RECORD_V1_SIZE : IVTS_RECORD_V2_SIZE)) {
        return IVTS_ERR_INVALID_ARG;
    }
    memset(r, 0, sizeof(*r));
    rd_t d = { buf, 1 };
    r->boot_id             = get32(&d);
    r->seq                 = get32(&d);
    r->gnss.ts_unix_ms     = get64(&d);
    r->gnss.lat_e7         = (int32_t)get32(&d);
    r->gnss.lon_e7         = (int32_t)get32(&d);
    r->gnss.speed_cm_s     = get16(&d);
    r->gnss.course_deg_x10 = get16(&d);
    r->gnss.sats           = get8(&d);
    r->gnss.src            = get8(&d);
    r->gnss.fix_valid      = get8(&d) != 0u;
    r->vehicle_mv          = get16(&d);
    r->device_mv           = get16(&d);
    r->ignition            = get8(&d);
    r->motion              = get8(&d);
    r->vehicle             = get8(&d);
    r->obd.valid_mask      = get8(&d);
    r->obd.rpm             = get16(&d);
    r->obd.coolant_c       = (int16_t)get16(&d);
    r->obd.speed_kmh       = get8(&d);
    r->obd.fuel_pct        = get8(&d);
    r->obd.load_pct        = get8(&d);
    if (legacy) {
        /* V1 chỉ lưu giờ UTC của fix GNSS nếu thời điểm đó đã được module trả về. */
        r->captured_unix_ms = r->gnss.fix_valid ? r->gnss.ts_unix_ms : 0u;
        return IVTS_OK;
    }
    r->captured_unix_ms     = get64(&d);
    r->uptime_ms            = get32(&d);
    r->imu_delta_mmps2      = get32(&d);
    r->session.boot_id      = get32(&d);
    r->session.local_key    = get32(&d);
    r->session.canonical_id = get64(&d);
    r->device              = get8(&d);
    r->sleep               = get8(&d);
    return IVTS_OK;
}

bool ivts_record_precedes_boundary(const ivts_record_t *r, const ivts_session_boundary_t *b)
{
    if (b->kind == IVTS_BOUNDARY_ENDED && r->session.local_key != 0u &&
        r->session.local_key == b->session.local_key && r->session.boot_id == b->session.boot_id) {
        return true;
    }
    if (r->boot_id == b->boot_id) { return r->seq < b->seq; }
    return (b->boot_id - r->boot_id) < UINT32_C(0x80000000);
}
