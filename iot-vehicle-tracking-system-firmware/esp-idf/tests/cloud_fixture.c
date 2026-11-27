#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "ivts_core/fsm/fsm.h"
#include "ivts_core/model/config.h"
#include "ivts_core/ota/contract.h"
#include "ivts_core/payload/payload.h"

static void check_heartbeat(void)
{
    ivts_fsm_t fsm;
    ivts_fsm_init(&fsm, 0, IVTS_WAKE_TIMER);
    const ivts_fsm_cfg_t cfg = { .awake_max_ms = 90000u, .sleep_enabled = true };
    ivts_fsm_in_t in = {
        .ignition = IVTS_IGN_OFF, .publish_idle = true, .link_expected = true,
    };
    ivts_fsm_out_t out;
    ivts_fsm_step(&fsm, &cfg, &in, &out);
    ivts_fsm_step(&fsm, &cfg, &in, &out);
    assert(fsm.state == IVTS_ST_HEARTBEAT);
    in.now = 200u;
    ivts_fsm_step(&fsm, &cfg, &in, &out);
    assert((out.actions & IVTS_ACT_PUBLISH_STATUS) != 0u);
    assert((out.actions & IVTS_ACT_SLEEP) == 0u);
    in.now = 300u;
    ivts_fsm_step(&fsm, &cfg, &in, &out);
    assert((out.actions & IVTS_ACT_SLEEP) == 0u);
    in.link_up = true;
    in.publish_idle = false;
    ivts_fsm_step(&fsm, &cfg, &in, &out);
    assert((out.actions & IVTS_ACT_SLEEP) == 0u);
    in.publish_idle = true;
    ivts_fsm_step(&fsm, &cfg, &in, &out);
    assert((out.actions & IVTS_ACT_SLEEP) != 0u);
}

static void check_fake_sleep(void)
{
    ivts_fsm_t fsm;
    ivts_fsm_init(&fsm, 0, IVTS_WAKE_POWER_ON);
    ivts_fsm_cfg_t cfg = {
        .heartbeat_s = 2, .parked_settle_ms = 100, .awake_max_ms = 90000,
        .sleep_enabled = false,
    };
    ivts_fsm_in_t in = { .ignition = IVTS_IGN_OFF, .publish_idle = true };
    ivts_fsm_out_t out;
    ivts_fsm_step(&fsm, &cfg, &in, &out);
    ivts_fsm_step(&fsm, &cfg, &in, &out);
    assert(fsm.state == IVTS_ST_PARKED);
    in.now = 100;
    ivts_fsm_step(&fsm, &cfg, &in, &out);
    assert((out.actions & IVTS_ACT_SLEEP) != 0u && out.sleep_mode == IVTS_SLEEP_FAKE);
    ivts_fsm_t sleeping = fsm;

    in.now = 2099;
    in.motion = IVTS_MOTION_MOVING;
    ivts_fsm_step(&fsm, &cfg, &in, &out);
    assert(fsm.state == IVTS_ST_SLEEP && !out.changed);
    in.now = 2100;
    ivts_fsm_step(&fsm, &cfg, &in, &out);
    assert(fsm.state == IVTS_ST_CHECK_IGN && fsm.wake == IVTS_WAKE_TIMER);

    in.now = 200;
    cfg.imu_wakeup_enabled = true;
    fsm = sleeping;
    ivts_fsm_step(&fsm, &cfg, &in, &out);
    assert(fsm.state == IVTS_ST_CHECK_IGN && fsm.wake == IVTS_WAKE_MOTION);

    in.motion = IVTS_MOTION_STATIONARY;
    in.ignition = IVTS_IGN_ON;
    fsm = sleeping;
    ivts_fsm_step(&fsm, &cfg, &in, &out);
    assert(fsm.state == IVTS_ST_CHECK_IGN && fsm.wake == IVTS_WAKE_OTHER);

    in.ignition = IVTS_IGN_OFF;
    cfg.sleep_enabled = true;
    fsm = sleeping;
    ivts_fsm_step(&fsm, &cfg, &in, &out);
    assert(fsm.state == IVTS_ST_CHECK_IGN && fsm.sleep_mode == IVTS_SLEEP_NONE);
}

