/**
 * @file src/boot/boot.h
 * @brief Private startup composition and configuration mapping interfaces.
 *
 * The entry point initializes producers on the startup task before launching the app task.
 * Adapter setup copies its local configuration. Runtime configuration updates reuse the
 * policy mapper on the app task, while validation and persistence belong to command handling.
 */
#pragma once
#include <stdbool.h>
#include "ivts_core/model/config.h"
#include "ivts_core/event/event.h"

/**
 * @brief Initialize app dependencies in startup order.
 *
 * Restore persistent app state and identity before publishing is enabled. Register callbacks before launching
 * the app task. The entry point handles fatal startup failures.
 *
 * @retval true when mandatory initialization succeeds.
 * @retval false when mandatory initialization fails. Some producers may already be running.
 *
 * @note Context: Startup task. Blocking: synchronous adapter and NVS setup. Broker connection and BLE
 * discovery run on workers.
 */
bool app_boot_init(void);

/**
 * @brief Map device policy and board capabilities to axes and FSM settings.
 *
 * Copy the resulting policy into the runtime. Boot and command callers handle validation and persistence.
 *
 * @param config Non-null policy borrowed for the call. Intervals use the units in the configuration fields.
 *
 * @note Context: Startup task before the app task starts, then the app task. Blocking: non-blocking.
 */
void app_config_apply(const ivts_config_t *config);

/**
 * @brief Initialize board hardware and start its sampling task.
 *
 * @param sink Event callback and context copied by value. Its queue must already exist.
 * @retval true when mandatory board setup succeeds, including degraded operation without IMU or RTC.
 * @retval false when board initialization returns an error.
 *
 * @note Context: Startup task. Blocking: synchronous ADC and I2C setup, including sensor probes.
 */
bool app_wiring_init_board(ivts_sink_t sink);
/**
 * @brief Initialize storage and start its worker.
 *
 * @param sink Event callback and context copied by value. Its queue must already exist.
 * @retval true when storage initialization succeeds, including degraded operation without SD.
 * @retval false when storage initialization returns an error.
 *
 * @note Context: Startup task. Blocking: synchronous NVS initialization and, when enabled, SD mount and
 * offline queue recovery.
 */
bool app_wiring_init_storage(ivts_sink_t sink);
/**
 * @brief Initialize the modem and request a link for a provisioned device.
 *
 * The modem copies its configuration. Provisioning enables submission of the link request. A failed request
 * does not change the initialization result.
 *
 * @param sink Event callback and context copied by value. Its queue must already exist.
 * @param[in,out] config Non-null device configuration borrowed for setup. The last bytes of the device ID
 *     and auth token are set to NUL if unprovisioned.
 * @param provisioned True if deployment defaults and configuration validation succeed.
 * @retval true when the modem is initialized.
 * @retval false when modem initialization returns an error.
 *
 * @note Context: Startup task. Blocking: synchronous modem setup followed by a zero-wait link request.
 */
bool app_wiring_init_modem(ivts_sink_t sink, ivts_config_t *config, bool provisioned);
/**
 * @brief Configure and start the OBD worker.
 *
 * An initialization failure is logged and startup continues.
 *
 * @param sink Event callback and context copied by value. Its queue must already exist.
 * @param config Non-null device configuration borrowed for the call. A terminated BLE address is copied.
 *
 * @note Context: Startup task. Blocking: synchronous setup. BLE discovery runs on the worker.
 */
void app_wiring_init_obd(ivts_sink_t sink, const ivts_config_t *config);
/**
 * @brief Bind the modem byte source and boot preparation callback to OTA.
 *
 * Copy the OTA setup. The OTA worker starts when an update is accepted.
 *
 * @param sink Event callback and context copied by value for later OTA progress events.
 * @retval true when the OTA adapter accepts the configuration.
 * @retval false when the OTA adapter rejects it.
 *
 * @note Context: Startup task. Blocking: non-blocking.
 */
bool app_wiring_init_ota(ivts_sink_t sink);
/**
 * @brief Register app callbacks for each supported publish kind.
 *
 * The publisher borrows a firmware-lifetime table and invokes its handlers on the app task.
 *
 * @note Context: Startup task. Blocking: non-blocking.
 */
void app_wiring_register_acks(void);
