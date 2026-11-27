#include "nvs_store_internal.h"
#include "storage_internal.h"
#include "esp_log.h"
#include "nvs.h"
#include "nvs_flash.h"
#include "ivts_core/base/crc32.h"
#include "platform/platform_clock.h"
#include "platform/platform_err.h"

#include <string.h>

#define NS          "ivts"          /* Namespace NVS của firmware. */
#define KEY_CFG     "cfg"           /* Key của blob cấu hình. */
#define KEY_BOOT    "boot"          /* Key của bộ đếm boot nguội. */
#define BLOB_MAGIC  0x49565453u     /* ASCII "IVTS". */
#define CFG_VERSION 1u              /* Tăng khi đổi layout của ivts_config_t. */
#define BLOB_PAYLOAD_MAX STORAGE_RECORD_PAYLOAD_MAX

/** Header đứng trước payload trong mỗi blob. */
typedef struct {
    uint32_t magic;      /**< BLOB_MAGIC. */
    uint16_t version;    /**< Phiên bản layout của payload. */
    uint16_t len;        /**< sizeof của payload; bắt được trường hợp đổi kích thước struct mà quên tăng version. */
    uint32_t crc;        /**< CRC32 của payload. */
} blob_hdr_t;

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

ivts_err_t storage_record_save(const char *key, uint16_t version, const void *buffer, size_t len)
{
    if (key == NULL || buffer == NULL || len > BLOB_PAYLOAD_MAX) { return IVTS_ERR_INVALID_ARG; }
    return platform_err_from_esp(blob_save(key, version, buffer, len));
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
ivts_err_t storage_record_load(const char *key, uint16_t ver, void *payload, size_t len)
{
    uint8_t buf[sizeof(blob_hdr_t) + BLOB_PAYLOAD_MAX];
    if (key == NULL || payload == NULL || len > BLOB_PAYLOAD_MAX) { return IVTS_ERR_INVALID_ARG; }
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
    ivts_err_t r = storage_record_load(KEY_CFG, CFG_VERSION, out, sizeof *out);
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
    return storage_record_save(KEY_CFG, CFG_VERSION, cfg, sizeof *cfg);
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
