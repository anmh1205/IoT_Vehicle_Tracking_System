#include "data_formatter.h"

#include <inttypes.h>
#include <stdio.h>

#include "cJSON.h"

#include "util.h"

#define DATA_FORMATTER_DEFAULT_SCHEMA_VERSION "v1.0.0"
#define DATA_FORMATTER_STATE_SCHEMA_VERSION "v2.0.0"
#define DATA_FORMATTER_OBD_STALE_SAMPLE_MS 30000U

/**
 * @file data_formatter.c
 * @brief JSON payload builders for telemetry/status/event/firmware channels.
 * This translation unit belongs to the device-cloud contract layer and keeps payload-shaping rules and cloud-facing contract details aligned in one place.
 */

// File-local constants, retained state, and helper wiring stay private here so
// higher layers interact with this module through its exported contract.


/**
 * @brief Serialize cJSON object to compact string and free cJSON tree.
 *
 * @param root cJSON root object.
 *
 * @return Heap string from cJSON, caller frees with `cJSON_free`.
 */
static char *data_formatter_print(cJSON *root) {
    // Build the formatter print representation here so every caller emits the same contract.
    if (root == NULL) {
        return NULL;
    }

    char *json = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);
    return json;
}

/**
 * @brief Append standard metadata shared by firmware-originated payloads.
 *
 * @param[in,out] root Destination root JSON object.
 * @param[in] sent_at_ms Message timestamp written into metadata.
 * @param[in] message_id Optional message identifier.
 * @param[in] seq_no Monotonic sequence number for this channel.
 * @param[in] boot_id Boot identifier for correlation across payloads.
 * @param[in] schema_version Optional schema version override.
 */
static void data_formatter_add_metadata(cJSON *root,
                                        uint64_t sent_at_ms,
                                        const char *message_id,
                                        uint32_t seq_no,
                                        const char *boot_id,
                                        const char *schema_version) {
    // Build the formatter add metadata representation here so every caller emits the same contract.
    if (root == NULL) {
        return;
    }

    cJSON *metadata = cJSON_CreateObject();
    if (metadata == NULL) {
        return;
    }

    const char *effective_schema_version = util_string_empty(schema_version)
                                               ? DATA_FORMATTER_DEFAULT_SCHEMA_VERSION
                                               : schema_version;

    cJSON_AddStringToObject(metadata, "schema_version", effective_schema_version);
    if (!util_string_empty(message_id)) {
        cJSON_AddStringToObject(metadata, "message_id", message_id);
    }
    cJSON_AddNumberToObject(metadata, "sent_at", (double)sent_at_ms);
    cJSON_AddNumberToObject(metadata, "seq_no", (double)seq_no);
    if (!util_string_empty(boot_id)) {
        cJSON_AddStringToObject(metadata, "boot_id", boot_id);
    }

    cJSON_AddItemToObject(root, "metadata", metadata);
}

/**
 * @brief Append authoritative session-correlation fields to a payload root.
 *
 * @param[in,out] root Destination root JSON object.
 * @param[in] local_session_key Firmware-generated provisional session key.
 * @param[in] canonical_session_id Server-issued canonical session identifier.
 * @param[in] session_boot_id Boot identifier associated with the session.
 * @param[in] boundary_event Optional boundary event label.
 */
static void data_formatter_add_session_identity(cJSON *root,
                                                uint32_t local_session_key,
                                                uint64_t canonical_session_id,
                                                const char *session_boot_id,
                                                const char *boundary_event) {
    // Build the formatter add session identity representation here so every caller emits the same contract.
    if (root == NULL) {
        return;
    }

    if (local_session_key > 0U) {
        cJSON_AddNumberToObject(root, "local_session_key", (double)local_session_key);
    }
    if (canonical_session_id > 0U) {
        char canonical_session_id_text[32] = {0};
        (void)snprintf(canonical_session_id_text,
                       sizeof(canonical_session_id_text),
                       "%" PRIu64,
                       canonical_session_id);
        cJSON_AddStringToObject(root, "canonical_session_id", canonical_session_id_text);
    }
    if (!util_string_empty(session_boot_id)) {
        cJSON_AddStringToObject(root, "boot_id", session_boot_id);
    }
    if (!util_string_empty(boundary_event)) {
        cJSON_AddStringToObject(root, "boundary_event", boundary_event);
    }
}

