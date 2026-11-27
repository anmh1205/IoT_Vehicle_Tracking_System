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
#include "esp_timer.h"
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
    ivts_event_t ev = { .type = IVTS_EV_OTA_PROGRESS, .ts_ms = (uint64_t)esp_timer_get_time() / 1000u };
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

/** Ghi log và phát pha FAILED với mã lỗi @p e tại mức tiến độ @p pct. */
static void fail(ivts_ota_err_t e, uint8_t pct)
{
    ESP_LOGW(OTA_TAG, "fail: %s", ivts_ota_err_name(e));
    ota_emit(IVTS_OTA_ST_FAILED, pct, (uint8_t)e);
}

/* Xem ota_priv.h và mô tả trình tự ở đầu file. */
void ota_run(const ivts_ota_cmd_t *cmd, uint16_t battery_mv, uint16_t min_mv)
{
    const ota_source_t *src = &g_ota_cfg.src;
    ota_emit(IVTS_OTA_ST_ASSIGNED, IVTS_OTA_PCT_ASSIGNED, 0);

    /* Nguồn yếu trong lúc ghi flash làm tăng nguy cơ ghi dở; rollback phục hồi được nhưng tốn
     * chu kỳ ghi flash, nên từ chối ngay từ đầu. */
    if (battery_mv < min_mv) { fail(IVTS_OTA_E_LOW_BATTERY, 0); return; }

    uint8_t want[32];
    if (ivts_sha256_hex_decode(cmd->sha256_hex, want) != IVTS_OK) { fail(IVTS_OTA_E_BAD_COMMAND, 0); return; }

    uint32_t size = 0;
    int status = 0;
    if (src->open(src->ctx, cmd->url, &size, &status) != IVTS_OK) {
        src->close(src->ctx);
        fail(status != 0 && status != 200 ? IVTS_OTA_E_HTTP_STATUS : IVTS_OTA_E_SOURCE_OPEN, 0);
        return;
    }
    if (size == 0u || (cmd->size != 0u && size != cmd->size)) {
        src->close(src->ctx);
        fail(IVTS_OTA_E_SIZE_MISMATCH, 0);
        return;
    }

    const esp_partition_t *part = esp_ota_get_next_update_partition(NULL);
    esp_ota_handle_t h = 0;
    if (part == NULL || size > part->size || esp_ota_begin(part, size, &h) != ESP_OK) {
        src->close(src->ctx);
        fail(IVTS_OTA_E_BEGIN, 0);
        return;
    }

    psa_hash_operation_t hop = PSA_HASH_OPERATION_INIT;
    if (psa_hash_setup(&hop, PSA_ALG_SHA_256) != PSA_SUCCESS) {
        psa_hash_abort(&hop);
        esp_ota_abort(h);
        src->close(src->ctx);
        fail(IVTS_OTA_E_SHA256, 0);
        return;
    }
    static uint8_t buf[CHUNK];                      /* static để không tốn stack của task; chỉ một OTA chạy tại một thời điểm. */
    uint32_t off = 0;
    uint8_t last_pct = IVTS_OTA_PCT_DL_START;
    ota_emit(IVTS_OTA_ST_DOWNLOADING, last_pct, 0);
    while (off < size) {
        size_t want_n = (size - off < CHUNK) ? (size_t)(size - off) : CHUNK, got = 0;
        ivts_err_t r = IVTS_ERR_IO;
        for (int retry = 0; retry < 3 && r != IVTS_OK; retry++) {
            r = src->read(src->ctx, off, buf, want_n, &got);
        }
        if (r != IVTS_OK || got == 0u || got > want_n) {
            esp_ota_abort(h); psa_hash_abort(&hop); src->close(src->ctx);
            fail(IVTS_OTA_E_SOURCE_READ, last_pct);
            return;
        }
        if (esp_ota_write(h, buf, got) != ESP_OK) {
            esp_ota_abort(h); psa_hash_abort(&hop); src->close(src->ctx);
            fail(IVTS_OTA_E_WRITE, last_pct);
            return;
        }
        if (psa_hash_update(&hop, buf, got) != PSA_SUCCESS) {
            esp_ota_abort(h); psa_hash_abort(&hop); src->close(src->ctx);
            fail(IVTS_OTA_E_SHA256, last_pct);
            return;
        }
        off += (uint32_t)got;
        uint8_t pct = (uint8_t)(IVTS_OTA_PCT_DL_START +
                                (uint64_t)(IVTS_OTA_PCT_DL_MAX - IVTS_OTA_PCT_DL_START) * off / size);
        if (pct >= last_pct + 5u || off == size) {
            last_pct = pct;
            ota_emit(IVTS_OTA_ST_DOWNLOADING, pct, 0);
        }
    }
    src->close(src->ctx);

    ota_emit(IVTS_OTA_ST_VERIFYING, IVTS_OTA_PCT_VERIFYING, 0);
    if (psa_hash_verify(&hop, want, sizeof want) != PSA_SUCCESS) {
        psa_hash_abort(&hop);
        esp_ota_abort(h);
        fail(IVTS_OTA_E_SHA256, IVTS_OTA_PCT_VERIFYING);
        return;
    }
    ota_emit(IVTS_OTA_ST_INSTALLING, IVTS_OTA_PCT_INSTALLING, 0);
    if (esp_ota_end(h) != ESP_OK) {                 /* ESP-IDF kiểm tra header và checksum của image. */
        fail(IVTS_OTA_E_END, IVTS_OTA_PCT_INSTALLING);
        return;
    }
    esp_app_desc_t desc;
    if (esp_ota_get_partition_description(part, &desc) != ESP_OK ||
        strncmp(desc.version, cmd->version, sizeof desc.version) != 0) {
        fail(IVTS_OTA_E_BAD_COMMAND, IVTS_OTA_PCT_INSTALLING);
        return;
    }
    if (g_ota_cfg.prepare_boot(cmd, part->label) != IVTS_OK) {
        fail(IVTS_OTA_E_PERSIST, IVTS_OTA_PCT_INSTALLING);
        return;
    }
    if (esp_ota_set_boot_partition(part) != ESP_OK) {
        fail(IVTS_OTA_E_SET_BOOT, IVTS_OTA_PCT_INSTALLING);
        return;
    }
    ESP_LOGI(OTA_TAG, "image ok -> %s", part->label);
    ota_emit(IVTS_OTA_ST_REBOOTING, IVTS_OTA_PCT_CONFIRMING, 0);
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
