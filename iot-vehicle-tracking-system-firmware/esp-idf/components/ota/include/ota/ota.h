/**
 * @file include/ota/ota.h
 * @brief OTA task, image source, progress and rollback contracts.
 *
 * App wiring supplies the callbacks. The app starts a worker with a copied command.
 * The worker owns download and may wait on modem and flash I/O. The app reads an atomic progress slot.
 * The app drives reboot and post-boot confirmation. Running-image queries return borrowed static strings.
 */
#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/event/event.h"
#include "ivts_core/ota/contract.h"

/**
 * @brief Image source supplied by app wiring and copied by value at initialization.
 *
 * The OTA task owns the open, read and close sequence. The provider owns its context and source state.
 */
typedef struct {
    /**
     * @brief Open a byte source and report its size and HTTP status.
     * @param ctx Provider-owned context. May be NULL if the provider allows it.
     * @param url Borrowed NUL-terminated URL, valid until the callback returns.
     * @param[out] size Required destination for content length in bytes. A successful source must report a
     *       positive size.
     * @param[out] http_status Required destination. Set a nonzero HTTP status when one is known, including on
     *       failed opens.
     * @retval IVTS_OK The source is open and both outputs are available.
     * @return An error appropriate to the provider. A nonzero status other than 200 classifies a failed open
     *       as an HTTP error.
     * @note Context: OTA task. The modem binding waits up to 1000 ms to enqueue, then waits for completion
     *       without a fixed deadline. The modem HTTP action has a 120000 ms reply timeout.
     * @warning The worker calls close even after a failed open.
     */
    ivts_err_t (*open)(void *ctx, const char *url, uint32_t *size, int *http_status);
    /**
     * @brief Read a byte range at a specified image offset.
     * @param ctx Provider-owned context. May be NULL if the provider allows it.
     * @param offset Byte offset from the start of the image. Failed reads may be retried at the same offset.
     * @param[out] buf Required writable buffer of at least len bytes. May be partially written on failure.
     * @param len Maximum byte count to read, from one through 1024.
     * @param[out] got Required destination for the number of bytes read, from one through len on success.
     * @retval IVTS_OK A positive number of bytes is available in buf.
     * @return Provider error on failure. The worker retries errors up to twice at the same offset.
     * @note Context: OTA task. The modem binding waits up to 1000 ms to enqueue, then waits for completion
     *       without a fixed deadline. The AT reply timeout is 15000 ms. Buffers are borrowed for the call.
     */
    ivts_err_t (*read)(void *ctx, uint32_t offset, uint8_t *buf, size_t len, size_t *got);
    /**
     * @brief Release source resources after an open attempt.
     * @param ctx Provider-owned context. May be NULL if the provider allows it.
     * @note Context: OTA task, including after failed open. The modem binding waits up to 1000 ms to enqueue,
     *       then waits for completion without a fixed deadline. The AT reply timeout is 5000 ms.
     */
    void       (*close)(void *ctx);
    void       *ctx;    /**< Provider-owned context, borrowed through each update job. */
} ota_source_t;

/** @brief Startup configuration copied by value. Callback contexts must remain valid during updates. */
typedef struct {
    ivts_sink_t  sink;         /**< Destination for IVTS_EV_OTA_PROGRESS events. */
    ota_source_t src;          /**< Byte source for the candidate image. */
    /**
     * @brief Persist the confirmation context before boot selection.
     * @param cmd Borrowed update command, valid through the callback.
     * @param partition Borrowed NUL-terminated label of the candidate partition.
     * @retval IVTS_OK Confirmation context is committed and the worker may request boot selection.
     * @return On failure, a persistence result. The candidate is not selected.
     * @note Context: OTA task. The app callback can read the RTC before committing to NVS. Flash writes have
     *       no component-level timeout.
     */
    ivts_err_t (*prepare_boot)(const ivts_ota_cmd_t *cmd, const char *partition);
    uint8_t      task_prio;    /**< FreeRTOS priority for the OTA task. */
    uint32_t     task_stack;   /**< OTA task stack size in bytes. */
} ota_cfg_t;

/**
 * @brief Store configuration for future OTA workers.
 *
 * Call once before starting jobs. Configuration is read without a lock during jobs.
 *
 * @param cfg Non-null settings with source open, read and close callbacks and a prepare_boot callback.
 *            Copied by value. The progress sink is optional.
 * @retval IVTS_OK Configuration copied.
 * @retval IVTS_ERR_INVALID_ARG Configuration or a required callback is missing.
 * @note Context: App startup. Non-blocking.
 */
