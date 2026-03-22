#pragma once

#include <stdbool.h>

#include "app_config.h"
#include "esp_err.h"

typedef enum {
    COMMAND_ACTION_NONE = 0,
    COMMAND_ACTION_REQUEST_LOCATION,
    COMMAND_ACTION_REBOOT,
    COMMAND_ACTION_OTA_UPDATE,
    COMMAND_ACTION_OTA_ROLLBACK,
} command_action_t;

esp_err_t command_handler_init(config_t *config);
void command_handler_process(const char *command_json);
bool command_handler_consume_location_request(void);
bool command_handler_is_tracking_enabled(void);
command_action_t command_handler_consume_action(void);
bool command_handler_take_ota_command(ota_command_t *out_cmd);