/**
 * @brief Append a non-empty string into a JSON array.
 *
 * @param[in,out] array Destination JSON array.
 * @param[in] value String value to append.
 */
static void data_formatter_append_string_item(cJSON *array, const char *value) {
    // Build the formatter append string item representation here so every caller emits the same contract.
    if (array == NULL || util_string_empty(value)) {
        return;
    }

    cJSON *item = cJSON_CreateString(value);
    if (item != NULL) {
        cJSON_AddItemToArray(array, item);
    }
}

static const char *data_formatter_ignition_state_label(tracker_ignition_state_t state) {
    // Build the formatter ignition label representation here so every caller emits the same contract.
    switch (state) {
        case TRACKER_IGNITION_STATE_ON:
            return "ON";
        case TRACKER_IGNITION_STATE_OFF:
            return "OFF";
        case TRACKER_IGNITION_STATE_UNKNOWN:
        default:
            return "UNKNOWN";
    }
}

static const char *data_formatter_motion_state_label(tracker_motion_state_t state) {
    // Build the formatter motion label representation here so every caller emits the same contract.
    switch (state) {
        case TRACKER_MOTION_STATE_MOVING:
            return "MOVING";
        case TRACKER_MOTION_STATE_STATIONARY:
            return "STATIONARY";
        case TRACKER_MOTION_STATE_UNKNOWN:
        default:
            return "UNKNOWN";
    }
}

static const char *data_formatter_vehicle_state_label(tracker_vehicle_state_t state) {
    // Build the formatter vehicle label representation here so every caller emits the same contract.
    switch (state) {
        case TRACKER_VEHICLE_STATE_PARKED_OFF:
            return "PARKED_OFF";
        case TRACKER_VEHICLE_STATE_ROLLING_IGN_OFF:
            return "ROLLING_IGN_OFF";
        case TRACKER_VEHICLE_STATE_IDLING_ON:
            return "IDLING_ON";
        case TRACKER_VEHICLE_STATE_MOVING_ON:
            return "MOVING_ON";
        case TRACKER_VEHICLE_STATE_UNKNOWN_STATIONARY:
            return "UNKNOWN_STATIONARY";
        case TRACKER_VEHICLE_STATE_UNKNOWN_MOVING:
            return "UNKNOWN_MOVING";
        case TRACKER_VEHICLE_STATE_UNKNOWN:
        default:
            return "UNKNOWN";
    }
}

static const char *data_formatter_device_state_label(tracker_device_state_t state) {
    // Build the formatter device label representation here so every caller emits the same contract.
    switch (state) {
        case TRACKER_DEVICE_STATE_BOOTING:
            return "BOOTING";
        case TRACKER_DEVICE_STATE_ACTIVE:
            return "ACTIVE";
        case TRACKER_DEVICE_STATE_SLEEP_PREPARE:
            return "SLEEP_PREPARE";
        case TRACKER_DEVICE_STATE_SLEEPING:
            return "SLEEPING";
        case TRACKER_DEVICE_STATE_WAKING:
            return "WAKING";
        case TRACKER_DEVICE_STATE_ALARM:
            return "ALARM";
        case TRACKER_DEVICE_STATE_OTA:
            return "OTA";
        case TRACKER_DEVICE_STATE_FAULT:
            return "FAULT";
        default:
            return "ACTIVE";
    }
}

