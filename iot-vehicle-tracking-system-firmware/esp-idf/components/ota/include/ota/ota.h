/**
 * @file ota.h
 * @brief Public OTA task, byte source, progress, image and rollback interfaces.
 *
 * App wiring supplies the byte source and boot-preparation callback. The
 * worker exists for the duration of the update. It downloads, hashes and
 * writes the image, then the app handles its confirmation after reboot.
 */
#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/event/event.h"
#include "ivts_core/ota/contract.h"

/**
 * Blocking image-source callbacks supplied by app wiring and called on the OTA
 * task.
 */
typedef struct {
    /** Open @p url and report content size and HTTP status. */
    ivts_err_t (*open)(void *ctx, const char *url, uint32_t *size, int *http_status);
    /** Read up to @p len bytes at @p offset and report the count in @p got. */
    ivts_err_t (*read)(void *ctx, uint32_t offset, uint8_t *buf, size_t len, size_t *got);
    /** Close the source after an open attempt, including failed opens. */
    void       (*close)(void *ctx);
    void       *ctx;    /**< Context passed to all byte-source callbacks. */
} ota_source_t;

/** Configuration copied by ota_init(). */
typedef struct {
    ivts_sink_t  sink;         /**< Destination for IVTS_EV_OTA_PROGRESS events. */
    ota_source_t src;          /**< Byte source for the candidate image. */
    /** Persist confirmation context before changing the boot partition. */
    ivts_err_t (*prepare_boot)(const ivts_ota_cmd_t *cmd, const char *partition);
    uint8_t      task_prio;    /**< FreeRTOS priority for the OTA task. */
    uint32_t     task_stack;   /**< OTA task stack size in bytes. */
} ota_cfg_t;

/**
 * @brief Store the OTA configuration and source callbacks.
 * @retval IVTS_OK Configuration copied.
 * @retval IVTS_ERR_INVALID_ARG Missing configuration or callbacks.
 */
ivts_err_t ota_init(const ota_cfg_t *cfg);

/**
 * @brief Copy an OTA command and start the download worker.
 *
 * Progress arrives as IVTS_EV_OTA_PROGRESS. IVTS_OTA_ST_REBOOTING means the
 * confirmation context is durable and the new boot partition was selected.
 *
 * @param battery_mv Device supply voltage in millivolts.
 * @param min_battery_mv Configured minimum voltage for OTA.
 * @retval IVTS_OK The task was created.
 * @retval IVTS_ERR_INVALID_ARG The command is missing.
 * @retval IVTS_ERR_INVALID_STATE An OTA worker is already running.
 * @retval IVTS_ERR_FULL Task allocation failed.
 */
ivts_err_t ota_start(const ivts_ota_cmd_t *cmd, uint16_t battery_mv, uint16_t min_battery_mv);

/** @return True while an OTA job owns the worker slot. Safe from any task. */
bool ota_running(void);
/** Read the latest progress even if its queue event was dropped. */
bool ota_progress_take(ivts_event_t *ev);

/**
 * @name Running image and post-boot confirmation
 * @{
 */

/** @return True if the running image is still PENDING_VERIFY. */
bool ota_image_pending_verify(void);

/** Mark the running image valid and cancel automatic rollback. */
ivts_err_t ota_mark_valid(void);

/** Mark the running image invalid and restart into a previous partition. */
ivts_err_t ota_rollback_and_reboot(void);
/** Report whether ESP-IDF has a valid rollback target. */
bool ota_can_rollback(void);
/** Select the previous valid image. The caller controls reboot timing. */
ivts_err_t ota_schedule_rollback(void);

/** @return Non-null static version string of the running image. */
const char *ota_running_version(void);

/** @return Static label of the running partition, or an empty string if unknown. */
const char *ota_running_partition(void);
/** @} */
