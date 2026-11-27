/**
 * @file storage_nvs.c
 * @brief Cấu hình, bộ đếm boot và ngữ cảnh OTA trong NVS.
 *
 * Cấu hình và ngữ cảnh OTA được lưu dưới dạng một blob {header, payload} cho mỗi key: NVS chỉ bảo
 * đảm nguyên tử cho từng key, nên chia cấu hình ra nhiều key sẽ để lại cấu hình nửa cũ nửa mới
 * nếu mất nguồn giữa chừng mà CRC không phát hiện được. Header gồm magic, version, độ dài và
 * CRC32 của payload; sai bất kỳ trường nào thì dữ liệu bị từ chối.
 *
 * ## Ngữ cảnh gọi
 *
 * Mọi hàm gọi từ task gọi (thường là "app") hoặc từ storage_init() trước khi task chạy. NVS an
 * toàn đa luồng nên không cần khoá thêm. Bộ đệm blob nằm trên stack của caller.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Ghi blob là nguyên tử theo key: sau mất nguồn đọc lại được hoàn toàn bản cũ hoặc hoàn toàn bản
 * mới. Bộ đếm boot tăng trước khi dùng nên mất nguồn giữa chừng chỉ làm nhảy số, không lặp số.
 */

#include "storage_priv.h"
#include "platform/platform_err.h"
#include <string.h>
#include "esp_log.h"
#include "platform/platform_clock.h"
#include "nvs.h"
#include "nvs_flash.h"
#include "ivts_core/base/crc32.h"

#define NS          "ivts"          /* Namespace NVS của firmware. */
#define KEY_CFG     "cfg"           /* Key của blob cấu hình. */
#define KEY_BOOT    "boot"          /* Key của bộ đếm boot nguội. */
#define KEY_OTA     "ota"           /* Key của blob ngữ cảnh OTA. */
#define BLOB_MAGIC  0x49565453u     /* ASCII "IVTS". */
#define CFG_VERSION 1u              /* Tăng khi đổi layout của ivts_config_t. */
#define OTA_VERSION 3u              /* Thêm nhãn partition đích. */
#define BLOB_PAYLOAD_MAX 1537u
_Static_assert(sizeof(ivts_cmd_receipts_t) == BLOB_PAYLOAD_MAX, "receipt layout must match the NVS blob limit");
_Static_assert(sizeof(ivts_restart_intent_t) == 65u, "restart intent layout must match NVS");

/** Header đứng trước payload trong mỗi blob. */
typedef struct {
    uint32_t magic;      /**< BLOB_MAGIC. */
    uint16_t version;    /**< Phiên bản layout của payload. */
    uint16_t len;        /**< sizeof của payload; bắt được trường hợp đổi kích thước struct mà quên tăng version. */
    uint32_t crc;        /**< CRC32 của payload. */
} blob_hdr_t;

/* Xem storage_priv.h. */
esp_err_t storage_nvs_init(void)
{
    /* NVS chứa cấu hình, phiên và trạng thái OTA; lỗi init phải được báo lên app. */
    return nvs_flash_init();
}

/**
 * @brief Ghi một blob {header, payload} vào key @p key và commit.
 * @retval ESP_ERR_INVALID_SIZE Payload lớn hơn bộ đệm.
 */
static esp_err_t blob_save(const char *key, uint16_t ver, const void *payload, size_t len)
{
    uint8_t buf[sizeof(blob_hdr_t) + BLOB_PAYLOAD_MAX];
    if (len > sizeof(buf) - sizeof(blob_hdr_t)) { return ESP_ERR_INVALID_SIZE; }
    blob_hdr_t h = { BLOB_MAGIC, ver, (uint16_t)len, ivts_crc32(0, payload, len) };
    memcpy(buf, &h, sizeof h);
    memcpy(buf + sizeof h, payload, len);
    nvs_handle_t nh;
    esp_err_t e = nvs_open(NS, NVS_READWRITE, &nh);
    if (e != ESP_OK) { return e; }
    e = nvs_set_blob(nh, key, buf, sizeof h + len);
    if (e == ESP_OK) { e = nvs_commit(nh); }
    nvs_close(nh);
    return e;
}