static const char *data_formatter_sleep_mode_label(tracker_sleep_mode_t mode) {
    // Build the formatter sleep mode label representation here so every caller emits the same contract.
    switch (mode) {
        case TRACKER_SLEEP_MODE_FAKE:
            return "FAKE";
        case TRACKER_SLEEP_MODE_LIGHT:
            return "LIGHT";
        case TRACKER_SLEEP_MODE_DEEP:
            return "DEEP";
        case TRACKER_SLEEP_MODE_NONE:
        default:
            return "NONE";
    }
}

/**
 * @brief Build the nested `state` object from runtime enum labels.
 *
 * @param[in,out] root Destination payload root.
 * @param[in] telemetry Telemetry snapshot providing state enums.
 */
static void data_formatter_add_state(cJSON *root, const telemetry_t *telemetry) {
    // Build the formatter add representation here so every caller emits the same contract.
    if (root == NULL || telemetry == NULL) {
        return;
    }

    cJSON *state = cJSON_CreateObject();
    if (state == NULL) {
        return;
    }

    cJSON_AddStringToObject(state,
                            "ignition_state",
                            data_formatter_ignition_state_label(telemetry->ignition_state));
    cJSON_AddStringToObject(state,
                            "motion_state",
                            data_formatter_motion_state_label(telemetry->motion_state));
    cJSON_AddStringToObject(state,
                            "vehicle_state",
                            data_formatter_vehicle_state_label(telemetry->vehicle_state));
    cJSON_AddStringToObject(state,
                            "device_state",
                            data_formatter_device_state_label(telemetry->device_state));
    cJSON_AddStringToObject(state,
                            "sleep_mode",
                            data_formatter_sleep_mode_label(telemetry->sleep_mode));
    cJSON_AddItemToObject(root, "state", state);
}

static void data_formatter_append_alert(cJSON *array,
                                        const char *code,
                                        const char *severity,
                                        const char *message) {
    // Build the formatter append alert representation here so every caller emits the same contract.
    if (array == NULL || util_string_empty(code) || util_string_empty(severity)) {
        return;
    }

    cJSON *item = cJSON_CreateObject();
    if (item == NULL) {
        return;
    }

    cJSON_AddStringToObject(item, "code", code);
    cJSON_AddStringToObject(item, "severity", severity);
    if (!util_string_empty(message)) {
        cJSON_AddStringToObject(item, "message", message);
    }
    cJSON_AddItemToArray(array, item);
}

/**
 * @brief Append runtime/device alerts derived from the current telemetry snapshot.
 *
 * @param[in,out] root Destination payload root.
 * @param[in] telemetry Telemetry snapshot used for alert derivation.
 */
static void data_formatter_add_runtime_alerts(cJSON *root, const telemetry_t *telemetry) {
    // Build the formatter add runtime alerts representation here so every caller emits the same contract.
    if (root == NULL || telemetry == NULL) {
        return;
    }

    cJSON *device_alerts = cJSON_AddArrayToObject(root, "device_alerts");
    cJSON *ecu_alerts = cJSON_AddArrayToObject(root, "ecu_alerts");
    if (device_alerts == NULL || ecu_alerts == NULL) {
        return;
    }

    if (telemetry->error_code != 0) {
        data_formatter_append_alert(device_alerts,
                                    "runtime_error",
                                    "high",
                                    "Device reported runtime error code");
    }

    if (telemetry->obd_connect_fail_count_5m > 0U) {
        data_formatter_append_alert(device_alerts,
                                    "obd_connect_failed",
                                    "medium",
                                    "OBD connection failed in recent 5-minute window");
    }

    if (telemetry->obd_readiness.valid && telemetry->obd_readiness.mil_on) {
        data_formatter_append_alert(ecu_alerts,
                                    "mil_on",
                                    "high",
                                    "ECU reported MIL active");
    }

    if (telemetry->obd_stored_dtc.count > 0U || telemetry->obd_permanent_dtc.count > 0U) {
        data_formatter_append_alert(ecu_alerts,
                                    "dtc_present",
                                    "high",
                                    "ECU reported stored or permanent diagnostic trouble codes");
    } else if (telemetry->obd_pending_dtc.count > 0U) {
        data_formatter_append_alert(ecu_alerts,
                                    "dtc_pending",
                                    "medium",
                                    "ECU reported pending diagnostic trouble codes");
    }
}

