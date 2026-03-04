#include "data_formatter.h"

#include "cJSON.h"

#include "esp_log.h"

#include "util.h"

static const char *TAG = "DATA_FORMATTER";

static char *data_formatter_print(cJSON *root) {
    if (root == NULL) {
        return NULL;
    }

    char *json = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);
    return json;
}

char *data_format_rawdata(const config_t *cfg, const telemetry_t *telemetry) {
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

    cJSON_AddStringToObject(root, "device_id", cfg->device_id);
    cJSON_AddStringToObject(root, "auth_token", cfg->auth_token);
    cJSON_AddNumberToObject(root, "timestamp", (double)telemetry->gnss.timestamp_ms);
    cJSON_AddNumberToObject(root, "uptime", (double)util_uptime_ms());

    cJSON_AddNumberToObject(data, "vibration", telemetry->vibration);
    cJSON_AddNumberToObject(data, "battery_top", telemetry->battery_top);
    cJSON_AddNumberToObject(data, "battery_bot", telemetry->battery_bot);
    cJSON_AddNumberToObject(data, "latitude", telemetry->gnss.latitude);
    cJSON_AddNumberToObject(data, "longitude", telemetry->gnss.longitude);
    cJSON_AddNumberToObject(data, "speed", telemetry->gnss.speed_kmh);
    cJSON_AddNumberToObject(data, "course", telemetry->gnss.course_deg);
    cJSON_AddNumberToObject(data, "satellites", telemetry->gnss.satellites);
    cJSON_AddBoolToObject(data, "ignition", telemetry->ignition);
    cJSON_AddNumberToObject(data, "error_code", telemetry->error_code);

    cJSON_AddItemToObject(root, "data", data);
    return data_formatter_print(root);
}

char *data_format_status(const config_t *cfg, const char *status, uint32_t session_id) {
    if (cfg == NULL || status == NULL) {
        return NULL;
    }

    cJSON *root = cJSON_CreateObject();
    if (root == NULL) {
        return NULL;
    }

    cJSON_AddStringToObject(root, "device_id", cfg->device_id);
    cJSON_AddStringToObject(root, "auth_token", cfg->auth_token);
    cJSON_AddStringToObject(root, "status", status);
    cJSON_AddNumberToObject(root, "timestamp", (double)util_uptime_ms());
    if (session_id > 0) {
        cJSON_AddNumberToObject(root, "session_id", session_id);
    }

    return data_formatter_print(root);
}

char *data_format_event(const config_t *cfg, const char *event_type, int code, const char *message) {
    if (cfg == NULL || event_type == NULL) {
        return NULL;
    }

    cJSON *root = cJSON_CreateObject();
    if (root == NULL) {
        return NULL;
    }

    cJSON_AddStringToObject(root, "device_id", cfg->device_id);
    cJSON_AddStringToObject(root, "auth_token", cfg->auth_token);
    cJSON_AddStringToObject(root, "event_type", event_type);
    cJSON_AddNumberToObject(root, "code", code);
    if (!util_string_empty(message)) {
        cJSON_AddStringToObject(root, "message", message);
    }
    cJSON_AddNumberToObject(root, "timestamp", (double)util_uptime_ms());

    return data_formatter_print(root);
}

char *data_format_firmware(const config_t *cfg, const firmware_status_t *status) {
    if (cfg == NULL || status == NULL) {
        return NULL;
    }

    cJSON *root = cJSON_CreateObject();
    if (root == NULL) {
        return NULL;
    }

    cJSON_AddStringToObject(root, "device_id", cfg->device_id);
    cJSON_AddStringToObject(root, "auth_token", cfg->auth_token);
    cJSON_AddStringToObject(root, "status", status->status);
    cJSON_AddNumberToObject(root, "progress", status->progress);
    cJSON_AddStringToObject(root, "targetVersion", status->target_version);
    if (!util_string_empty(status->error)) {
        cJSON_AddStringToObject(root, "error", status->error);
    }

    return data_formatter_print(root);
}