/**
 * @brief Đọc và kiểm tra blob của key @p key.
 *
 * Các lỗi được phân biệt để app biết đây là thiết bị mới hay dữ liệu hỏng.
 *
 * @retval IVTS_OK            Hợp lệ; payload đã được sao chép vào @p payload.
 * @retval IVTS_ERR_NOT_FOUND Chưa có key hoặc namespace.
 * @retval IVTS_ERR_CRC       Thiếu header, sai magic hoặc CRC.
 * @retval IVTS_ERR_VERSION   Sai version hoặc kích thước.
 * @retval IVTS_ERR_IO        Lỗi NVS khác.
 */
static ivts_err_t blob_load(const char *key, uint16_t ver, void *payload, size_t len)
{
    uint8_t buf[sizeof(blob_hdr_t) + BLOB_PAYLOAD_MAX];
    size_t n = sizeof buf;
    nvs_handle_t nh;
    esp_err_t e = nvs_open(NS, NVS_READONLY, &nh);
    if (e == ESP_ERR_NVS_NOT_FOUND) { return IVTS_ERR_NOT_FOUND; }   /* Namespace chưa tồn tại. */
    if (e != ESP_OK) { return IVTS_ERR_IO; }
    e = nvs_get_blob(nh, key, buf, &n);
    nvs_close(nh);
    if (e == ESP_ERR_NVS_NOT_FOUND) { return IVTS_ERR_NOT_FOUND; }
    if (e != ESP_OK) { return IVTS_ERR_IO; }
    blob_hdr_t h;
    if (n < sizeof h) { return IVTS_ERR_CRC; }
    memcpy(&h, buf, sizeof h);
    if (h.magic != BLOB_MAGIC) { return IVTS_ERR_CRC; }
    if (h.version != ver || h.len != len || n != sizeof h + len) { return IVTS_ERR_VERSION; }
    if (ivts_crc32(0, buf + sizeof h, len) != h.crc) { return IVTS_ERR_CRC; }
    memcpy(payload, buf + sizeof h, len);
    return IVTS_OK;
}

/* Xem storage.h. */
ivts_err_t storage_config_load(ivts_config_t *out)
{
    if (out == NULL) { return IVTS_ERR_INVALID_ARG; }
    ivts_err_t r = blob_load(KEY_CFG, CFG_VERSION, out, sizeof *out);
    if (r != IVTS_OK) {
        ivts_config_defaults(out);
        if (r != IVTS_ERR_NOT_FOUND) {
            ivts_event_t ev = { .type = IVTS_EV_CONFIG_CORRUPT, .ts_ms = platform_uptime_ms() };
            ev.u.config_corrupt.err = (int32_t)r;
            storage_emit(&ev);
            ESP_LOGW(STORAGE_TAG, "config %s -> defaults", ivts_err_name(r));
        }
    }
    return r;
}

/* Xem storage.h. */
ivts_err_t storage_config_save(const ivts_config_t *cfg)
{
    if (cfg == NULL) { return IVTS_ERR_INVALID_ARG; }
    /* Quy tắc hợp lệ thuộc về ivts-core; storage chỉ từ chối cấu hình không hợp lệ ở đầu vào. */
    if (ivts_config_validate(cfg, NULL, 0) != 0u) { return IVTS_ERR_INVALID_ARG; }
    return platform_err_from_esp(blob_save(KEY_CFG, CFG_VERSION, cfg, sizeof *cfg));
}

/* Xem storage.h. */
ivts_err_t storage_boot_id_next(uint32_t *out)
{
    if (out == NULL) { return IVTS_ERR_INVALID_ARG; }
    nvs_handle_t nh;
    esp_err_t e = nvs_open(NS, NVS_READWRITE, &nh);
    if (e != ESP_OK) { return platform_err_from_esp(e); }
    uint32_t v = 0;
    e = nvs_get_u32(nh, KEY_BOOT, &v);
    if (e == ESP_ERR_NVS_NOT_FOUND) { v = 0; e = ESP_OK; }
    if (e == ESP_OK) {
        v++;
        e = nvs_set_u32(nh, KEY_BOOT, v);
        if (e == ESP_OK) { e = nvs_commit(nh); }
    }
    nvs_close(nh);
    if (e == ESP_OK) { *out = v; }
    return platform_err_from_esp(e);
}