static const char *data_formatter_monitor_status_label(obd_monitor_status_t status) {
    // Build the formatter monitor status label representation here so every caller emits the same contract.
    switch (status) {
        case OBD_MONITOR_STATUS_COMPLETE:
            return "complete";
        case OBD_MONITOR_STATUS_INCOMPLETE:
            return "incomplete";
        case OBD_MONITOR_STATUS_UNSUPPORTED:
            return "unsupported";
        case OBD_MONITOR_STATUS_UNKNOWN:
        default:
            return NULL;
    }
}

static void data_formatter_add_monitor_status(cJSON *readiness,
                                              const char *key,
                                              obd_monitor_status_t status) {
    // Build the formatter add monitor status representation here so every caller emits the same contract.
    if (readiness == NULL || util_string_empty(key)) {
        return;
    }

    const char *label = data_formatter_monitor_status_label(status);
    if (label != NULL) {
        cJSON_AddStringToObject(readiness, key, label);
    }
}

static void data_formatter_add_dtc_codes(cJSON *dtc,
                                         const char *key,
                                         const obd_dtc_list_t *list) {
    // Build the formatter add DTC codes representation here so every caller emits the same contract.
    if (dtc == NULL || util_string_empty(key) || list == NULL) {
        return;
    }

    cJSON *codes = cJSON_AddArrayToObject(dtc, key);
    if (codes == NULL) {
        return;
    }

    for (uint8_t i = 0; i < list->count && i < TRACKER_OBD_MAX_DTC_CODES; ++i) {
        data_formatter_append_string_item(codes, list->codes[i]);
    }
}

/**
 * @brief Serialize the OBD diagnostics subtree for rawdata payloads.
 *
 * This helper owns the contract that prevents stale cached OBD values from
 * leaking into cloud telemetry when the BLE/ELM channel is disconnected or the
 * sample age is beyond the accepted freshness window.
 *
 * @param[in,out] root Destination payload root.
 * @param[in] telemetry Telemetry snapshot containing diagnostics fields.
 */
