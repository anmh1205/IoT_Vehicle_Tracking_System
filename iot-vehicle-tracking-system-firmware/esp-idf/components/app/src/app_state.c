/**
 * @file app_state.c
 * @brief Snapshot telemetry của thiết bị, cập nhật theo sự kiện.
 *
 * ## Mô hình thực thi
 *
 * s_t chỉ được ghi và đọc trong task "app" (app_state_on_event() từ app_dispatch(),
 * app_state_make_record() từ app_publish.c). Component khác không truy cập s_t; payload được
 * dựng trong task "app" từ snapshot này. Do đó s_t không cần khoá.
 *
 * Ngoại lệ có chủ đích: app_state_on_event() gọi obd_diag_copy() để lấy bản sao dữ liệu chẩn
 * đoán; hàm đó tự khoá mutex của component obd khi sao chép.
 */

#include "app_priv.h"
#include <string.h>
#include "board/board.h"
#include "esp_log.h"
#include "platform/platform_clock.h"
#include "obd/obd.h"
#include "sdkconfig.h"

/** Snapshot telemetry hiện tại; chỉ task "app" truy cập. */
static ivts_telemetry_t s_t;
static uint64_t s_obd_sample_ms;
static uint64_t s_gnss_sample_ms;

/** Thời gian kể từ boot theo ms, từ esp_timer (đơn điệu, không đổi khi RTC được chỉnh). */
uint64_t app_now(void) { return platform_uptime_ms(); }

/**
 * @brief Trả về snapshot với các trường suy ra từ axes (ignition, motion, vehicle) được làm mới.
 * @return Con trỏ tới s_t; hợp lệ đến lần gọi hàm ghi tiếp theo trong task "app".
 */
const ivts_telemetry_t *app_state_get(void)
{
    s_t.ignition = g_app.axes.ign;
    s_t.motion = g_app.axes.motion;
    s_t.vehicle = ivts_axes_vehicle(&g_app.axes);
    uint64_t now = app_now();
    uint64_t age = s_obd_sample_ms != 0u ? now - s_obd_sample_ms : UINT32_MAX;
    s_t.obd_sample_age_ms = age < UINT32_MAX ? (uint32_t)age : UINT32_MAX;
    if (now - s_gnss_sample_ms > 3000u * CONFIG_IVTS_GNSS_PERIOD_S) { s_t.gnss.fix_valid = false; }
    return &s_t;
}

/** Đặt trạng thái thiết bị và chế độ ngủ báo lên cloud. */
void app_state_set_device(ivts_device_state_t d, ivts_sleep_mode_t m)
{
    s_t.device_state = d;
    s_t.sleep_mode = m;
}

/**
 * @brief Cập nhật snapshot theo một sự kiện từ component.
 *
 * - GNSS: lưu trạng thái fix mới nhất để không gửi toạ độ cũ khi mất fix.
 *   Fix hợp lệ có giờ UTC được dùng để chỉnh RTC nếu RTC chưa đáng tin.
 * - OBD: mất kết nối BLE thì xoá số liệu OBD để không báo số liệu cũ như dữ liệu sống.
 */
void app_state_on_event(const ivts_event_t *ev)
{
    switch (ev->type) {
    case IVTS_EV_GNSS_FIX:
        s_t.gnss = ev->u.gnss;
        s_gnss_sample_ms = ev->ts_ms;
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
        break;
    case IVTS_EV_POWER_SAMPLE:
        s_t.vehicle_mv = ev->u.power.vehicle_mv;
        s_t.device_mv = ev->u.power.device_mv;
        if (ev->u.power.imu_delta_mmps2 > s_t.imu_accel_delta_mmps2) {
            s_t.imu_accel_delta_mmps2 = ev->u.power.imu_delta_mmps2;
        }
        break;
    case IVTS_EV_MOTION_IRQ:
        if (ev->u.motion_irq.imu_delta_mmps2 > s_t.imu_accel_delta_mmps2) {
            s_t.imu_accel_delta_mmps2 = ev->u.motion_irq.imu_delta_mmps2;
        }
        break;
    case IVTS_EV_OBD_SAMPLE:
        s_t.obd = ev->u.obd_sample;
        s_obd_sample_ms = ev->ts_ms;
        break;
    case IVTS_EV_OBD_LINK:
        if (s_t.obd_ble_connected && !ev->u.obd_link.connected) { s_t.obd_connect_fail_5m++; }
        s_t.obd_ble_connected = ev->u.obd_link.connected != 0u;
        s_t.obd_elm_ready = ev->u.obd_link.elm_ready != 0u;
        s_t.obd_ecu_state = (ivts_ecu_state_t)ev->u.obd_link.ecu;
        if (!s_t.obd_ble_connected) {
            s_obd_sample_ms = 0u;
            memset(&s_t.obd, 0, sizeof s_t.obd);
            s_t.obd_readiness.valid = false;
            s_t.dtc_stored.valid = false;
            s_t.dtc_pending.valid = false;
            s_t.dtc_permanent.valid = false;
        }
        break;
    case IVTS_EV_OBD_DIAG_READY:
        (void)obd_diag_copy(&s_t.obd_readiness, &s_t.dtc_stored, &s_t.dtc_pending, &s_t.dtc_permanent);
        break;
    default:
        break;
    }
}

/**
 * @brief Chụp snapshot hiện tại thành một bản ghi và cấp số seq mới cho nó.
 *
 * seq được cấp tại thời điểm chụp; khi bản ghi đi qua offline queue và được replay, nó giữ
 * nguyên boot_id và seq này để cloud khử trùng lặp.
 */
void app_state_make_record(ivts_record_t *r)
{
    const ivts_telemetry_t *t = app_state_get();
    memset(r, 0, sizeof *r);
    r->boot_id = g_app.boot_id;
    r->seq = app_rtc_next_seq();
    r->uptime_ms = (uint32_t)app_now();
    bool trusted = false;
    (void)board_time_get(&r->captured_unix_ms, &trusted);
    if (!trusted) { r->captured_unix_ms = 0u; }
    r->gnss = t->gnss;
    if (t->obd_ble_connected && t->obd_elm_ready && t->obd_sample_age_ms <= 30000u) {
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
    s_t.imu_accel_delta_mmps2 = 0;
    if (t->ignition == IVTS_IGN_ON && g_app.tracking_enabled) {
        r->session = g_app.session.active;
    }
}
