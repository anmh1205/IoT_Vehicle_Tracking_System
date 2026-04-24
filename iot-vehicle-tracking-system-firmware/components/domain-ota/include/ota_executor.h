#pragma once

#include "app_config.h"
#include "esp_err.h"
#include "ota_contract.h"

/**
 * @file ota_executor.h
 * @brief OTA apply and rollback entrypoints owned by the OTA domain.
 */

typedef void (*ota_status_callback_t)(const firmware_status_t *status, void *user_ctx);

esp_err_t util_ota_apply_update(const config_t *cfg,
                                const char *current_version,
                                const ota_command_t *cmd,
                                firmware_status_t *out_status,
                                ota_status_callback_t status_callback,
                                void *status_callback_ctx);

esp_err_t util_ota_trigger_manual_rollback(firmware_status_t *out_status);
