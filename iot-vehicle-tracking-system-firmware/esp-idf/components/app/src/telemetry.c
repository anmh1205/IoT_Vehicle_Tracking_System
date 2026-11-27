/**
 * @file telemetry.c
 * @brief App-owned sensor snapshots and offline RAW record capture.
 *
 * Apply source-specific validity and age checks before publishing. Capture
 * boot identity and sequence with each RAW record to support stable replay.
 */
#include "telemetry.h"
#include "app_internal.h"
#include <string.h>
#include "board/board.h"
#include "esp_log.h"
#include "obd/obd.h"
#include "sdkconfig.h"
#include "device/device.h"
#include "session_tracker.h"

/** Current telemetry snapshot, owned by the app task. */
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

/** Set the device state and sleep mode reported to the cloud. */
void app_telemetry_set_device(ivts_device_state_t d, ivts_sleep_mode_t m)
{
    s_snapshot.device_state = d;
    s_snapshot.sleep_mode = m;
}

/**
 * @brief Update the app snapshot from a component event.
 *
 * Keep the latest GNSS validity flag so a lost fix invalidates old positions.
 * Use GNSS UTC to set an untrusted RTC. Clear OBD measurements when BLE
 * disconnects so a later payload cannot report stale values as live.
 */
static void sync_rtc_from_gnss(const ivts_event_t *ev)
{
    if (ev->u.gnss.fix_valid && ev->u.gnss.ts_unix_ms != 0u) {
        uint64_t rtc_ms = 0;
        bool trusted = false;
        /*
         * Set the untrusted RTC from a valid GNSS UTC fix. This time source
         * works without a cellular network connection.
         */
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

/**
 * @brief Capture the current snapshot and allocate its record sequence.
 *
 * Allocate the sequence at capture. Offline storage and replay retain that
 * sequence and boot ID so the cloud can deduplicate retries.
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