static void check_provisioning(void)
{
    ivts_config_t cfg;
    ivts_config_defaults(&cfg);
    strcpy(cfg.device_id, "fleet-tracker");
    strcpy(cfg.auth_token, "fixture-token");
    strcpy(cfg.mqtt_host, "mqtt.example.test");
    strcpy(cfg.apn, "internet");
    cfg.mqtt_port = 8883u;
    assert(ivts_config_validate(&cfg, NULL, 0) == 0u);
    strcpy(cfg.device_id, "tracker/another-topic");
    assert(ivts_config_validate(&cfg, NULL, 0) != 0u);
    strcpy(cfg.device_id, "123456789012345678901234");
    assert(ivts_config_validate(&cfg, NULL, 0) != 0u);
}

static void check_record_order(const ivts_record_t *r)
{
    ivts_session_boundary_t boundary = {
        .kind = IVTS_BOUNDARY_STARTED, .session = r->session, .boot_id = r->boot_id, .seq = r->seq - 1u,
    };
    assert(!ivts_record_precedes_boundary(r, &boundary));
    boundary.kind = IVTS_BOUNDARY_ENDED;
    boundary.seq = r->seq + 1u;
    assert(ivts_record_precedes_boundary(r, &boundary));
    ivts_record_t later = *r;
    later.session.local_key++;
    later.seq = boundary.seq + 1u;
    assert(!ivts_record_precedes_boundary(&later, &boundary));
    boundary.boot_id = r->boot_id + 1u;
    boundary.seq = 1u;
    assert(ivts_record_precedes_boundary(r, &boundary));
}

