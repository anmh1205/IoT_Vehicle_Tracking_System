#include "util.h"

#include "util_internal.h"

/**
 * @file util.c
 * @brief Public compatibility facade for split utility and OTA helpers.
 */

bool s_sleep_enabled = false;
ota_http_action_state_t s_ota_http_action = {0};
bool s_ota_http_urc_registered = false;

esp_err_t util_ota_apply_update(const config_t *cfg,
                                const char *current_version,
                                const ota_command_t *cmd,
                                firmware_status_t *out_status,
                                ota_status_callback_t status_callback,
                                void *status_callback_ctx) {
    return util_ota_apply_update_internal(cfg,
                                          current_version,
                                          cmd,
                                          out_status,
                                          status_callback,
                                          status_callback_ctx);
}

esp_err_t util_ota_trigger_manual_rollback(firmware_status_t *out_status) {
    return util_ota_trigger_manual_rollback_internal(out_status);
}
