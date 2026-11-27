/**
 * @file src/nvs/nvs_store.c
 * @brief Versioned IVTS NVS envelope and typed configuration persistence.
 *
 * Keep existing namespace, keys, byte layout and checksum behavior. Handle
 * failure before committing a replacement value.
 */
#include "storage_internal.h"
#include "platform/log.h"
#include "nvs.h"
#include "nvs_flash.h"
#include "ivts_core/base/crc32.h"
#include "platform/platform.h"

#include <string.h>

#define NS          "ivts"          /* NVS namespace for IVTS records. */
#define KEY_CFG     "cfg"           /* NVS key for the configuration blob. */
#define KEY_BOOT    "boot"          /* NVS key for the persistent boot counter. */
#define BLOB_MAGIC  0x49565453u     /* ASCII "IVTS". */
#define CFG_VERSION 1u              /* Increment when the deployed ivts_config_t layout changes. */
#define BLOB_PAYLOAD_MAX STORAGE_RECORD_PAYLOAD_MAX

/** Header stored immediately before the NVS payload. */
typedef struct {
    uint32_t magic;      /**< BLOB_MAGIC. */
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

/**
 * @brief Load and verify an NVS record.
 *
 * Distinguish a missing key on a new device from a record that failed
 * validation or could not be read.
 *
 * @retval IVTS_OK The validated payload was copied to @p payload.
 * @retval IVTS_ERR_NOT_FOUND The namespace or key is missing.
 * @retval IVTS_ERR_CRC Missing header, incorrect magic or CRC mismatch.
 * @retval IVTS_ERR_VERSION Version or byte length mismatch.
 * @retval IVTS_ERR_IO Another NVS operation failed.
 */
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
