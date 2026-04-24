#pragma once

#include <stdbool.h>

#include "esp_err.h"
#include "app_config.h"
#include "ota_contract.h"

/**
 * @file command_handler.h
 * @brief MQTT command parser and command-consume interface for the state machine.
 */

/**
 * @brief High-level actions produced by parsed cloud commands.
 */
typedef enum {
    /** No pending action. */
    COMMAND_ACTION_NONE = 0,
    /** Force immediate location publish request. */
    COMMAND_ACTION_REQUEST_LOCATION,
    /** Reboot command requested by cloud. */
    COMMAND_ACTION_REBOOT,
    /** OTA update command accepted and queued. */
    COMMAND_ACTION_OTA_UPDATE,
    /** OTA rollback command accepted and queued. */
    COMMAND_ACTION_OTA_ROLLBACK,
} command_action_t;

/**
 * @brief Initialize command handler with writable runtime config.
 *
 * @param config Mutable config object used for `update_config`.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t command_handler_init(config_t *config);

/**
 * @brief Parse and apply command JSON payload.
 *
 * @param command_json Raw JSON command payload.
 */
void command_handler_process(const char *command_json);

/**
 * @brief Consume one-shot location-request flag.
 *
 * @return true if a location request was pending, otherwise false.
 */
bool command_handler_consume_location_request(void);

/**
 * @brief Read current tracking enabled/disabled state.
 *
 * @return true when tracking is enabled.
 */
bool command_handler_is_tracking_enabled(void);

/**
 * @brief Consume pending action (if any).
 *
 * @return Consumed action value.
 */
command_action_t command_handler_consume_action(void);

/**
 * @brief Consume pending OTA command payload.
 *
 * @param out_cmd Output OTA command structure.
 *
 * @return true when an OTA command was available and copied.
 * @return false when no OTA command is pending.
 */
bool command_handler_take_ota_command(ota_command_t *out_cmd);
