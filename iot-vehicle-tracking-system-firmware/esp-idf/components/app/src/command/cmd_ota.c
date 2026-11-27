/**
 * @file cmd_ota.c
 * @brief Command handlers for firmware update and rollback.
 *
 * Parses cloud parameters and delegates execution to the application
 * firmware-update policy and the OTA adapter.
 */
#include "command/command.h"
#include <string.h>
#include "fw_update.h"

static bool validate_ota_url(const char *url)
{
    return !(strncmp(url, "https://", 8u) != 0 || url[8] == '\0' ||
        strpbrk(url, "\"\\\r\n\t ") != NULL);
}

static uint32_t clamp_confirm_timeout(uint64_t t)
{
    if (t < IVTS_OTA_CONFIRM_MIN_S) { t = IVTS_OTA_CONFIRM_MIN_S; }
    if (t > IVTS_OTA_CONFIRM_MAX_S) { t = IVTS_OTA_CONFIRM_MAX_S; }
    return (uint32_t)t;
}

static const char *parse_ota_manifest(const ivts_json_obj_t *params, ivts_ota_cmd_t *cmd)
{
    uint64_t size;
    uint8_t digest[32];
    if (!ivts_json_obj_get_str(params, "url", cmd->url, sizeof cmd->url) ||
        !ivts_json_obj_get_str(params, "sha256", cmd->sha256_hex, sizeof cmd->sha256_hex) ||
        ivts_sha256_hex_decode(cmd->sha256_hex, digest) != IVTS_OK ||
        !ivts_json_obj_get_str(params, "version", cmd->version, sizeof cmd->version) || cmd->version[0] == '\0' ||
        !ivts_json_obj_get_u64(params, "size", UINT32_MAX, &size) || size == 0u) {
        return "invalid_manifest";
    }
    if (!validate_ota_url(cmd->url)) { return "invalid_url"; }
    if (!ivts_json_obj_get_str(params, "jobId", cmd->job_id, sizeof cmd->job_id) &&
        !ivts_json_obj_get_str(params, "job_id", cmd->job_id, sizeof cmd->job_id)) { return "invalid_job_id"; }
    if (cmd->job_id[0] == '\0') { return "invalid_job_id"; }
    cmd->size = (uint32_t)size;
    if (ivts_json_obj_has(params, "force") && !ivts_json_obj_get_bool(params, "force", &cmd->force)) {
        return "invalid_force";
    }
    uint64_t t = IVTS_OTA_CONFIRM_DEFAULT_S;
    const char *timeout_key = ivts_json_obj_has(params, "confirmTimeoutSec")
                            ? "confirmTimeoutSec" : "confirm_timeout_sec";
    if (ivts_json_obj_has(params, timeout_key) &&
        !ivts_json_obj_get_u64(params, timeout_key, UINT32_MAX, &t)) {
        return "invalid_confirm_timeout";
    }
    cmd->confirm_timeout_s = clamp_confirm_timeout(t);
    return NULL;
}

const char *cmd_ota_handle(const cmd_envelope_t *command)
{
    ivts_ota_cmd_t cmd;
    memset(&cmd, 0, sizeof cmd);
    const char *reason = parse_ota_manifest(&command->params, &cmd);
    return reason != NULL ? reason : app_fw_update_try_start(&cmd);
}
