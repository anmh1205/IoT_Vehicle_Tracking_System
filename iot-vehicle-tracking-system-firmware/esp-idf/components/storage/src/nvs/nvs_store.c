/**
 * @file src/nvs/nvs_store.c
 * @brief Versioned IVTS NVS envelope, device configuration and boot counter.
 *
 * App startup initializes NVS and reads device configuration. App and OTA tasks save typed records
 * synchronously.
 * Each operation owns its NVS handle and stack buffer. Blob writes commit before returning success.
 * App and core code own layout migrations and configuration policy.
 */
#include "storage_internal.h"
#include "platform/log.h"
#include "nvs.h"
#include "nvs_flash.h"
#include "ivts_core/base/crc32.h"
#include "platform/platform.h"

#include <string.h>

#define NS          "ivts"          /**< NVS namespace for IVTS records. */
#define KEY_CFG     "cfg"           /**< NVS key for the configuration blob. */
#define KEY_BOOT    "boot"          /**< NVS key for the persistent boot counter. */
#define BLOB_MAGIC  0x49565453u     /**< Numeric format identifier for an IVTS record envelope. */
#define CFG_VERSION 1u              /**< Payload layout version for ivts_config_t. */
#define BLOB_PAYLOAD_MAX STORAGE_RECORD_PAYLOAD_MAX   /**< Maximum payload bytes in the envelope buffer. */

/** @brief Header stored before the payload and copied through a call-local NVS buffer. */
typedef struct {
    uint32_t magic;      /**< Envelope format identifier, checked before version or CRC. */
    uint16_t version;    /**< Payload layout version. */
    uint16_t len;        /**< Payload byte length, checked separately from the version. */
    uint32_t crc;        /**< CRC32 of the payload bytes. */
} blob_hdr_t;

esp_err_t storage_nvs_init(void)
{
    /* Propagate an initialization error because NVS holds essential IVTS state. */
    return nvs_flash_init();
}

/**
 * @brief Write and commit a header and payload under @p key.
 * @retval ESP_ERR_INVALID_SIZE Payload exceeds the bounded record buffer.
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

ivts_err_t storage_record_load(const char *key, uint16_t ver, void *payload, size_t len)
{
    uint8_t buf[sizeof(blob_hdr_t) + BLOB_PAYLOAD_MAX];
    if (key == NULL || payload == NULL || len > BLOB_PAYLOAD_MAX) { return IVTS_ERR_INVALID_ARG; }
    size_t n = sizeof buf;
    nvs_handle_t nh;
    esp_err_t e = nvs_open(NS, NVS_READONLY, &nh);
    if (e == ESP_ERR_NVS_NOT_FOUND) { return IVTS_ERR_NOT_FOUND; }   /* The IVTS namespace has not been created. */
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
            IVTS_LOGW(STORAGE_TAG, "config load result=%s action=defaults", ivts_err_name(r));
        }
    }
    return r;
}

ivts_err_t storage_config_save(const ivts_config_t *cfg)
{
    if (cfg == NULL) { return IVTS_ERR_INVALID_ARG; }
    /* Use the core rules to reject an invalid configuration before persisting it. */
    if (ivts_config_validate(cfg, NULL, 0) != 0u) { return IVTS_ERR_INVALID_ARG; }
    return storage_record_save(KEY_CFG, CFG_VERSION, cfg, sizeof *cfg);
}

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
