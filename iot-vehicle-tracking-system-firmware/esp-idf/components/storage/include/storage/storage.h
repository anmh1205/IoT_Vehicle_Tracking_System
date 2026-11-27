/**
 * @file storage.h
 * @brief Storage initialization, availability and task-facing component interfaces.
 */
#pragma once
#include "ivts_core/event/event.h"
#include "storage/nvs_store.h"
#include "storage/offline_queue.h"
#include "storage/sd_log.h"

/** Configuration copied by storage_init(). */
typedef struct {
    ivts_sink_t sink;                   /**< Sink for storage results, queue readiness and NVS configuration errors. */
    bool        sd_enabled;             /**< False disables the SD log and offline queue. */
    int         pin_clk, pin_cmd, pin_d0, pin_d1, pin_d2, pin_d3;   /**< GPIO assignments for four-bit SDMMC. Use -1 for an unused pin. */
    int         pin_cd;                 /**< Card-detect GPIO, or -1 when absent. */
    uint32_t    log_file_max_bytes;     /**< Rotate the active log at this size in bytes. */
    uint32_t    log_quota_bytes;        /**< Total log quota in bytes. Remove oldest eligible logs above it. */
    uint32_t    queue_segment_bytes;    /**< Target size of one offline queue segment, in bytes. */
    uint16_t    queue_max_segments;     /**< Maximum segment count. Reclaim the oldest segment when full. */
    uint8_t     task_prio;              /**< FreeRTOS priority for the storage task. */
    uint32_t    task_stack;             /**< Storage task stack size in bytes. */
    uint8_t     req_queue_len;          /**< Capacity of the storage task's request queue. */
} storage_cfg_t;

/**
 * @brief Initialize NVS, attach SD storage and create the storage task.
 *
 * SD failures allow degraded operation and leave storage_sd_ok() false. NVS
 * and task setup must succeed.
 *
 * @retval IVTS_OK Storage task started.
 * @retval IVTS_ERR_INVALID_ARG Missing configuration or sink.
 * @retval IVTS_ERR_IO NVS initialization failed.
 * @retval IVTS_ERR_FULL Queue or task allocation failed.
 */
ivts_err_t storage_init(const storage_cfg_t *cfg);

/** @return True when SD is mounted and the offline queue has opened. */
bool storage_sd_ok(void);