static void data_formatter_add_diagnostics(cJSON *root, const telemetry_t *telemetry) {
    // Build the diagnostics subtree here so channel state, freshness, readiness, and DTCs stay serialized consistently.
    if (root == NULL || telemetry == NULL) {
        return;
    }

    cJSON *diagnostics = cJSON_CreateObject();
    if (diagnostics == NULL) {
        return;
    }

    cJSON *channel = cJSON_AddObjectToObject(diagnostics, "channel");
    cJSON *signals = cJSON_AddObjectToObject(diagnostics, "signals");
    cJSON *quality = cJSON_AddObjectToObject(diagnostics, "quality");
    cJSON *events = cJSON_AddArrayToObject(diagnostics, "events");

    if (channel == NULL || signals == NULL || quality == NULL || events == NULL) {
        cJSON_Delete(diagnostics);
        return;
    }

    // Channel metadata is always emitted, even when signal values are intentionally suppressed as stale.
    cJSON_AddBoolToObject(channel, "ble_obd_connected", telemetry->obd_ble_connected);
    cJSON_AddBoolToObject(channel, "elm_ready", telemetry->obd_elm_ready);
    cJSON_AddStringToObject(channel,
                            "ecu_state",
                            util_string_empty(telemetry->obd_ecu_state) ? "unknown"
                                                                         : telemetry->obd_ecu_state);
    cJSON_AddNumberToObject(channel, "poll_interval_ms", 1200);
    cJSON_AddNumberToObject(channel, "connect_fail_count_5m", telemetry->obd_connect_fail_count_5m);

    /*
     * Do not serialize cached OBD values unless the channel is connected and the
     * sample is fresh. This prevents server data from showing "OBD disconnected"
     * together with old RPM/speed values from a previous connection.
     */
    bool obd_signals_valid = telemetry->obd_ble_connected &&
                             telemetry->obd_elm_ready &&
                             telemetry->obd_sample_age_ms <= DATA_FORMATTER_OBD_STALE_SAMPLE_MS;
    if (obd_signals_valid) {
        // Only fresh live OBD values make it into the payload; otherwise the quality block explains what is missing.
        cJSON_AddNumberToObject(signals, "rpm", telemetry->obd_rpm);
        cJSON_AddNumberToObject(signals, "obd_speed_kph", telemetry->obd_speed);
        cJSON_AddNumberToObject(signals, "coolant_c", telemetry->obd_coolant_temp);
        cJSON_AddNumberToObject(signals, "fuel_level_pct", telemetry->obd_fuel_level);
        cJSON_AddNumberToObject(signals, "engine_load_pct", telemetry->obd_engine_load);
    }

    cJSON_AddNumberToObject(quality, "sample_age_ms", telemetry->obd_sample_age_ms);
    cJSON *missing_signals = cJSON_AddArrayToObject(quality, "missing_signals");
    if (missing_signals != NULL && !obd_signals_valid) {
        // Missing-signal markers make stale/disconnected OBD situations explicit to backend consumers.
        data_formatter_append_string_item(missing_signals, "rpm");
        data_formatter_append_string_item(missing_signals, "obd_speed_kph");
        data_formatter_append_string_item(missing_signals, "coolant_c");
        data_formatter_append_string_item(missing_signals, "fuel_level_pct");
        data_formatter_append_string_item(missing_signals, "engine_load_pct");
    }

    if (telemetry->obd_connect_fail_count_5m > 0U) {
        // Connection-failure events expose recent OBD instability without polluting the main signal map.
        cJSON *event_item = cJSON_CreateObject();
        if (event_item != NULL) {
            cJSON_AddStringToObject(event_item, "code", "obd_connect_failed");
            cJSON_AddNumberToObject(event_item, "count_5m", telemetry->obd_connect_fail_count_5m);
            cJSON_AddItemToArray(events, event_item);
        }
    }

    if (telemetry->obd_readiness.valid) {
        // Readiness and MIL data are only emitted once the ECU has returned an authoritative readiness snapshot.
        cJSON_AddBoolToObject(diagnostics, "mil_on", telemetry->obd_readiness.mil_on);
        cJSON_AddNumberToObject(diagnostics,
                                "reported_dtc_count",
                                telemetry->obd_readiness.reported_dtc_count);

        cJSON *readiness = cJSON_AddObjectToObject(diagnostics, "readiness");
        if (readiness != NULL) {
            data_formatter_add_monitor_status(readiness, "misfire", telemetry->obd_readiness.misfire);
            data_formatter_add_monitor_status(readiness,
                                              "fuel_system",
                                              telemetry->obd_readiness.fuel_system);
            data_formatter_add_monitor_status(readiness,
                                              "comprehensive_components",
                                              telemetry->obd_readiness.comprehensive_components);
            data_formatter_add_monitor_status(readiness, "catalyst", telemetry->obd_readiness.catalyst);
            data_formatter_add_monitor_status(readiness,
                                              "heated_catalyst",
                                              telemetry->obd_readiness.heated_catalyst);
            data_formatter_add_monitor_status(readiness,
                                              "evaporative_system",
                                              telemetry->obd_readiness.evaporative_system);
            data_formatter_add_monitor_status(readiness,
                                              "secondary_air_system",
                                              telemetry->obd_readiness.secondary_air_system);
            data_formatter_add_monitor_status(readiness,
                                              "ac_refrigerant",
                                              telemetry->obd_readiness.ac_refrigerant);
            data_formatter_add_monitor_status(readiness,
                                              "oxygen_sensor",
                                              telemetry->obd_readiness.oxygen_sensor);
            data_formatter_add_monitor_status(readiness,
                                              "oxygen_sensor_heater",
                                              telemetry->obd_readiness.oxygen_sensor_heater);
            data_formatter_add_monitor_status(readiness,
                                              "egr_vvt_system",
                                              telemetry->obd_readiness.egr_vvt_system);
            data_formatter_add_monitor_status(readiness,
                                              "nmhc_catalyst",
                                              telemetry->obd_readiness.nmhc_catalyst);
            data_formatter_add_monitor_status(readiness,
                                              "nox_aftertreatment",
                                              telemetry->obd_readiness.nox_aftertreatment);
            data_formatter_add_monitor_status(readiness,
                                              "boost_pressure",
                                              telemetry->obd_readiness.boost_pressure);
            data_formatter_add_monitor_status(readiness,
                                              "exhaust_gas_sensor",
                                              telemetry->obd_readiness.exhaust_gas_sensor);
            data_formatter_add_monitor_status(readiness, "pm_filter", telemetry->obd_readiness.pm_filter);
        }
    }

    if (telemetry->obd_stored_dtc.valid ||
        telemetry->obd_pending_dtc.valid ||
        telemetry->obd_permanent_dtc.valid) {
        // DTC blocks remain optional so empty/stale fault history is not serialized as misleading zero-content objects.
        cJSON *dtc = cJSON_AddObjectToObject(diagnostics, "dtc");
        if (dtc != NULL) {
            data_formatter_add_dtc_codes(dtc, "stored", &telemetry->obd_stored_dtc);
            data_formatter_add_dtc_codes(dtc, "pending", &telemetry->obd_pending_dtc);
            data_formatter_add_dtc_codes(dtc, "permanent", &telemetry->obd_permanent_dtc);
        }
    }

    cJSON_AddItemToObject(root, "diagnostics", diagnostics);
}

