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

esp_err_t command_handler_init(config_t *config) {
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");
    s_config = config;
    s_tracking_enabled = true;
    s_location_requested = false;
    s_pending_action = COMMAND_ACTION_NONE;
    return ESP_OK;
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
