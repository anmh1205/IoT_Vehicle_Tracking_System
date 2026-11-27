/**
 * @file components/obd/include/obd/obd.h
 * @brief Public ELM327-over-BLE OBD component and diagnostic snapshot APIs.
 *
 * The OBD task owns the BLE link and ELM327 exchanges. Control requests return
 * immediately. The sink receives link, sample and diagnostic events.
 */
#pragma once

#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/event/event.h"
#include "ivts_core/model/obd.h"

/** Configuration copied by obd_init(). */
typedef struct {
    ivts_sink_t sink;              /**< Destination for OBD link, sample and diagnostic events. */
    char        target_addr[18];   /**<
     * Target BLE address, or an empty string to discover an adapter by service
     * or name.
     */
    uint16_t    poll_ms;           /**< Interval between live PID poll rounds, in milliseconds. */
    uint16_t    diag_period_s;     /**< Interval between readiness and DTC queries, in seconds. */
    uint8_t     task_prio;         /**< FreeRTOS priority for the OBD task. */
    uint32_t    task_stack;        /**< OBD task stack size in bytes. */
} obd_cfg_t;

/**
 * @brief Create the OBD event queue, diagnostic mutex and worker.
 *
 * Call after storage_init() so NVS is available when the worker starts NimBLE.
 *
 * @retval IVTS_OK The worker was created.
 * @retval IVTS_ERR_INVALID_ARG Missing configuration or sink.
 * @retval IVTS_ERR_FULL Queue, mutex or task allocation failed.
 */
ivts_err_t obd_init(const obd_cfg_t *cfg);

/**
 * @brief Request BLE startup, discovery, connection and polling.
 * @retval IVTS_ERR_INVALID_STATE The OBD worker is not initialized.
 */
ivts_err_t obd_start(void);

/**
 * @brief Request polling to stop and the worker to shut down NimBLE.
 * @retval IVTS_ERR_INVALID_STATE The OBD worker is not initialized.
 */
ivts_err_t obd_stop(void);

/**
 * @return True once the OBD worker has stopped. Check after obd_stop() when
 * coordinating sleep.
 */
bool obd_is_stopped(void);

/**
 * @brief Copy the latest readiness and trouble-code snapshots.
 *
 * Call after IVTS_EV_OBD_DIAG_READY. Any output pointer can be NULL. A mutex
 * protects the snapshot during the copy, so callers may use task context.
 *
 * @retval IVTS_OK Requested outputs were copied.
 * @retval IVTS_ERR_INVALID_STATE The snapshot mutex is unavailable.
 */
ivts_err_t obd_diag_copy(ivts_obd_readiness_t *rd, ivts_dtc_list_t *stored,
                         ivts_dtc_list_t *pending, ivts_dtc_list_t *permanent);
