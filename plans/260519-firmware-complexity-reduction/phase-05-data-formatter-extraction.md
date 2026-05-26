---
phase: "05"
title: "data_formatter.c Function Extraction"
status: pending
priority: P2
effort: 2h
---

# Phase 05: data_formatter.c Function Extraction

## Context
- Audit report: `resources/docs/firmware-complexity-audit-2026-05-18.md`
- Plan: `plans/260519-firmware-complexity-reduction/plan.md`
- Depends on: Phase 01
- Target: avg lines/function 80 → 30

## Overview
data_formatter.c có 9 functions trong 720 lines (avg 80 lines/func). Phase này tách thành các hàm nhỏ hơn và extract state labels.

## Tasks

### 1. Extract OBD diagnostics builder

**data_format_rawdata()** hiện tại ~136 lines. Tách thành:

```c
static void data_formatter_add_obd_channel(cJSON *root, const telemetry_t *tel) {
    /** Build OBD connection status JSON object. */
    cJSON *channel = cJSON_CreateObject();
    if (channel == NULL) return;

    cJSON_AddBoolToObject(channel, "ble_obd_connected", tel->obd_ble_connected);
    cJSON_AddBoolToObject(channel, "elm_ready", tel->obd_elm_ready);
    cJSON_AddStringToObject(channel, "ecu_state",
        util_string_empty(tel->obd_ecu_state) ? "unknown" : tel->obd_ecu_state);
    cJSON_AddNumberToObject(channel, "poll_interval_ms", 1200);
    cJSON_AddNumberToObject(channel, "connect_fail_count_5m", tel->obd_connect_fail_count);

    cJSON_AddItemToObject(root, "obd_channel", channel);
}

static void data_formatter_add_obd_signals(cJSON *root, const telemetry_t *tel) {
    /** Build OBD sensor signals JSON object. */
    cJSON *signals = cJSON_CreateObject();
    if (signals == NULL) return;

    cJSON_AddNumberToObject(signals, "rpm", tel->obd_rpm);
    cJSON_AddNumberToObject(signals, "obd_speed_kph", tel->obd_speed);
    cJSON_AddNumberToObject(signals, "coolant_c", tel->obd_coolant_temp);
    cJSON_AddNumberToObject(signals, "fuel_level_pct", tel->obd_fuel_level);
    cJSON_AddNumberToObject(signals, "engine_load_pct", tel->obd_engine_load);

    cJSON_AddItemToObject(root, "obd_signals", signals);
}

static void data_formatter_add_obd_missing_signals(cJSON *root, const telemetry_t *tel) {
    /** Build list of missing OBD signals. */
    cJSON *missing = cJSON_CreateArray();
    if (missing == NULL) return;

    if (tel->obd_rpm == 0) data_formatter_append_string_item(missing, "rpm");
    if (tel->obd_speed == 0) data_formatter_append_string_item(missing, "obd_speed_kph");
    if (tel->obd_coolant_temp == 0) data_formatter_append_string_item(missing, "coolant_c");
    if (tel->obd_fuel_level == 0) data_formatter_append_string_item(missing, "fuel_level_pct");
    if (tel->obd_engine_load == 0) data_formatter_append_string_item(missing, "engine_load_pct");

    cJSON_AddItemToObject(root, "missing_signals", missing);
}

static void data_formatter_add_obd_events(cJSON *root, const telemetry_t *tel) {
    /** Build OBD event list (connect failures, etc). */
    cJSON *events = cJSON_CreateArray();
    if (events == NULL) return;

    if (tel->obd_connect_fail_count > 0) {
        cJSON *event = cJSON_CreateObject();
        cJSON_AddStringToObject(event, "code", "obd_connect_failed");
        cJSON_AddNumberToObject(event, "count_5m", tel->obd_connect_fail_count);
        cJSON_AddItemToArray(events, event);
    }

    cJSON_AddItemToObject(root, "obd_events", events);
}

static void data_formatter_add_obd_readiness(cJSON *root, const telemetry_t *tel) {
    /** Build OBD readiness monitor status and DTC codes. */
    cJSON *diagnostics = cJSON_CreateObject();
    if (diagnostics == NULL) return;

    cJSON_AddBoolToObject(diagnostics, "mil_on", tel->obd_readiness.mil_on);
    cJSON_AddNumberToObject(diagnostics, "dtc_count", tel->obd_readiness.dtc_count);

    /* Monitor status */
    cJSON *readiness = cJSON_CreateObject();
    data_formatter_add_monitor_status(readiness, "misfire", tel->obd_readiness.misfire);
    data_formatter_add_monitor_status(readiness, "fuel_system", tel->obd_readiness.fuel_system);
    data_formatter_add_monitor_status(readiness, "components", tel->obd_readiness.components);
    data_formatter_add_monitor_status(readiness, "catalyst", tel->obd_readiness.catalyst);
    data_formatter_add_monitor_status(readiness, "heated_catalyst", tel->obd_readiness.heated_catalyst);
    data_formatter_add_monitor_status(readiness, "evap_system", tel->obd_readiness.evap_system);
    data_formatter_add_monitor_status(readiness, "secondary_air", tel->obd_readiness.secondary_air);
    data_formatter_add_monitor_status(readiness, "ac_refrigerant", tel->obd_readiness.ac_refrigerant);
    data_formatter_add_monitor_status(readiness, "o2_sensor", tel->obd_readiness.o2_sensor);
    data_formatter_add_monitor_status(readiness, "o2_sensor_heater", tel->obd_readiness.o2_sensor_heater);
    data_formatter_add_monitor_status(readiness, "egr_system", tel->obd_readiness.egr_system);
    data_formatter_add_monitor_status(readiness, "pm_filter", tel->obd_readiness.pm_filter);
    cJSON_AddItemToObject(diagnostics, "readiness", readiness);

    /* DTC codes */
    cJSON *dtc = cJSON_CreateObject();
    data_formatter_add_dtc_codes(dtc, "stored", &tel->obd_stored_dtc);
    data_formatter_add_dtc_codes(dtc, "pending", &tel->obd_pending_dtc);
    data_formatter_add_dtc_codes(dtc, "permanent", &tel->obd_permanent_dtc);
    cJSON_AddItemToObject(diagnostics, "dtc", dtc);

    cJSON_AddItemToObject(root, "obd_diagnostics", diagnostics);
}
```

