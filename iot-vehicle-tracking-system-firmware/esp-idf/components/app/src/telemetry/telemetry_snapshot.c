#include "telemetry_snapshot.h"
#include "app_log.h"
#include <string.h>
#include "board/board.h"
#include "esp_log.h"
#include "obd/obd.h"
#include "sdkconfig.h"

/** Snapshot telemetry hiện tại; chỉ task "app" truy cập. */
static ivts_telemetry_t s_snapshot;
static uint64_t s_obd_sample_ms;
static uint64_t s_gnss_sample_ms;

void app_telemetry_set_axes(const ivts_axes_t *axes)
{
    s_snapshot.ignition = axes->ign;
    s_snapshot.motion = axes->motion;
    s_snapshot.vehicle = ivts_axes_vehicle(axes);
}

void app_telemetry_refresh(uint64_t now_ms)
{
    uint64_t age_ms = s_obd_sample_ms != 0u ? now_ms - s_obd_sample_ms : UINT32_MAX;
    s_snapshot.obd_sample_age_ms = age_ms < UINT32_MAX ? (uint32_t)age_ms : UINT32_MAX;
    if (now_ms - s_gnss_sample_ms > 3000u * CONFIG_IVTS_GNSS_PERIOD_S) {
        s_snapshot.gnss.fix_valid = false;
    }
}

const ivts_telemetry_t *app_telemetry_view(void) { return &s_snapshot; }

void app_telemetry_consume_imu_peak(void) { s_snapshot.imu_accel_delta_mmps2 = 0; }

/** Đặt trạng thái thiết bị và chế độ ngủ báo lên cloud. */
void app_telemetry_set_device(ivts_device_state_t d, ivts_sleep_mode_t m)
{
    s_snapshot.device_state = d;
    s_snapshot.sleep_mode = m;
}

/**
 * @brief Cập nhật snapshot theo một sự kiện từ component.
 *
 * - GNSS: lưu trạng thái fix mới nhất để không gửi toạ độ cũ khi mất fix.
 *   Fix hợp lệ có giờ UTC được dùng để chỉnh RTC nếu RTC chưa đáng tin.
 * - OBD: mất kết nối BLE thì xoá số liệu OBD để không báo số liệu cũ như dữ liệu sống.
 */
static void sync_rtc_from_gnss(const ivts_event_t *ev)
{
    if (ev->u.gnss.fix_valid && ev->u.gnss.ts_unix_ms != 0u) {
        uint64_t rtc_ms = 0;
        bool trusted = false;
        /* RTC chưa đáng tin mà GNSS đã có giờ UTC: đồng bộ RTC từ GNSS, là nguồn giờ đáng tin
         * duy nhất khi thiết bị không có mạng. */
        if (board_time_get(&rtc_ms, &trusted) == IVTS_OK && !trusted &&
            board_time_set(ev->u.gnss.ts_unix_ms) == IVTS_OK) {
            ESP_LOGI(APP_TAG, "RTC <- GNSS %llu", (unsigned long long)ev->u.gnss.ts_unix_ms);
        }
    }
}

static void on_gnss_fix(const ivts_event_t *ev)
{
    s_snapshot.gnss = ev->u.gnss;
    s_gnss_sample_ms = ev->ts_ms;
    sync_rtc_from_gnss(ev);
}

static void on_power_sample(const ivts_event_t *ev)
{
    s_snapshot.vehicle_mv = ev->u.power.vehicle_mv;
    s_snapshot.device_mv = ev->u.power.device_mv;
    if (ev->u.power.imu_delta_mmps2 > s_snapshot.imu_accel_delta_mmps2) {
        s_snapshot.imu_accel_delta_mmps2 = ev->u.power.imu_delta_mmps2;
    }
}

static void on_motion(const ivts_event_t *ev)
{
    if (ev->u.motion_irq.imu_delta_mmps2 > s_snapshot.imu_accel_delta_mmps2) {
        s_snapshot.imu_accel_delta_mmps2 = ev->u.motion_irq.imu_delta_mmps2;
    }
}

static void on_obd_sample(const ivts_event_t *ev)
{
    s_snapshot.obd = ev->u.obd_sample;
    s_obd_sample_ms = ev->ts_ms;
}

static void clear_obd_data(void)
{
    s_obd_sample_ms = 0u;
    memset(&s_snapshot.obd, 0, sizeof s_snapshot.obd);
    s_snapshot.obd_readiness.valid = false;
    s_snapshot.dtc_stored.valid = false;
    s_snapshot.dtc_pending.valid = false;
    s_snapshot.dtc_permanent.valid = false;
}

static void on_obd_link(const ivts_event_t *ev)
{
    if (s_snapshot.obd_ble_connected && !ev->u.obd_link.connected) { s_snapshot.obd_connect_fail_5m++; }
    s_snapshot.obd_ble_connected = ev->u.obd_link.connected != 0u;
    s_snapshot.obd_elm_ready = ev->u.obd_link.elm_ready != 0u;
    s_snapshot.obd_ecu_state = (ivts_ecu_state_t)ev->u.obd_link.ecu;
    if (!s_snapshot.obd_ble_connected) { clear_obd_data(); }
}

static void on_obd_diag_ready(void)
{
    (void)obd_diag_copy(&s_snapshot.obd_readiness, &s_snapshot.dtc_stored, &s_snapshot.dtc_pending, &s_snapshot.dtc_permanent);
}

void app_telemetry_on_event(const ivts_event_t *ev)
{
    switch (ev->type) {
    case IVTS_EV_GNSS_FIX: on_gnss_fix(ev); break;
    case IVTS_EV_POWER_SAMPLE: on_power_sample(ev); break;
    case IVTS_EV_MOTION_IRQ: on_motion(ev); break;
    case IVTS_EV_OBD_SAMPLE: on_obd_sample(ev); break;
    case IVTS_EV_OBD_LINK: on_obd_link(ev); break;
    case IVTS_EV_OBD_DIAG_READY: on_obd_diag_ready(); break;
    default: break;
    }
}