/* Xem storage.h. */
ivts_err_t storage_ota_pending_load(ivts_ota_pending_t *out)
{
    if (out == NULL) { return IVTS_ERR_INVALID_ARG; }
    memset(out, 0, sizeof *out);
    ivts_err_t r = blob_load(KEY_OTA, OTA_VERSION, out, sizeof *out);
    if (r == IVTS_ERR_VERSION) {
        r = blob_load(KEY_OTA, 2u, out, offsetof(ivts_ota_pending_t, target_partition));
    }
    return r;
}

/* Xem storage.h. */
ivts_err_t storage_ota_pending_save(const ivts_ota_pending_t *p)
{
    if (p == NULL) { return IVTS_ERR_INVALID_ARG; }
    return platform_err_from_esp(blob_save(KEY_OTA, OTA_VERSION, p, sizeof *p));
}

ivts_err_t storage_command_receipts_load(ivts_cmd_receipts_t *out)
{
    if (out == NULL) { return IVTS_ERR_INVALID_ARG; }
    ivts_err_t r = blob_load("cmd_receipts", 1, out, sizeof *out);
    if (r != IVTS_OK) {
        memset(out, 0, sizeof *out);
        return r;
    }
    if (out->next >= IVTS_CMD_RECEIPTS_COUNT) { return IVTS_ERR_CRC; }
    for (size_t i = 0; i < IVTS_CMD_RECEIPTS_COUNT; i++) {
        if (memchr(out->id[i], '\0', IVTS_CMD_ID_SIZE) == NULL) { return IVTS_ERR_CRC; }
    }
    return IVTS_OK;
}

ivts_err_t storage_command_receipts_save(const ivts_cmd_receipts_t *receipts)
{
    if (receipts == NULL || receipts->next >= IVTS_CMD_RECEIPTS_COUNT) { return IVTS_ERR_INVALID_ARG; }
    return platform_err_from_esp(blob_save("cmd_receipts", 1, receipts, sizeof *receipts));
}

ivts_err_t storage_restart_intent_load(ivts_restart_intent_t *out)
{
    if (out == NULL) { return IVTS_ERR_INVALID_ARG; }
    memset(out, 0, sizeof *out);
    ivts_err_t r = blob_load("reboot_id", 2, out, sizeof *out);
    if (r == IVTS_ERR_VERSION) { r = blob_load("reboot_id", 1, out->id, sizeof out->id); }
    if (r == IVTS_OK &&
        (memchr(out->id, '\0', sizeof out->id) == NULL ||
         memchr(out->rollback_origin, '\0', sizeof out->rollback_origin) == NULL)) { return IVTS_ERR_CRC; }
    return r;
}

ivts_err_t storage_restart_intent_save(const ivts_restart_intent_t *intent)
{
    if (intent == NULL) { return IVTS_ERR_INVALID_ARG; }
    return platform_err_from_esp(blob_save("reboot_id", 2, intent, sizeof *intent));
}

ivts_err_t storage_tracking_load(bool *enabled)
{
    uint8_t value = 1;
    ivts_err_t r = blob_load("tracking", 1, &value, sizeof value);
    *enabled = value == 1u && (r == IVTS_OK || r == IVTS_ERR_NOT_FOUND);
    return r;
}

ivts_err_t storage_tracking_save(bool enabled)
{
    uint8_t value = enabled ? 1u : 0u;
    return platform_err_from_esp(blob_save("tracking", 1, &value, sizeof value));
}

ivts_err_t storage_session_load(ivts_session_state_t *state)
{
    ivts_err_t r = blob_load("session", 1, state, sizeof *state);
    if (r == IVTS_OK && state->count > IVTS_SESSION_OUTBOX_SIZE) { r = IVTS_ERR_INVALID_STATE; }
    if (r != IVTS_OK) { memset(state, 0, sizeof *state); }
    return r;
}

ivts_err_t storage_session_save(const ivts_session_state_t *state)
{
    return platform_err_from_esp(blob_save("session", 1, state, sizeof *state));
}

ivts_err_t storage_alarm_load(ivts_motion_alarm_t *alarm)
{
    ivts_err_t r = blob_load("motion_alarm", 1, alarm, sizeof *alarm);
    if (r != IVTS_OK) { memset(alarm, 0, sizeof *alarm); }
    return r;
}

ivts_err_t storage_alarm_save(const ivts_motion_alarm_t *alarm)
{
    return platform_err_from_esp(blob_save("motion_alarm", 1, alarm, sizeof *alarm));
}
