#include "obd_pid.h"
#include <string.h>

/* Xem obd_pid.h. */
ivts_err_t obd_pid_decode(const uint8_t *b, size_t n, ivts_obd_sample_t *s)
{
    if (b == NULL || s == NULL || n < 3u || b[0] != 0x41u) { return IVTS_ERR_INVALID_ARG; }
    uint8_t A = b[2];
    switch (b[1]) {
    case 0x04:                                          /* engine load = 100*A/255 */
        s->load_pct = (uint8_t)((A * 100u + 127u) / 255u);
        s->valid_mask |= IVTS_OBD_HAS_LOAD;
        return IVTS_OK;
    case 0x05:                                          /* coolant = A - 40 */
        s->coolant_c = (int16_t)(A - 40);
        s->valid_mask |= IVTS_OBD_HAS_COOLANT;
        return IVTS_OK;
    case 0x0C:                                          /* rpm = (256A + B) / 4 */
        if (n < 4u) { return IVTS_ERR_INVALID_ARG; }
        s->rpm = (uint16_t)(((uint32_t)A * 256u + b[3]) / 4u);
        s->valid_mask |= IVTS_OBD_HAS_RPM;
        return IVTS_OK;
    case 0x0D:                                          /* speed = A km/h */
        s->speed_kmh = A;
        s->valid_mask |= IVTS_OBD_HAS_SPEED;
        return IVTS_OK;
    case 0x2F:                                          /* fuel = 100*A/255 */
        s->fuel_pct = (uint8_t)((A * 100u + 127u) / 255u);
        s->valid_mask |= IVTS_OBD_HAS_FUEL;
        return IVTS_OK;
    default:
        return IVTS_ERR_NOT_FOUND;
    }
}

/**
 * Trạng thái của monitor ở vị trí @p bit: bit trong @p avail bằng 1 nghĩa là monitor được hỗ trợ;
 * bit trong @p incomplete bằng 1 nghĩa là monitor chưa hoàn tất.
 */
static ivts_monitor_status_t mon(uint8_t avail, uint8_t incomplete, unsigned bit)
{
    if ((((unsigned)avail >> bit) & 1u) == 0u) { return IVTS_MON_UNSUPPORTED; }
    return (((unsigned)incomplete >> bit) & 1u) ? IVTS_MON_INCOMPLETE : IVTS_MON_COMPLETE;
}

/* Xem obd_pid.h. */
ivts_err_t obd_readiness_decode(const uint8_t *b, size_t n, ivts_obd_readiness_t *r)
{
    if (b == NULL || r == NULL || n < 6u || b[0] != 0x41u || b[1] != 0x01u) { return IVTS_ERR_INVALID_ARG; }
    uint8_t A = b[2], B = b[3], C = b[4], D = b[5];
    memset(r, 0, sizeof(*r));
    r->valid = true;
    r->mil_on = (A & 0x80u) != 0u;
    r->reported_dtc_count = A & 0x7Fu;
    r->compression_ignition = (B & 0x08u) != 0u;
    /* Byte B: bit0..2 có mặt, bit4..6 chưa xong: misfire, fuel, components */
    r->misfire                  = mon(B, (uint8_t)(B >> 4), 0);
    r->fuel_system              = mon(B, (uint8_t)(B >> 4), 1);
    r->comprehensive_components = mon(B, (uint8_t)(B >> 4), 2);
    if (!r->compression_ignition) {
        r->catalyst             = mon(C, D, 0);
        r->heated_catalyst      = mon(C, D, 1);
        r->evaporative_system   = mon(C, D, 2);
        r->secondary_air_system = mon(C, D, 3);
        r->ac_refrigerant       = mon(C, D, 4);   /* bit C4: A/C (J1979 cũ) hoặc GPF (bản mới) */
        r->oxygen_sensor        = mon(C, D, 5);
        r->oxygen_sensor_heater = mon(C, D, 6);
        r->egr_vvt_system       = mon(C, D, 7);
    } else {
        r->nmhc_catalyst        = mon(C, D, 0);
        r->nox_aftertreatment   = mon(C, D, 1);
        r->boost_pressure       = mon(C, D, 3);
        r->exhaust_gas_sensor   = mon(C, D, 5);
        r->pm_filter            = mon(C, D, 6);
        r->egr_vvt_system       = mon(C, D, 7);
    }
    return IVTS_OK;
}

/* Xem obd_pid.h. */
void obd_dtc_format(uint8_t hi, uint8_t lo, char out[IVTS_DTC_CODE_SIZE])
{
    static const char sys[] = "PCBU";
    static const char hex[] = "0123456789ABCDEF";
    out[0] = sys[hi >> 6];
    out[1] = (char)('0' + ((hi >> 4) & 0x3u));
    out[2] = hex[hi & 0xFu];
    out[3] = hex[lo >> 4];
    out[4] = hex[lo & 0xFu];
    out[5] = '\0';
}

/* Xem obd_pid.h. */
ivts_err_t obd_dtc_decode(const uint8_t *b, size_t n, ivts_dtc_list_t *d)
{
    if (b == NULL || d == NULL || n < 1u) { return IVTS_ERR_INVALID_ARG; }
    if (b[0] != 0x43u && b[0] != 0x47u && b[0] != 0x4Au) { return IVTS_ERR_INVALID_ARG; }
    memset(d, 0, sizeof(*d));
    d->valid = true;
    size_t i = 1;
    /* Trên CAN (ISO 15765-4), sau byte mode có một byte đếm; giao thức cũ thì không có. Với ATH0
     * không phân biệt được bằng header, nên dùng tính chẵn lẻ: số byte sau mode là lẻ thì byte
     * đầu tiên là byte đếm.
     * Cách suy luận này cũng được các thư viện OBD mã nguồn mở dùng; kết quả cần được đối chiếu
     * với dữ liệu thực từ xe. */
    if (((n - 1u) % 2u) == 1u) { i = 2; }
    for (; i + 1u < n; i += 2u) {
        if (b[i] == 0u && b[i + 1u] == 0u) { continue; }   /* Bỏ cặp byte đệm của khung. */
        if (d->count >= IVTS_DTC_MAX_CODES) { d->truncated = true; break; }
        obd_dtc_format(b[i], b[i + 1u], d->codes[d->count++]);
    }
    return IVTS_OK;
}