/**
 * @brief Format raw telemetry payload.
 *
 * @param cfg Runtime configuration.
 * @param telemetry Telemetry snapshot.
 *
 * @return Heap JSON string or NULL on failure.
 */
char *data_format_rawdata(const config_t *cfg,
                          const telemetry_t *telemetry,
                          bool include_auth_token,
                          bool timestamp_trusted,
                          uint64_t timestamp_ms,
                          const char *message_id,
                          uint32_t seq_no,
                          const char *metadata_boot_id,
                          uint32_t local_session_key,
                          uint64_t canonical_session_id,
                          const char *session_boot_id) {
    // Build the format raw telemetry representation here so every caller emits the same contract.
    if (cfg == NULL || telemetry == NULL) {
        return NULL;
    }

    cJSON *root = cJSON_CreateObject();
    cJSON *data = cJSON_CreateObject();

    if (root == NULL || data == NULL) {
        cJSON_Delete(root);
        cJSON_Delete(data);
        return NULL;
    }

    /* Root metadata fields. */
    uint64_t effective_ts_ms = timestamp_ms == 0 ? telemetry->gnss.timestamp_ms : timestamp_ms;
    if (effective_ts_ms == 0) {
        effective_ts_ms = util_uptime_ms();
        timestamp_trusted = false;
    }

    cJSON_AddStringToObject(root, "device_id", cfg->device_id);
    if (include_auth_token) {
        cJSON_AddStringToObject(root, "auth_token", cfg->auth_token);
    }
    cJSON_AddNumberToObject(root, "timestamp", (double)effective_ts_ms);
    cJSON_AddBoolToObject(root, "timestamp_trusted", timestamp_trusted);
    cJSON_AddNumberToObject(root, "uptime", (double)util_uptime_ms());

    /* Nested telemetry object. */
    cJSON_AddNumberToObject(data, "imu_accel_delta_mps2", telemetry->imu_accel_delta_mps2);
    cJSON_AddNumberToObject(data, "vehicle_battery", telemetry->vehicle_battery);
    cJSON_AddNumberToObject(data, "device_battery", telemetry->device_battery);
    bool has_valid_gnss_fix = telemetry->gnss.fix_valid &&
                              telemetry->gnss.latitude != 0.0 &&
                              telemetry->gnss.longitude != 0.0;
    if (has_valid_gnss_fix) {
        cJSON_AddNumberToObject(data, "latitude", telemetry->gnss.latitude);
        cJSON_AddNumberToObject(data, "longitude", telemetry->gnss.longitude);
        cJSON_AddNumberToObject(data, "speed", telemetry->gnss.speed_kmh);
        cJSON_AddNumberToObject(data, "course", telemetry->gnss.course_deg);
    }
    cJSON_AddNumberToObject(data, "satellites", telemetry->gnss.satellites);
    bool published_ignition = telemetry->ignition;
    if (telemetry->ignition_state == TRACKER_IGNITION_STATE_ON) {
        published_ignition = true;
    } else if (telemetry->ignition_state == TRACKER_IGNITION_STATE_OFF) {
        published_ignition = false;
    }
    cJSON_AddBoolToObject(data, "ignition", published_ignition);
    cJSON_AddNumberToObject(data, "error_code", telemetry->error_code);

    cJSON_AddItemToObject(root, "data", data);
    data_formatter_add_diagnostics(root, telemetry);
    data_formatter_add_state(root, telemetry);
    data_formatter_add_runtime_alerts(root, telemetry);
    data_formatter_add_session_identity(root,
                                        local_session_key,
                                        canonical_session_id,
                                        session_boot_id,
                                        NULL);
    data_formatter_add_metadata(root,
                                effective_ts_ms,
                                message_id,
                                seq_no,
                                metadata_boot_id,
                                DATA_FORMATTER_STATE_SCHEMA_VERSION);
    return data_formatter_print(root);
}

