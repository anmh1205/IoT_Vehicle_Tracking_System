/**
 * @file include/storage/storage.h
 * @brief Storage startup, availability and access to the NVS and SD APIs.
 *
 * App wiring initializes storage before starting runtime consumers. SD recovery runs during startup.
 * The storage task owns later SD file I/O. NVS calls run synchronously on their calling task.
 * Storage keeps a copy of the configuration and returns mount readiness by value.
 */
#pragma once
#include "ivts_core/event/event.h"
#include "storage/nvs_store.h"
#include "storage/offline_queue.h"
#include "storage/sd_log.h"

/** @brief Startup settings copied by value. The sink context must outlive storage use. */
typedef struct {
    ivts_sink_t sink;                   /**< Sink for storage results, queue readiness and NVS configuration errors. */
    bool        sd_enabled;             /**< False disables the SD log and offline queue. */
    int         pin_clk, /**< Clock GPIO. */ pin_cmd, /**< Command GPIO.
     */ pin_d0, /**< Data 0 GPIO. */ pin_d1, /**< Data 1 GPIO.
     */ pin_d2, /**< Data 2 GPIO. */ pin_d3; /**< Data 3 GPIO. */
    int         pin_cd;                 /**< Card-detect GPIO, or -1 when absent. */
    uint32_t    log_file_max_bytes;     /**< Rotate before an append would exceed this many bytes. */
    uint32_t    log_quota_bytes;        /**< Log quota in bytes, checked during rotation. */
    uint32_t    queue_segment_bytes;    /**< Segment byte limit, at least one maximum-size framed record. */
    uint16_t    queue_max_segments;     /**< Limit on the segment ID span, at least two. */
    uint8_t     task_prio;              /**< FreeRTOS priority for the storage task. */
    uint32_t    task_stack;             /**< Storage task stack size in bytes. */
    uint8_t     req_queue_len;          /**< Request queue capacity in items. Supply a positive value. */
} storage_cfg_t;

/**
 * @brief Initialize NVS and SD storage, then create the storage task.
 *
 * SD mount or queue recovery failure emits a mount error and allows degraded operation.
 * Call once before using storage. Allocation failure can leave partially initialized state.
 *
 * @param cfg Non-null settings with a sink callback. Copied by value.
 * @retval IVTS_OK The storage task starts.
 * @retval IVTS_ERR_INVALID_ARG Configuration is missing or NVS rejects its arguments.
 * @retval IVTS_ERR_INVALID_STATE NVS reports an invalid state.
 * @retval IVTS_ERR_TIMEOUT NVS reports a timeout.
 * @retval IVTS_ERR_NOT_FOUND An NVS resource is missing.
 * @retval IVTS_ERR_FULL Queue or task allocation fails, or NVS reports an allocation error.
 * @retval IVTS_ERR_IO Another NVS initialization failure.
 * @note Context: App startup. Blocks on flash initialization and optional SD mount and recovery without a
 *       fixed deadline.
 */
ivts_err_t storage_init(const storage_cfg_t *cfg);

/**
 * @brief Report whether SD storage was ready during startup.
 * @retval true The card mounted and the offline queue opened.
 * @retval false SD is disabled, mount or recovery failed, or startup has yet to finish.
 * @note Context: Task context after initialization. Non-blocking. This flag does not probe the card again.
 */
bool storage_sd_ok(void);