ivts_err_t ota_init(const ota_cfg_t *cfg);

/**
 * @brief Copy an OTA command and create its download worker.
 *
 * The task slot is claimed atomically. Battery, image and source checks run in the worker.
 * Progress arrives as IVTS_EV_OTA_PROGRESS. IVTS_OTA_ST_REBOOTING indicates that the preparation
 * callback succeeded and the boot partition was selected. The app schedules the actual reboot.
 *
 * @param cmd Non-null command copied by value. Embedded URL, digest and version strings must be
 *       NUL-terminated.
 * @param battery_mv Device supply sample in millivolts.
 * @param min_battery_mv Minimum accepted supply in millivolts. Equality passes the worker check.
 * @retval IVTS_OK The task was created.
 * @retval IVTS_ERR_INVALID_ARG The command is missing.
 * @retval IVTS_ERR_INVALID_STATE A worker already holds the slot.
 * @retval IVTS_ERR_FULL Task creation fails and releases the slot.
 * @note Context: App task after ota_init(). No wait for download or validation.
 */
ivts_err_t ota_start(const ivts_ota_cmd_t *cmd, uint16_t battery_mv, uint16_t min_battery_mv);

/**
 * @brief Check whether a job holds the worker slot.
 * @retval true A start call or OTA task owns the slot.
 * @retval false The slot is free, including after job completion and before any app-driven reboot.
 * @note Context: Any task. Non-blocking atomic read.
 */
bool ota_running(void);
/**
 * @brief Consume the latest pending progress from the atomic slot.
 *
 * A newer update can overwrite an unread update. Reading this slot does not consume queued progress events.
 *
 * @param[out] ev Required destination for type, phase, percentage and error. The timestamp is zero.
 * @retval true A pending value was consumed and copied.
 * @retval false No pending value. The output is unchanged.
 * @note Context: App task. Non-blocking.
 */
bool ota_progress_take(ivts_event_t *ev);

/**
 * @name Running image and post-boot confirmation
 * @{
 */

/**
 * @brief Check whether the running partition awaits verification.
 * @retval true The SDK reports PENDING_VERIFY for the running partition.
 * @retval false The partition is unavailable, the lookup fails or its state differs.
 * @note Context: App startup. Synchronous SDK partition-state query with no component-level timeout.
 */
bool ota_image_pending_verify(void);

/**
 * @brief Confirm the running image and cancel automatic rollback.
 * @retval IVTS_OK The SDK accepts the image.
 * @retval IVTS_ERR_IO SDK confirmation fails.
 * @note Context: App task during post-boot confirmation. Synchronous SDK flash operation with no
 *       component-level timeout.
 */
ivts_err_t ota_mark_valid(void);

/**
 * @brief Ask the SDK to invalidate the running image and reboot.
 * @retval IVTS_ERR_IO The SDK returns without rebooting.
 * @note Context: App task during post-boot confirmation. Synchronous SDK rollback call with no
 *       component-level timeout.
 */
ivts_err_t ota_rollback_and_reboot(void);
/**
 * @brief Check whether the SDK has a possible rollback target.
 * @retval true The running partition is non-factory and the SDK reports rollback is possible.
 * @retval false There is no running partition, it is factory, or the SDK reports no rollback target.
 * @note Context: App task. Synchronous SDK rollback query with no component-level timeout.
 */
bool ota_can_rollback(void);
/**
 * @brief Request selection of the previous bootable image without rebooting.
 * @retval IVTS_OK The SDK accepts rollback. The app controls reboot timing.
 * @retval IVTS_ERR_INVALID_STATE Rollback is unavailable or the SDK rejects it.
 * @note Context: App task. Synchronous SDK flash operation with no component-level timeout.
 */
ivts_err_t ota_schedule_rollback(void);

/**
 * @brief Read the running image version.
 * @return Non-null, borrowed static version string for the image.
 * @note Context: App startup or app task. Non-blocking.
 */
const char *ota_running_version(void);

/**
 * @brief Read the running partition label.
 * @return Borrowed SDK partition label, or a static empty string if the partition is unavailable.
 * @note Context: App startup or app task. Synchronous SDK partition query with no component-level timeout.
 */
const char *ota_running_partition(void);
/** @} */