**data_format_rawdata()** sau refactor:
```c
char *data_format_rawdata(const tracker_device_config_t *cfg,
                          const telemetry_t *telemetry,
                          uint64_t effective_ts_ms,
                          bool timestamp_trusted,
                          const char *effective_schema_version) {
    cJSON *root = cJSON_CreateObject();
    if (root == NULL) return NULL;

    /* Root fields */
    cJSON_AddStringToObject(root, "device_id", cfg->device_id);
    cJSON_AddStringToObject(root, "auth_token", cfg->auth_token);
    cJSON_AddNumberToObject(root, "timestamp", (double)effective_ts_ms);
    cJSON_AddBoolToObject(root, "timestamp_trusted", timestamp_trusted);
    cJSON_AddNumberToObject(root, "uptime", (double)util_uptime_ms());

    /* Telemetry data */
    cJSON *data = cJSON_CreateObject();
    cJSON_AddNumberToObject(data, "imu_accel_delta_mps2", telemetry->imu_accel_delta_mps2);
    cJSON_AddNumberToObject(data, "vehicle_battery", telemetry->vehicle_battery);
    cJSON_AddNumberToObject(data, "device_battery", telemetry->device_battery);
    /* ... GNSS, ignition, error_code ... */
    cJSON_AddItemToObject(root, "data", data);

    /* OBD sections (extracted) */
    data_formatter_add_obd_channel(root, telemetry);
    data_formatter_add_obd_signals(root, telemetry);
    data_formatter_add_obd_missing_signals(root, telemetry);
    data_formatter_add_obd_events(root, telemetry);
    data_formatter_add_obd_readiness(root, telemetry);

    /* Diagnostics, state, alerts, session, metadata */
    data_formatter_add_diagnostics(root, telemetry);
    data_formatter_add_state(root, telemetry);
    data_formatter_add_runtime_alerts(root, telemetry);
    data_formatter_add_session_identity(root, ...);
    data_formatter_add_metadata(root, ...);

    char *json = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);
    return json;
}
```

### 2. Extract state labels

**TẠO MỚI**: `components/contracts-device-cloud/include/state_labels.h`
```c
#ifndef STATE_LABELS_H
#define STATE_LABELS_H

#include "telemetry_types.h"

/** Convert ignition state enum to human-readable label. */
const char *state_label_ignition(ignition_state_t state);

/** Convert motion state enum to human-readable label. */
const char *state_label_motion(motion_state_t state);

/** Convert vehicle state enum to human-readable label. */
const char *state_label_vehicle(vehicle_state_t state);

/** Convert device state enum to human-readable label. */
const char *state_label_device(device_state_t state);

/** Convert sleep mode enum to human-readable label. */
const char *state_label_sleep(sleep_mode_t state);

#endif /* STATE_LABELS_H */
```

**TẠO MỚI**: `components/contracts-device-cloud/src/state_labels.c`
```c
#include "state_labels.h"

const char *state_label_ignition(ignition_state_t state) {
    switch (state) {
        case IGNITION_STATE_ON:     return "on";
        case IGNITION_STATE_OFF:    return "off";
        case IGNITION_STATE_UNKNOWN: return "unknown";
        default:                    return "invalid";
    }
}

const char *state_label_motion(motion_state_t state) {
    switch (state) {
        case MOTION_STATE_MOVING:   return "moving";
        case MOTION_STATE_STATIONARY: return "stationary";
        case MOTION_STATE_UNKNOWN:  return "unknown";
        default:                    return "invalid";
    }
}

/* ... implement remaining label functions ... */
```

### 3. Update data_formatter.c imports

```c
// Thêm:
#include "state_labels.h"

// Thay thế calls:
// TRƯỚC: data_formatter_ignition_state_label(...)
// SAU:   state_label_ignition(...)
```

## Success Criteria
- [ ] data_format_rawdata() <= 50 lines
- [ ] data_formatter.c avg lines/function <= 30
- [ ] state_labels.c/h build và hoạt động
- [ ] JSON output không đổi
- [ ] Build pass

## Risk Assessment
- Low risk: Chỉ refactor structure
- Mitigation: So sánh JSON output trước/sau
