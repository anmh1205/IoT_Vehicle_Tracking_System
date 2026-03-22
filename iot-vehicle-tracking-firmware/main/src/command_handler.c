#include "command_handler.h"

#include <string.h>

#include "cJSON.h"

#include "esp_log.h"

#include "nvs_config.h"
#include "util.h"

static const char *TAG = "COMMAND_HANDLER";

static config_t *s_config = NULL;
static bool s_tracking_enabled = true;
static bool s_location_requested = false;
static command_action_t s_pending_action = COMMAND_ACTION_NONE;
static ota_command_t s_ota_command = {0};

esp_err_t command_handler_init(config_t *config) {
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");
    s_config = config;
    s_tracking_enabled = true;
    s_location_requested = false;
    s_pending_action = COMMAND_ACTION_NONE;
    memset(&s_ota_command, 0, sizeof(s_ota_command));
    return ESP_OK;
}

static bool command_parse_ota_update(const cJSON *params, ota_command_t *out_cmd) {
    if (params == NULL || out_cmd == NULL || !cJSON_IsObject(params)) {
        return false;
    }

    const cJSON *job_id = cJSON_GetObjectItemCaseSensitive(params, "jobId");
    const cJSON *version = cJSON_GetObjectItemCaseSensitive(params, "version");
    const cJSON *url = cJSON_GetObjectItemCaseSensitive(params, "url");
    const cJSON *size = cJSON_GetObjectItemCaseSensitive(params, "size");
    const cJSON *sha256 = cJSON_GetObjectItemCaseSensitive(params, "sha256");

    if (!cJSON_IsString(job_id) || util_string_empty(job_id->valuestring) ||
        !cJSON_IsString(version) || util_string_empty(version->valuestring) ||
        !cJSON_IsString(url) || util_string_empty(url->valuestring) ||
        !cJSON_IsNumber(size) || size->valuedouble <= 0 ||
        !cJSON_IsString(sha256) || strlen(sha256->valuestring) != 64) {
        return false;
    }

    memset(out_cmd, 0, sizeof(*out_cmd));
    out_cmd->pending = true;
    out_cmd->rollback_pending = false;
    out_cmd->size = (uint32_t)size->valuedouble;

    const cJSON *force = cJSON_GetObjectItemCaseSensitive(params, "force");
    out_cmd->force = cJSON_IsBool(force) ? cJSON_IsTrue(force) : false;

    const cJSON *confirm_timeout = cJSON_GetObjectItemCaseSensitive(params, "confirmTimeoutSec");
    if (cJSON_IsNumber(confirm_timeout) && confirm_timeout->valuedouble > 0) {
        out_cmd->confirm_timeout_sec = (uint32_t)confirm_timeout->valuedouble;
    } else {
        out_cmd->confirm_timeout_sec = 180;
    }

    util_copy_string(out_cmd->job_id, sizeof(out_cmd->job_id), job_id->valuestring);
    util_copy_string(out_cmd->version, sizeof(out_cmd->version), version->valuestring);
    util_copy_string(out_cmd->url, sizeof(out_cmd->url), url->valuestring);
    util_copy_string(out_cmd->sha256, sizeof(out_cmd->sha256), sha256->valuestring);

    return true;
}

static void command_apply_update_config(const cJSON *params) {
    if (s_config == NULL || params == NULL) {
        return;
    }

    const cJSON *tracking = cJSON_GetObjectItemCaseSensitive(params, "tracking_interval_s");
    if (cJSON_IsNumber(tracking) && tracking->valuedouble >= 1.0) {
        s_config->tracking_interval_s = (uint16_t)util_clamp_int((int)tracking->valuedouble, 1, 3600);
    }

    const cJSON *heartbeat = cJSON_GetObjectItemCaseSensitive(params, "heartbeat_interval_s");
    if (cJSON_IsNumber(heartbeat) && heartbeat->valuedouble >= 60.0) {
        s_config->heartbeat_interval_s = (uint16_t)util_clamp_int((int)heartbeat->valuedouble, 60, 86400);
    }

    if (nvs_config_save(s_config) != ESP_OK) {
        ESP_LOGW(TAG, "Failed to persist updated config");
    }
}

void command_handler_process(const char *command_json) {
    if (util_string_empty(command_json)) {
        return;
    }

    cJSON *root = cJSON_Parse(command_json);
    if (root == NULL) {
        ESP_LOGW(TAG, "Invalid command JSON");
        return;
    }

    const cJSON *command = cJSON_GetObjectItemCaseSensitive(root, "command");
    const cJSON *params = cJSON_GetObjectItemCaseSensitive(root, "params");

    if (!cJSON_IsString(command) || util_string_empty(command->valuestring)) {
        cJSON_Delete(root);
        return;
    }

    if (strcmp(command->valuestring, "update_config") == 0) {
        if (cJSON_IsObject(params)) {
            command_apply_update_config(params);
        }
    } else if (strcmp(command->valuestring, "request_location") == 0) {
        s_location_requested = true;
        s_pending_action = COMMAND_ACTION_REQUEST_LOCATION;
    } else if (strcmp(command->valuestring, "enable_tracking") == 0) {
        const cJSON *enabled = cJSON_GetObjectItemCaseSensitive(params, "enabled");
        if (cJSON_IsBool(enabled)) {
            s_tracking_enabled = cJSON_IsTrue(enabled);
        }
    } else if (strcmp(command->valuestring, "reboot") == 0) {
        s_pending_action = COMMAND_ACTION_REBOOT;
    } else if (strcmp(command->valuestring, "ota_update") == 0) {
        ota_command_t parsed = {0};
        if (command_parse_ota_update(params, &parsed)) {
            s_ota_command = parsed;
            s_pending_action = COMMAND_ACTION_OTA_UPDATE;
        } else {
            ESP_LOGW(TAG, "Invalid ota_update params");
        }
    } else if (strcmp(command->valuestring, "manual_rollback") == 0 ||
               strcmp(command->valuestring, "ota_rollback") == 0) {
        memset(&s_ota_command, 0, sizeof(s_ota_command));
        s_ota_command.rollback_pending = true;
        s_ota_command.pending = false;
        s_pending_action = COMMAND_ACTION_OTA_ROLLBACK;
    }

    cJSON_Delete(root);
}

bool command_handler_consume_location_request(void) {
    bool current = s_location_requested;
    s_location_requested = false;
    return current;
}

bool command_handler_is_tracking_enabled(void) {
    return s_tracking_enabled;
}

command_action_t command_handler_consume_action(void) {
    command_action_t current = s_pending_action;
    s_pending_action = COMMAND_ACTION_NONE;
    return current;
}

bool command_handler_take_ota_command(ota_command_t *out_cmd) {
    if (out_cmd == NULL) {
        return false;
    }

    if (!s_ota_command.pending && !s_ota_command.rollback_pending) {
        return false;
    }

    *out_cmd = s_ota_command;
    memset(&s_ota_command, 0, sizeof(s_ota_command));
    return true;
}
