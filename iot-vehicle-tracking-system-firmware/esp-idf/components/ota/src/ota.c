/**
 * @file ota.c
 * @brief Thực hiện một lần OTA và các hàm xác nhận/rollback image.
 *
 * ## Trình tự của ota_run()
 *
 * 1. Kiểm tra điện áp nguồn và giải mã SHA-256 mong đợi từ lệnh.
 * 2. Mở nguồn byte, kiểm tra kích thước, mở partition kế tiếp bằng esp_ota_begin().
 * 3. Tải từng khối CHUNK byte (thử lại tối đa 3 lần mỗi khối), ghi flash và cập nhật SHA-256.
 * 4. So sánh SHA-256; esp_ota_end() kiểm tra header và checksum image; đặt partition khởi động.
 * 5. Lưu ngữ cảnh xác nhận trước khi đổi slot. Phát REBOOTING để app khởi động lại.
 *
 * Image mới khởi động ở trạng thái PENDING_VERIFY. Nếu app không gọi ota_mark_valid() trước khi
 * reset kế tiếp thì bootloader quay về partition cũ (rollback).
 *
 * ## Ngữ cảnh gọi
 *
 * ota_run() chạy trong task "ota" (ota_os.c). Các hàm còn lại gọi từ task "app" lúc khởi động và
 * khi xử lý xác nhận. Bộ đệm tải là biến static dùng chung; việc chỉ một OTA chạy tại một thời
 * điểm được bảo đảm bởi ota_start().
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Mất nguồn trước esp_ota_set_boot_partition() thì thiết bị khởi động lại từ partition cũ không
 * đổi. Mất nguồn sau đó nhưng trước ota_mark_valid() thì image mới chạy một lần ở PENDING_VERIFY
 * rồi bị rollback ở lần reset kế tiếp.
 */

#include "ota_priv.h"
#include <stdatomic.h>
#include <string.h>
#include "esp_app_desc.h"
#include "esp_log.h"
#include "esp_ota_ops.h"
#include "platform/platform_clock.h"
#include "psa/crypto.h"

/* SHA-256 dùng PSA Crypto (psa_hash_*): ESP-IDF 6.1 đi kèm mbedTLS 4.x, không còn API
 * mbedtls_sha256_*. psa_crypto_init() đã được ESP-IDF gọi lúc khởi động
 * (mbedtls/port/esp_psa_crypto_init.c) nên không cần gọi lại. */
#define CHUNK 1024u   /* Kích thước mỗi lần đọc nguồn và ghi flash, byte. */

ota_cfg_t g_ota_cfg;
static _Atomic uint32_t s_progress;

/* Xem ota_priv.h. */
void ota_emit(uint8_t phase, uint8_t pct, uint8_t err)
{
    uint32_t progress = (1u << 24) | ((uint32_t)phase << 16) | ((uint32_t)pct << 8) | err;
    atomic_store(&s_progress, progress);
    ivts_event_t ev = { .type = IVTS_EV_OTA_PROGRESS, .ts_ms = platform_uptime_ms() };
    ev.u.ota_progress.phase = phase;
    ev.u.ota_progress.pct = pct;
    ev.u.ota_progress.err = err;
    (void)ivts_sink_emit(&g_ota_cfg.sink, &ev);
}

bool ota_progress_take(ivts_event_t *ev)
{
    uint32_t progress = atomic_exchange(&s_progress, 0u);
    if (progress == 0u) { return false; }
    *ev = (ivts_event_t){ .type = IVTS_EV_OTA_PROGRESS };
    ev->u.ota_progress.phase = (uint8_t)(progress >> 16);
    ev->u.ota_progress.pct = (uint8_t)(progress >> 8);
    ev->u.ota_progress.err = (uint8_t)progress;
    return true;
}