int main(void)
{
    check_heartbeat();
    check_fake_sleep();
    check_provisioning();
    char token[128];
    memset(token, '"', sizeof token - 1u);
    token[sizeof token - 1u] = '\0';
    ivts_msg_meta_t meta = {
        .device_id = "fleet-tracker", .auth_token = token, .boot_id = 3u, .seq = 11u,
        .sent_unix_ms = UINT64_C(1795430406000), .time_trusted = true, .uptime_ms = 6000u,
    };
    ivts_record_t record = {
        .boot_id = 2u, .seq = 10u, .uptime_ms = 4000u, .captured_unix_ms = UINT64_C(1795430404000),
        .imu_delta_mmps2 = 3250u, .vehicle_mv = 13520u, .device_mv = 3980u,
        .ignition = IVTS_IGN_ON, .motion = IVTS_MOTION_MOVING, .vehicle = IVTS_VEH_MOVING_ON,
        .device = IVTS_DEV_ACTIVE, .session = { .boot_id = 1u, .local_key = 8u, .canonical_id = 9876u },
        .gnss = { .fix_valid = true, .src = IVTS_GNSS_SRC_FULL, .lon_e7 = 1061234567,
                  .speed_cm_s = 1000, .course_deg_x10 = 90, .sats = 12 },
        .obd = { .valid_mask = IVTS_OBD_HAS_RPM | IVTS_OBD_HAS_COOLANT, .rpm = 0u, .coolant_c = 92 },
    };
    check_record_order(&record);

    ivts_telemetry_t live = {
        .ignition = IVTS_IGN_ON, .motion = IVTS_MOTION_MOVING, .vehicle = IVTS_VEH_MOVING_ON,
        .device_state = IVTS_DEV_ACTIVE, .obd_ble_connected = true, .obd_elm_ready = true,
        .obd_ecu_state = IVTS_ECU_LIVE, .obd_sample_age_ms = 120u,
        .obd_readiness = {
            .valid = true, .mil_on = true, .reported_dtc_count = 8u,
            .misfire = IVTS_MON_INCOMPLETE, .fuel_system = IVTS_MON_UNSUPPORTED,
            .comprehensive_components = IVTS_MON_UNSUPPORTED, .catalyst = IVTS_MON_UNSUPPORTED,
            .heated_catalyst = IVTS_MON_UNSUPPORTED, .evaporative_system = IVTS_MON_UNSUPPORTED,
            .secondary_air_system = IVTS_MON_UNSUPPORTED, .ac_refrigerant = IVTS_MON_UNSUPPORTED,
            .oxygen_sensor = IVTS_MON_UNSUPPORTED, .oxygen_sensor_heater = IVTS_MON_UNSUPPORTED,
            .egr_vvt_system = IVTS_MON_UNSUPPORTED, .nmhc_catalyst = IVTS_MON_UNSUPPORTED,
            .nox_aftertreatment = IVTS_MON_UNSUPPORTED, .boost_pressure = IVTS_MON_UNSUPPORTED,
            .exhaust_gas_sensor = IVTS_MON_UNSUPPORTED, .pm_filter = IVTS_MON_UNSUPPORTED,
        },
    };
    live.dtc_stored.valid = live.dtc_pending.valid = live.dtc_permanent.valid = true;
    live.dtc_stored.count = live.dtc_pending.count = live.dtc_permanent.count = IVTS_DTC_MAX_CODES;
    for (size_t i = 0; i < IVTS_DTC_MAX_CODES; i++) {
        memcpy(live.dtc_stored.codes[i], "P0171", IVTS_DTC_CODE_SIZE);
        memcpy(live.dtc_pending.codes[i], "C0123", IVTS_DTC_CODE_SIZE);
        memcpy(live.dtc_permanent.codes[i], "U0100", IVTS_DTC_CODE_SIZE);
    }

    uint8_t encoded[IVTS_RECORD_MAX_SIZE];
    size_t len;
    assert(ivts_record_encode(&record, encoded, sizeof encoded, &len) == IVTS_OK);
    assert(len == IVTS_RECORD_V2_SIZE);
    ivts_record_t replay;
    for (size_t i = 0; i < len; i++) {
        assert(ivts_record_decode(encoded, i, &replay) != IVTS_OK);
    }
    assert(ivts_record_decode(encoded, len, &replay) == IVTS_OK);
    char json[IVTS_PAYLOAD_MAX];
    assert(ivts_payload_rawdata(&meta, &record, &live, json, sizeof json, NULL) == IVTS_OK);
    puts(json);
    assert(ivts_payload_rawdata(&meta, &replay, NULL, json, sizeof json, NULL) == IVTS_OK);
    puts(json);

    /* V1 ghi từ firmware cũ, gồm UTC của fix nhưng không có timestamp lấy mẫu riêng. */
    static const uint8_t legacy[IVTS_RECORD_V1_SIZE] = {
        1, 7, 0, 0, 0, 9, 0, 0, 0, 0, 172, 36, 13, 159, 1, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 1, 1,
    };
    assert(ivts_record_decode(legacy, sizeof legacy, &replay) == IVTS_OK);
    assert(replay.boot_id == 7u && replay.seq == 9u && replay.gnss.fix_valid);
    assert(replay.captured_unix_ms == replay.gnss.ts_unix_ms && replay.session.local_key == 0u);
    assert(ivts_payload_rawdata(&meta, &replay, NULL, json, sizeof json, NULL) == IVTS_OK);
    puts(json);

    assert(ivts_payload_status(&meta, &live, &record.session, IVTS_BOUNDARY_STARTED, false,
                               json, sizeof json, NULL) == IVTS_OK);
    puts(json);
    live.ignition = IVTS_IGN_OFF;
    live.vehicle = IVTS_VEH_PARKED_OFF;
    meta.time_trusted = false;
    meta.uptime_ms = 0u;
    assert(ivts_payload_status(&meta, &live, NULL, IVTS_BOUNDARY_NONE, true, json, sizeof json, NULL) == IVTS_OK);
    puts(json);
    assert(ivts_payload_event(&meta, 1001, "warning", "motion_detected", json, sizeof json, NULL) == IVTS_OK);
    puts(json);
    const ivts_fw_status_t fw = {
        .status = IVTS_OTA_ST_SUCCESS, .progress = 100u, .job_id = "deploy-7",
        .current_version = "2.1.0", .target_version = "2.1.0", .partition = "ota_1",
    };
    assert(ivts_payload_firmware(&meta, &fw, json, sizeof json, NULL) == IVTS_OK);
    puts(json);
}
