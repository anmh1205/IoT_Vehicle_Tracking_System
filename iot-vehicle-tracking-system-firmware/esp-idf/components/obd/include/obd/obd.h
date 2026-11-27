/**
 * @file include/obd/obd.h
 * @brief ELM327-over-BLE lifecycle requests and diagnostic snapshots.
 *
 * App wiring creates the OBD worker. The app requests start and stop and receives link, sample and diagnostic
 * events.
 * The OBD task owns the link and command exchanges. Control requests do not wait for it.
 * Diagnostic copies can wait on a mutex. Their outputs belong to the caller.
 */
#pragma once

#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/event/event.h"
#include "ivts_core/model/obd.h"

/** @brief Startup settings copied by value. The sink context must outlive the OBD task. */
typedef struct {
    ivts_sink_t sink;              /**< Destination for OBD link, sample and diagnostic events. */
    char        target_addr[18];   /**<
     * NUL-terminated target address in colon-separated hex, or empty for discovery by service or name.
     */
    uint16_t    poll_ms;           /**< Target poll interval in ms. App range is 200–10000 ms. */
    uint16_t    diag_period_s;     /**< Delay in seconds after a diagnostic round before the next is due. */
    uint8_t     task_prio;         /**< FreeRTOS priority for the OBD task. */
    uint32_t    task_stack;        /**< OBD task stack size in bytes. */
} obd_cfg_t;

/**
 * @brief Create the OBD queue, diagnostic mutex and worker.
 *
 * Call once after storage initialization so NVS is available when the worker starts NimBLE.
 * The worker begins disabled and starts BLE after a start request.
 *
 * @param cfg Non-null settings with a sink callback. Copied by value.
 * @retval IVTS_OK The worker was created.
 * @retval IVTS_ERR_INVALID_ARG Missing configuration or sink.
 * @retval IVTS_ERR_FULL Queue, mutex or task allocation failed.
 * @note Context: App startup. Allocation and creation do not wait for BLE startup.
 */
ivts_err_t obd_init(const obd_cfg_t *cfg);

/**
 * @brief Request BLE startup, discovery, connection and polling.
 * Repeated starts keep the enabled request set.
 * @retval IVTS_OK The requested enabled state is recorded.
 * @retval IVTS_ERR_INVALID_STATE The worker event queue is absent.
 * @note Context: App task after successful initialization. Non-blocking.
 */
ivts_err_t obd_start(void);

/**
 * @brief Request that the worker stop polling and shut down NimBLE.
 * Repeated stops keep the disabled request set. Observe obd_is_stopped() for BLE inactivity.
 * @retval IVTS_OK The requested disabled state is recorded.
 * @retval IVTS_ERR_INVALID_STATE The worker event queue is absent.
 * @note Context: App task after successful initialization. Non-blocking.
 */
ivts_err_t obd_stop(void);

/**
 * @brief Check the worker's BLE activity flag.
 * @retval true The BLE activity flag is clear. The worker still exists after a normal stop.
 * @retval false BLE startup, operation or shutdown is in progress, or shutdown failed.
 * @note Context: App task coordinating sleep. Non-blocking.
 */
bool obd_is_stopped(void);

/**
 * @brief Copy the latest readiness and trouble-code snapshots.
 *
 * The app normally reads after IVTS_EV_OBD_DIAG_READY. The snapshots start with validity flags clear
 * and stay available until replaced by a later diagnostic round.
 *
 * @param[out] rd Optional readiness destination.
 * @param[out] stored Optional service 03 trouble-code destination.
 * @param[out] pending Optional service 07 trouble-code destination.
 * @param[out] permanent Optional service 0A trouble-code destination.
 * @retval IVTS_OK Requested outputs were copied.
 * @retval IVTS_ERR_INVALID_STATE The mutex is unavailable. Outputs are unchanged.
 * @note Context: App task. Waits on the snapshot mutex without a fixed timeout.
 */
ivts_err_t obd_diag_copy(ivts_obd_readiness_t *rd, ivts_dtc_list_t *stored,
                         ivts_dtc_list_t *pending, ivts_dtc_list_t *permanent);
