/**
 * @file src/ota_job.c
 * @brief OTA image download, verification, cleanup and boot selection.
 *
 * The OTA task owns the source, hash and candidate partition resources for the job.
 * Source read errors get up to two retries at the same offset. The worker verifies SHA-256 and image version.
 * Confirmation context is persisted before changing the boot target. The app handles reboot and confirmation.
 */
#include "ota_internal.h"
#include "esp_app_desc.h"
#include "platform/log.h"
#include "esp_ota_ops.h"
#include "psa/crypto.h"

#include <string.h>

/*
 * SHA-256 uses PSA Crypto in ESP-IDF 6.1. The SDK initializes PSA at boot.
 */
#define CHUNK 1024u   /**< Maximum image bytes requested and written per chunk. */

/** @brief Job-local resources owned by the active OTA task until completion or cleanup. */
typedef struct {
    const ota_source_t *source;   /**< Borrowed source configuration until close. NULL after close. */
    const esp_partition_t *partition;   /**< Borrowed SDK descriptor for the candidate partition. */
    esp_ota_handle_t handle;   /**< Candidate writer handle while the partition is open. */
    psa_hash_operation_t hash;   /**< SHA-256 operation for bytes written to the candidate. */
    uint32_t size;   /**< Content length in bytes reported by the source. */
    uint8_t expected_digest[32];   /**< Expected SHA-256 digest bytes decoded from the command. */
    uint8_t last_pct;   /**< Last reported phase progress, in percent. */
    bool has_open_partition;   /**< The writer handle still needs finalize or abort. */
    bool has_hash_operation;   /**< Hash verification or cleanup remains pending. */
    bool is_downloading;   /**< A failure in this phase aborts the writer before the hash. */
} ota_job_t;

static void job_close_source(ota_job_t *job)
{
    if (job->source == NULL) { return; }
    job->source->close(job->source->ctx);
    job->source = NULL;
}

static void job_abort_partition(ota_job_t *job)
{
    if (!job->has_open_partition) { return; }
    esp_ota_abort(job->handle);
    job->has_open_partition = false;
}

/**
 * @brief Unwind any resources still owned by the job before emitting failure.
 */
static void job_abort(ota_job_t *job, ivts_ota_err_t error, uint8_t pct)
{
    /* During download, release the image writer before the hash operation. */
    if (job->is_downloading) { job_abort_partition(job); }
    if (job->has_hash_operation) { psa_hash_abort(&job->hash); }
    job_abort_partition(job);
    job_close_source(job);

    IVTS_LOGW(OTA_TAG, "job result=fail err=%s pct=%u", ivts_ota_err_name(error), pct);
    ota_emit(IVTS_OTA_ST_FAILED, pct, (uint8_t)error);
}

static ivts_ota_err_t job_check_preconditions(ota_job_t *job, const ivts_ota_cmd_t *cmd,
                                             uint16_t battery_mv, uint16_t min_mv)
{
    if (battery_mv < min_mv) { return IVTS_OTA_E_LOW_BATTERY; }
    return ivts_sha256_hex_decode(cmd->sha256_hex, job->expected_digest) == IVTS_OK
        ? IVTS_OTA_E_NONE : IVTS_OTA_E_BAD_COMMAND;
}

/**
 * @brief Keep the source binding even on open failure so cleanup can close it.
 */
static ivts_ota_err_t job_open_source(ota_job_t *job, const ivts_ota_cmd_t *cmd)
{
    job->source = &ota_config()->src;
    int status = 0;
    if (job->source->open(job->source->ctx, cmd->url, &job->size, &status) != IVTS_OK) {
        return status != 0 && status != 200 ? IVTS_OTA_E_HTTP_STATUS : IVTS_OTA_E_SOURCE_OPEN;
    }
    return job->size == 0u || (cmd->size != 0u && job->size != cmd->size)
        ? IVTS_OTA_E_SIZE_MISMATCH : IVTS_OTA_E_NONE;
}

/**
 * @brief Check the candidate partition capacity before opening the writer and hash.
 */
static ivts_ota_err_t job_begin_partition(ota_job_t *job)
{
    job->partition = esp_ota_get_next_update_partition(NULL);
    if (job->partition == NULL || job->size > job->partition->size ||
        esp_ota_begin(job->partition, job->size, &job->handle) != ESP_OK) {
        return IVTS_OTA_E_BEGIN;
    }
    job->has_open_partition = true;
    job->has_hash_operation = true;
    return psa_hash_setup(&job->hash, PSA_ALG_SHA_256) == PSA_SUCCESS ? IVTS_OTA_E_NONE : IVTS_OTA_E_SHA256;
}

/**
 * @brief Retry a source error at the same byte offset. Reject a successful zero-length or oversized read.
 */
static bool read_chunk_with_retry(const ota_source_t *source, uint32_t offset, uint8_t *buffer,
                                  size_t requested, size_t *received)
{
    ivts_err_t result = IVTS_ERR_IO;
    for (unsigned retry = 0; retry < 3u && result != IVTS_OK; retry++) {
        result = source->read(source->ctx, offset, buffer, requested, received);
    }
    return result == IVTS_OK && *received != 0u && *received <= requested;
}

