#pragma once

#include <stdbool.h>

#include "esp_err.h"
#include "app_config.h"
#include "nvs_config.h"
#include "ota_contract.h"

/**
 * @file command_handler.h
 * @brief MQTT command parser and command-consume interface for the state machine.
 * This header belongs to the connectivity domain layer and defines the domain boundary that adapters and app-core use without reimplementing the same rules.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief High-level actions produced by parsed cloud commands.
 */
typedef enum {
    /** No pending action. */
    COMMAND_ACTION_NONE = 0,
    /** Apply a queued runtime configuration update on the FSM task. */
    COMMAND_ACTION_APPLY_CONFIG,
    /** Reboot command requested by cloud. */
    COMMAND_ACTION_REBOOT,
    /** OTA update command accepted and queued. */
    COMMAND_ACTION_OTA_UPDATE,
    /** OTA rollback command accepted and queued. */
    COMMAND_ACTION_OTA_ROLLBACK,
    /** Canonical session assignment command accepted and queued. */
    COMMAND_ACTION_ASSIGN_SESSION,
} command_action_t;

/**
 * @brief Canonical session mapping sent back from cloud.
 */
typedef struct {
    /** Local session key created by firmware at IGN ON. */
    uint32_t local_session_key;
    /** Canonical cloud-wide session ID assigned by the server. */
    uint64_t canonical_session_id;
    /** Boot/session correlation ID that the assignment must match. */
    char boot_id[TRACKER_SESSION_BOOT_ID_LEN];
} command_session_assignment_t;

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
 * @param out_command_id Optional output for the cloud correlation ID. Set to 0
 *        when the payload is legacy or does not contain a valid command ID.
 *
 * @return ESP_OK when the command was accepted/staged.
 * @return ESP_ERR_INVALID_ARG when the command or params are invalid.
 * @return ESP_ERR_NOT_SUPPORTED for an unknown command verb.
 * @return ESP_ERR_NO_MEM when bounded command staging is full.
 * @return ESP_ERR_TIMEOUT when command state cannot be acquired in time.
 */
esp_err_t command_handler_process(const char *command_json, uint64_t *out_command_id);

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
 * @brief Apply the queued `update_config` payload consumed as current action.
 *
 * @return ESP_OK when the pending update was applied or was a no-op.
 * @return ESP_ERR_INVALID_STATE when no consumed config update is waiting.
 * @return Another ESP-IDF error code when validation or persistence fails.
 */
esp_err_t command_handler_apply_pending_config(void);

/**
 * @brief Consume pending OTA command payload.
 *
 * @param out_cmd Output OTA command structure.
 *
 * @return true when an OTA command was available and copied.
 * @return false when no OTA command is pending.
 */
bool command_handler_take_ota_command(ota_command_t *out_cmd);

/**
 * @brief Consume pending canonical session assignment payload.
 *
 * @param out_assignment Output canonical session mapping from cloud.
 *
 * @return true when a session assignment was available and copied.
 * @return false when no assignment is pending.
 */
bool command_handler_take_session_assignment(command_session_assignment_t *out_assignment);