/**
 * @brief Format status payload.
 *
 * @param cfg Runtime configuration.
 * @param status Status string.
 * @param session_id Optional session id.
 *
 * @return Heap JSON string or NULL on failure.
 */
char *data_format_status(const config_t *cfg,
                         const char *status,
                         uint32_t session_id,
                         const telemetry_t *telemetry,
                         bool include_auth_token,
                         bool timestamp_trusted,
                         uint64_t timestamp_ms,
                         const char *message_id,
                         uint32_t seq_no,
                         const char *metadata_boot_id,
                         uint32_t local_session_key,
                         uint64_t canonical_session_id,
                         const char *session_boot_id,
                         const char *boundary_event) {
    // Build the format status representation here so every caller emits the same contract.
    if (cfg == NULL || status == NULL) {
        return NULL;
    }

    cJSON *root = cJSON_CreateObject();
    if (root == NULL) {
        return NULL;
    }

    cJSON_AddStringToObject(root, "device_id", cfg->device_id);
    if (include_auth_token) {
        cJSON_AddStringToObject(root, "auth_token", cfg->auth_token);
    }
    uint64_t effective_ts_ms = timestamp_ms == 0 ? util_uptime_ms() : timestamp_ms;

    cJSON_AddStringToObject(root, "status", status);
    cJSON_AddNumberToObject(root, "timestamp", (double)effective_ts_ms);
    cJSON_AddBoolToObject(root, "timestamp_trusted", timestamp_trusted);
    if (session_id > 0) {
        cJSON_AddNumberToObject(root, "session_id", session_id);
    }

    data_formatter_add_state(root, telemetry);
    data_formatter_add_runtime_alerts(root, telemetry);
    data_formatter_add_session_identity(root,
                                        local_session_key,
                                        canonical_session_id,
                                        session_boot_id,
                                        util_string_empty(boundary_event) ? "none" : boundary_event);
    data_formatter_add_metadata(root,
                                effective_ts_ms,
                                message_id,
                                seq_no,
                                metadata_boot_id,
                                DATA_FORMATTER_STATE_SCHEMA_VERSION);
    return data_formatter_print(root);
}