/**
 * @brief Scale byte progress to the download phase and always report the final chunk.
 */
static void report_progress(ota_job_t *job, uint32_t offset)
{
    uint8_t pct = (uint8_t)(IVTS_OTA_PCT_DL_START +
                            (uint64_t)(IVTS_OTA_PCT_DL_MAX - IVTS_OTA_PCT_DL_START) * offset / job->size);
    if (pct >= job->last_pct + 5u || offset == job->size) {
        job->last_pct = pct;
        ota_emit(IVTS_OTA_ST_DOWNLOADING, pct, 0);
    }
}

static uint8_t s_chunk[CHUNK]; /* Only the current OTA task owns the download buffer. */

static ivts_ota_err_t job_download_and_hash(ota_job_t *job)
{
    job->is_downloading = true;
    job->last_pct = IVTS_OTA_PCT_DL_START;
    ota_emit(IVTS_OTA_ST_DOWNLOADING, job->last_pct, 0);

    uint32_t offset = 0;
    while (offset < job->size) {
        size_t requested = job->size - offset < CHUNK ? (size_t)(job->size - offset) : CHUNK;
        size_t received = 0;
        if (!read_chunk_with_retry(job->source, offset, s_chunk, requested, &received)) {
            return IVTS_OTA_E_SOURCE_READ;
        }
        if (esp_ota_write(job->handle, s_chunk, received) != ESP_OK) { return IVTS_OTA_E_WRITE; }
        if (psa_hash_update(&job->hash, s_chunk, received) != PSA_SUCCESS) { return IVTS_OTA_E_SHA256; }
        offset += (uint32_t)received;
        report_progress(job, offset);
    }

    job_close_source(job);
    job->is_downloading = false;
    return IVTS_OTA_E_NONE;
}

static ivts_ota_err_t job_verify_digest(ota_job_t *job)
{
    job->last_pct = IVTS_OTA_PCT_VERIFYING;
    ota_emit(IVTS_OTA_ST_VERIFYING, job->last_pct, 0);
    if (psa_hash_verify(&job->hash, job->expected_digest, sizeof job->expected_digest) != PSA_SUCCESS) {
        return IVTS_OTA_E_SHA256;
    }
    job->has_hash_operation = false;
    return IVTS_OTA_E_NONE;
}

/**
 * @brief Finalize the writer, then require the candidate image description to match the requested version.
 */
static ivts_ota_err_t job_finalize_image(ota_job_t *job, const ivts_ota_cmd_t *cmd)
{
    job->last_pct = IVTS_OTA_PCT_INSTALLING;
    ota_emit(IVTS_OTA_ST_INSTALLING, job->last_pct, 0);
    job->has_open_partition = false; /* esp_ota_end consumes the handle even on failure. */
    if (esp_ota_end(job->handle) != ESP_OK) { return IVTS_OTA_E_END; }

    esp_app_desc_t description;
    if (esp_ota_get_partition_description(job->partition, &description) != ESP_OK ||
        strncmp(description.version, cmd->version, sizeof description.version) != 0) {
        return IVTS_OTA_E_BAD_COMMAND;
    }
    return IVTS_OTA_E_NONE;
}

/**
 * @brief Persist confirmation data before making the candidate the next boot target.
 */
static ivts_ota_err_t job_switch_boot(const ota_job_t *job, const ivts_ota_cmd_t *cmd)
{
    if (ota_config()->prepare_boot(cmd, job->partition->label) != IVTS_OK) { return IVTS_OTA_E_PERSIST; }
    /* A reboot into the candidate can now recover the confirmation context. */
    if (esp_ota_set_boot_partition(job->partition) != ESP_OK) { return IVTS_OTA_E_SET_BOOT; }
    IVTS_LOGI(OTA_TAG, "image verified=yes boot_partition=%s version=%s", job->partition->label, cmd->version);
    ota_emit(IVTS_OTA_ST_REBOOTING, IVTS_OTA_PCT_CONFIRMING, 0);
    return IVTS_OTA_E_NONE;
}

void ota_job_run(const ivts_ota_cmd_t *cmd, uint16_t battery_mv, uint16_t min_mv)
{
    ota_job_t job = { .hash = PSA_HASH_OPERATION_INIT };
    ota_emit(IVTS_OTA_ST_ASSIGNED, IVTS_OTA_PCT_ASSIGNED, 0);

    ivts_ota_err_t error = job_check_preconditions(&job, cmd, battery_mv, min_mv);
    if (error == IVTS_OTA_E_NONE) { error = job_open_source(&job, cmd); }
    if (error == IVTS_OTA_E_NONE) { error = job_begin_partition(&job); }
    if (error == IVTS_OTA_E_NONE) { error = job_download_and_hash(&job); }
    if (error == IVTS_OTA_E_NONE) { error = job_verify_digest(&job); }
    if (error == IVTS_OTA_E_NONE) { error = job_finalize_image(&job, cmd); }
    if (error == IVTS_OTA_E_NONE) { error = job_switch_boot(&job, cmd); }
    if (error != IVTS_OTA_E_NONE) { job_abort(&job, error, job.last_pct); }
}