typedef struct {
    const ota_source_t *source;
    const esp_partition_t *partition;
    esp_ota_handle_t handle;
    psa_hash_operation_t hash;
    uint32_t size;
    uint8_t expected_digest[32];
    uint8_t last_pct;
    bool has_open_partition;
    bool has_hash_operation;
    bool is_downloading;
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

static void job_abort(ota_job_t *job, ivts_ota_err_t error, uint8_t pct)
{
    /* During download, release the image writer before the hash operation. */
    if (job->is_downloading) { job_abort_partition(job); }
    if (job->has_hash_operation) { psa_hash_abort(&job->hash); }
    job_abort_partition(job);
    job_close_source(job);

    ESP_LOGW(OTA_TAG, "fail: %s", ivts_ota_err_name(error));
    ota_emit(IVTS_OTA_ST_FAILED, pct, (uint8_t)error);
}

static ivts_ota_err_t job_check_preconditions(ota_job_t *job, const ivts_ota_cmd_t *cmd,
                                             uint16_t battery_mv, uint16_t min_mv)
{
    if (battery_mv < min_mv) { return IVTS_OTA_E_LOW_BATTERY; }
    return ivts_sha256_hex_decode(cmd->sha256_hex, job->expected_digest) == IVTS_OK
        ? IVTS_OTA_E_NONE : IVTS_OTA_E_BAD_COMMAND;
}

static ivts_ota_err_t job_open_source(ota_job_t *job, const ivts_ota_cmd_t *cmd)
{
    job->source = &g_ota_cfg.src;
    int status = 0;
    if (job->source->open(job->source->ctx, cmd->url, &job->size, &status) != IVTS_OK) {
        return status != 0 && status != 200 ? IVTS_OTA_E_HTTP_STATUS : IVTS_OTA_E_SOURCE_OPEN;
    }
    return job->size == 0u || (cmd->size != 0u && job->size != cmd->size)
        ? IVTS_OTA_E_SIZE_MISMATCH : IVTS_OTA_E_NONE;
}

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

static bool read_chunk_with_retry(const ota_source_t *source, uint32_t offset, uint8_t *buffer,
                                  size_t requested, size_t *received)
{
    ivts_err_t result = IVTS_ERR_IO;
    for (unsigned retry = 0; retry < 3u && result != IVTS_OK; retry++) {
        result = source->read(source->ctx, offset, buffer, requested, received);
    }
    return result == IVTS_OK && *received != 0u && *received <= requested;
}

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

static ivts_ota_err_t job_switch_boot(const ota_job_t *job, const ivts_ota_cmd_t *cmd)
{
    if (g_ota_cfg.prepare_boot(cmd, job->partition->label) != IVTS_OK) { return IVTS_OTA_E_PERSIST; }
    if (esp_ota_set_boot_partition(job->partition) != ESP_OK) { return IVTS_OTA_E_SET_BOOT; }
    ESP_LOGI(OTA_TAG, "image ok -> %s", job->partition->label);
    ota_emit(IVTS_OTA_ST_REBOOTING, IVTS_OTA_PCT_CONFIRMING, 0);
    return IVTS_OTA_E_NONE;
}

void ota_run(const ivts_ota_cmd_t *cmd, uint16_t battery_mv, uint16_t min_mv)
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

/* Xem ota.h. */
bool ota_image_pending_verify(void)
{
    esp_ota_img_states_t st;
    const esp_partition_t *run = esp_ota_get_running_partition();
    return run != NULL && esp_ota_get_state_partition(run, &st) == ESP_OK && st == ESP_OTA_IMG_PENDING_VERIFY;
}

/* Xem ota.h. */
ivts_err_t ota_mark_valid(void)
{
    return esp_ota_mark_app_valid_cancel_rollback() == ESP_OK ? IVTS_OK : IVTS_ERR_IO;
}

/* Xem ota.h. */
ivts_err_t ota_rollback_and_reboot(void)
{
    /* ESP-IDF khởi động lại nếu thành công, nên quay lại caller luôn là lỗi. */
    esp_err_t e = esp_ota_mark_app_invalid_rollback_and_reboot();
    ESP_LOGE(OTA_TAG, "rollback: %s", esp_err_to_name(e));
    return IVTS_ERR_IO;
}

bool ota_can_rollback(void)
{
    const esp_partition_t *running = esp_ota_get_running_partition();
    return running != NULL && running->subtype != ESP_PARTITION_SUBTYPE_APP_FACTORY &&
           esp_ota_check_rollback_is_possible();
}

ivts_err_t ota_schedule_rollback(void)
{
    if (!ota_can_rollback()) { return IVTS_ERR_INVALID_STATE; }
    return esp_ota_mark_app_invalid_rollback() == ESP_OK ? IVTS_OK : IVTS_ERR_INVALID_STATE;
}

/* Xem ota.h. */
const char *ota_running_version(void)
{
    return esp_app_get_description()->version;
}

/* Xem ota.h. */
const char *ota_running_partition(void)
{
    const esp_partition_t *p = esp_ota_get_running_partition();
    return p != NULL ? p->label : "";
}
