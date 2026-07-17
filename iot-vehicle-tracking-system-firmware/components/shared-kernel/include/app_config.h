#pragma once

#include "runtime_config.h"

/**
 * @file app_config.h
 * @brief Runtime-config defaults and validation helpers.
 * This header belongs to the shared kernel layer and collects the shared models, bounds, and helper contracts that multiple components reuse.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Fill configuration structure with safe built-in defaults.
 *
 * @param config Output config pointer to initialize.
 */
void app_config_set_defaults(config_t *config);

/**
 * @brief Validate configuration for required fields and constraints.
 *
 * @param config Config pointer to validate.
 *
 * @return true when configuration can be used by runtime modules.
 * @return false when required fields are missing or out of range.
 */
bool app_config_is_valid(const config_t *config);
