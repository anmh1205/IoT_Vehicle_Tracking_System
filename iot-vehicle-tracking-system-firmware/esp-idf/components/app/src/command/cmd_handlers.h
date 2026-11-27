#pragma once
#include "ivts_core/model/command.h"
#include "ivts_core/payload/json_fields.h"

typedef struct {
    char id[IVTS_CMD_ID_SIZE];
    char name[32];
    ivts_json_obj_t params;
    bool has_id;
    bool has_name;
    bool has_params;
} cmd_envelope_t;

typedef struct {
    const char *reason;
    bool awaits_completion;
} cmd_result_t;

/* Each handler runs in the app task. A reason is an MQTT error code. */
cmd_result_t cmd_table_dispatch(const cmd_envelope_t *command);
const char *cmd_ota_handle(const cmd_envelope_t *command);
const char *cmd_config_handle(const cmd_envelope_t *command);
const char *cmd_tracking_handle(const cmd_envelope_t *command);
const char *cmd_session_handle(const cmd_envelope_t *command);
const char *cmd_location_handle(const cmd_envelope_t *command);
const char *cmd_reboot_handle(const cmd_envelope_t *command);
const char *cmd_rollback_handle(const cmd_envelope_t *command);

/* Location completes asynchronously in the app task. */
void cmd_location_init(void);
void cmd_location_tick(uint64_t now_ms);
void cmd_inbox_complete(const char *reason);

/* Arm a restart only once the corresponding command receipt is durable. */
void cmd_restart_init(void);
bool cmd_restart_is_scheduled(void);
void cmd_restart_on_checkpoint(uint64_t now_ms);
void cmd_restart_on_ack(void);
void cmd_restart_tick(uint64_t now_ms);
