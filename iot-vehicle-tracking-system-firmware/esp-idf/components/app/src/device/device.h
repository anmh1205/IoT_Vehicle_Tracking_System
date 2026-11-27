/**
 * @file src/device/device.h
 * @brief Application access to device policy, link state and GNSS demand.
 *
 * Startup initializes device data and binds the policy callback. The app task then owns config,
 * broker observations and requested GNSS power without a mutex. Views borrow app-owned storage.
 * The modem owns actual link and GNSS state, while persistence stays with boot and command callers.
 */
#pragma once
#include <stdbool.h>
#include "ivts_core/model/config.h"
#include "ivts_core/event/event.h"
#include <stdint.h>

/**
 * @brief Borrow the current device configuration.
 *
 * @return Read-only app-owned storage. Its address is stable, and its contents change on configuration
 *     replacement.
 *
 * @note Context: Startup task before the app task starts, then the app task. Blocking: non-blocking.
 */
const ivts_config_t *app_device_config(void);
/**
 * @brief Replace the app configuration and invoke the bound policy callback.
 *
 * Copy the complete configuration before invoking the callback synchronously. Persistence and validation
 * belong
 * to the caller.
 *
 * @param config Non-null configuration copied by value.
 *
 * @note Context: Startup task before the app task starts, then the app task. Blocking: non-blocking.
 */
void app_device_set_config(const ivts_config_t *config);
/**
 * @brief Bind the runtime configuration callback.
 *
 * Binding alone leaves the current runtime policy unchanged.
 *
 * @param handler Function retained for later replacements, or NULL to clear the binding.
 *     The installed function must remain callable and receives a borrowed read-only configuration.
 *
 * @note Context: Startup task. Blocking: non-blocking.
 */
void app_device_bind_config_handler(void (*handler)(const ivts_config_t *config));
/**
 * @brief Read the current boot identity.
 *
 * @return Boot ID shared by new messages until the next startup establishes the identity.
 *
 * @note Context: Startup task before the app task starts, then the app task. Blocking: non-blocking.
 */
uint32_t app_device_boot_id(void);
/**
 * @brief Set the current boot identity.
 *
 * @param boot_id Newly allocated or retained 32-bit boot ID.
 *
 * @note Context: Startup task. Blocking: non-blocking.
 */
void app_device_set_boot_id(uint32_t boot_id);
/**
 * @brief Check whether startup accepted the device configuration.
 *
 * @retval true if startup set the provisioned flag.
 * @retval false if startup left the device unprovisioned.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool app_device_is_provisioned(void);
/**
 * @brief Set the app provisioning flag.
 *
 * @param provisioned Result of deployment-default resolution and configuration validation.
 *
 * @note Context: Startup task. Blocking: non-blocking.
 */
void app_device_set_provisioned(bool provisioned);
/**
 * @brief Read the current tracking policy flag.
 *
 * @retval true if tracking is enabled.
 * @retval false if tracking is disabled.
 *
 * @note Context: Startup task before the app task starts, then the app task. Blocking: non-blocking.
 */
bool app_device_tracking_enabled(void);
/**
 * @brief Set the in-memory tracking flag.
 *
 * The caller loads or saves the persisted setting separately.
 *
 * @param enabled True to enable tracking, false to disable it.
 *
 * @note Context: Startup task before the app task starts, then the app task. Blocking: non-blocking.
 */
void app_device_set_tracking_enabled(bool enabled);

/**
 * @brief Record the latest observed modem link.
 *
 * @param link New link level, copied by value.
 * @retval true if the stored link changes.
 * @retval false if it already matches.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool app_link_update(ivts_link_t link);
/**
 * @brief Check the app snapshot of broker connectivity.
 *
 * @retval true if the snapshot indicates broker up.
 * @retval false if the snapshot indicates any other link level.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool app_link_is_broker_up(void);

/**
 * @brief Combine FSM and command demand into a modem GNSS power request.
 *
 * The FSM request persists until an action changes it. A rejected modem request leaves the last accepted
 * request unchanged so a later call can retry. The modem owns hardware power state.
 *
 * @param actions FSM action mask. GNSS OFF takes precedence if both GNSS bits are set.
 * @param command_requests_gnss True while an outstanding command needs GNSS.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_gnss_arbiter_apply(uint32_t actions, bool command_requests_gnss);