/**
 * @brief Format event payload.
 *
 * @param cfg Runtime configuration.
 * @param event_type Event type.
 * @param code Event code.
 * @param message Optional message.
 *
 * @return Heap JSON string or NULL on failure.
 */
char *data_format_event(const config_t *cfg,
                        const char *event_type,
                        int code,
                        const char *message,
                        bool include_auth_token,
                        bool timestamp_trusted,
                        uint64_t timestamp_ms,
                        const char *message_id,
                        uint32_t seq_no,
                        const char *boot_id) {
    // Build the format event representation here so every caller emits the same contract.
    if (cfg == NULL || event_type == NULL) {
        return NULL;
    }

    cJSON *root = cJSON_CreateObject();
    if (root == NULL) {
        return NULL;
    }

    cJSON_AddStringToObject(root, "device_id", cfg->device_id);
    if (include_auth_token) {
        cJSON_AddStringToObject(root, "auth_token", cfg->auth_token);
    }
    uint64_t effective_ts_ms = timestamp_ms == 0 ? util_uptime_ms() : timestamp_ms;

    cJSON_AddStringToObject(root, "event_type", event_type);
    cJSON_AddNumberToObject(root, "code", code);
    if (!util_string_empty(message)) {
        cJSON_AddStringToObject(root, "message", message);
    }
    cJSON_AddNumberToObject(root, "timestamp", (double)effective_ts_ms);
    cJSON_AddBoolToObject(root, "timestamp_trusted", timestamp_trusted);

    data_formatter_add_metadata(root,
                                effective_ts_ms,
                                message_id,
                                seq_no,
                                boot_id,
                                DATA_FORMATTER_DEFAULT_SCHEMA_VERSION);
    return data_formatter_print(root);
}

/**
 * @brief Format firmware status payload.
 *
 * @param cfg Runtime configuration.
 * @param status Firmware status object.
 *
 * @return Heap JSON string or NULL on failure.
 */
char *data_format_firmware(const config_t *cfg,
                           const firmware_status_t *status,
                           bool include_auth_token,
                           bool timestamp_trusted,
                           uint64_t timestamp_ms,
                           const char *message_id,
                           uint32_t seq_no,
                           const char *boot_id) {
    // Build the format firmware representation here so every caller emits the same contract.
    if (cfg == NULL || status == NULL) {
        return NULL;
    }

    cJSON *root = cJSON_CreateObject();
    if (root == NULL) {
        return NULL;
    }

    cJSON_AddStringToObject(root, "device_id", cfg->device_id);
    if (include_auth_token) {
        cJSON_AddStringToObject(root, "auth_token", cfg->auth_token);
    }
    uint64_t effective_ts_ms = timestamp_ms == 0 ? util_uptime_ms() : timestamp_ms;

    const char *job_id = status->job_id;
    if (util_string_empty(job_id)) {
        job_id = boot_id;
    }
    if (util_string_empty(job_id)) {
        job_id = "boot";
    }

    cJSON_AddStringToObject(root, "jobId", job_id);
    cJSON_AddStringToObject(root, "status", status->status);
    cJSON_AddNumberToObject(root, "progress", status->progress);
    cJSON_AddStringToObject(root, "targetVersion", status->target_version);
    cJSON_AddStringToObject(root, "currentVersion", status->current_version);
    if (!util_string_empty(status->partition)) {
        cJSON_AddStringToObject(root, "partition", status->partition);
    }
    if (!util_string_empty(status->error)) {
        cJSON_AddStringToObject(root, "error", status->error);
    }
    cJSON_AddNumberToObject(root, "timestamp", (double)effective_ts_ms);
    cJSON_AddBoolToObject(root, "timestamp_trusted", timestamp_trusted);

    data_formatter_add_metadata(root,
                                effective_ts_ms,
                                message_id,
                                seq_no,
                                boot_id,
                                DATA_FORMATTER_DEFAULT_SCHEMA_VERSION);
    return data_formatter_print(root);
}
