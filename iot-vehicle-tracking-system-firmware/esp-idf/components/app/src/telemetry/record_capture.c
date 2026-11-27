#include "record_capture.h"
#include "telemetry_snapshot.h"
#include <string.h>
#include "app_clock.h"
#include "app_msg_seq.h"
#include "app_timing.h"
#include "device/app_device.h"
#include "session/session_tracker.h"

/**
 * @brief Chụp snapshot hiện tại thành một bản ghi và cấp số seq mới cho nó.
 *
 * seq được cấp tại thời điểm chụp; khi bản ghi đi qua offline queue và được replay, nó giữ
 * nguyên boot_id và seq này để cloud khử trùng lặp.
 */
void app_record_capture(ivts_record_t *r)
{
    const ivts_telemetry_t *t = app_telemetry_view();
    memset(r, 0, sizeof *r);
    r->boot_id = app_device_boot_id();
    r->seq = app_msg_seq_next();
    r->uptime_ms = (uint32_t)app_now();
    r->captured_unix_ms = app_clock_unix_ms_or_zero(NULL);
    r->gnss = t->gnss;
    if (t->obd_ble_connected && t->obd_elm_ready && t->obd_sample_age_ms <= OBD_SAMPLE_MAX_AGE_MS) {
        r->obd = t->obd;
    }
    r->vehicle_mv = t->vehicle_mv;
    r->device_mv = t->device_mv;
    r->ignition = (uint8_t)t->ignition;
    r->motion = (uint8_t)t->motion;
    r->vehicle = (uint8_t)t->vehicle;
    r->device = (uint8_t)t->device_state;
    r->sleep = (uint8_t)t->sleep_mode;
    r->imu_delta_mmps2 = t->imu_accel_delta_mmps2;
    if (t->ignition == IVTS_IGN_ON && app_device_tracking_enabled()) {
        r->session = *app_session_active_id();
    }
}
