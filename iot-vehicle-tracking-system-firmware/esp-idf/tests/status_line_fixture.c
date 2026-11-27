#include <assert.h>
#include <string.h>
#include "ivts_core/model/status.h"

static const char *line(const ivts_status_view_t *view, ivts_status_group_t group)
{
    static char buf[200];
    size_t n = ivts_status_format(view, group, buf, sizeof buf);
    assert(n == strlen(buf));
    return buf;
}

int main(void)
{
    ivts_telemetry_t t = {0};
    t.ignition = IVTS_IGN_ON;
    t.motion = IVTS_MOTION_MOVING;
    t.vehicle = IVTS_VEH_MOVING_ON;
    t.vehicle_mv = 13520;
    t.device_mv = 4050;
    t.gnss = (ivts_gnss_t){ .lat_e7 = 210285123, .lon_e7 = -1058542000, .speed_cm_s = 1000, .course_deg_x10 = 1825,
                            .sats = 9, .fix_valid = true };
    t.obd_ble_connected = true;
    t.obd_elm_ready = true;
    t.obd_ecu_state = IVTS_ECU_LIVE;
    t.obd = (ivts_obd_sample_t){ .rpm = 1500, .coolant_c = 89, .valid_mask = IVTS_OBD_HAS_RPM | IVTS_OBD_HAS_COOLANT };
    t.obd_sample_age_ms = 1200;
    ivts_status_view_t v = { .telemetry = &t, .fsm = IVTS_ST_DRIVING, .link = IVTS_LINK_BROKER_UP,
                             .uptime_ms = 3723000u, .queue_pending = 0, .heap_free_bytes = 145408u,
                             .heap_min_bytes = 120832u, .event_drops = 1, .cmd_drops = 0,
                             .utc_unix_ms = 1795766472000u, .rtc_trusted = true, .publishing = true,
                             .tracking_enabled = true };
    t.device_state = IVTS_DEV_ACTIVE;

    assert(strcmp(line(&v, IVTS_STATUS_CORE),
                  "status fsm=DRIVING dev=ACTIVE ign=ON motion=MOVING vehicle=MOVING_ON link=BROKER_UP queue=0 up=01:02:03") == 0);
    assert(strcmp(line(&v, IVTS_STATUS_NET),
                  "status net link=BROKER_UP publishing=yes control_pending=no queue=0 unflushed=no ota=no "
                  "tracking=yes") == 0);
    assert(strcmp(line(&v, IVTS_STATUS_TIME), "status time utc=2026-11-27T08:01:12Z rtc=trusted") == 0);
    assert(strcmp(line(&v, IVTS_STATUS_POWER), "status power vehicle=13.52V device=4.05V imu_peak=0mmps2") == 0);
    assert(strcmp(line(&v, IVTS_STATUS_GNSS),
                  "status gnss fix=yes sats=9 pos=21.0285123,-105.8542000 speed=36.0km/h course=182.5") == 0);
    assert(strcmp(line(&v, IVTS_STATUS_OBD),
                  "status obd ble=up elm=ready ecu=LIVE rpm=1500 coolant=89C age=1200ms") == 0);
    assert(strcmp(line(&v, IVTS_STATUS_SYS), "status sys heap=142kB heap_min=118kB event_drops=1 cmd_drops=0") == 0);

    v.utc_unix_ms = 0u;
    v.rtc_trusted = false;
    assert(strcmp(line(&v, IVTS_STATUS_TIME), "status time utc=unknown rtc=untrusted") == 0);
    t.gnss.fix_valid = false;
    t.obd_ble_connected = false;
    t.obd_elm_ready = false;
    t.obd_ecu_state = IVTS_ECU_DISCONNECTED;
    assert(strcmp(line(&v, IVTS_STATUS_GNSS), "status gnss fix=no") == 0);
    assert(strcmp(line(&v, IVTS_STATUS_OBD), "status obd ble=down elm=no ecu=DISCONNECTED") == 0);

    char small[16];
    size_t n = ivts_status_format(&v, IVTS_STATUS_CORE, small, sizeof small);
    assert(n == sizeof small - 1u && strlen(small) == n);
    assert(ivts_status_format(&v, IVTS_STATUS_CORE, small, 0) == 0u);
    return 0;
}
