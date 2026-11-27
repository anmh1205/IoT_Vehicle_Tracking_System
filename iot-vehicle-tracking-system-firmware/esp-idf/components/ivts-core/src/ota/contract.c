#include "ivts_core/ota/contract.h"

const char *ivts_ota_status_name(ivts_ota_status_t s)
{
    switch (s) {
    case IVTS_OTA_ST_ASSIGNED:    return "assigned";
    case IVTS_OTA_ST_DOWNLOADING: return "downloading";
    case IVTS_OTA_ST_VERIFYING:   return "verifying";
    case IVTS_OTA_ST_INSTALLING:  return "installing";
    case IVTS_OTA_ST_REBOOTING:   return "rebooting";
    case IVTS_OTA_ST_CONFIRMING:  return "confirming";
    case IVTS_OTA_ST_SUCCESS:     return "success";
    case IVTS_OTA_ST_FAILED:      return "failed";
    case IVTS_OTA_ST_ROLLED_BACK: return "rolled_back";
    case IVTS_OTA_ST_COUNT:       break;
    }
    return "unknown";
}

const char *ivts_ota_err_name(ivts_ota_err_t e)
{
    switch (e) {
    case IVTS_OTA_E_NONE:            return "";
    case IVTS_OTA_E_LOW_BATTERY:     return "low_battery";
    case IVTS_OTA_E_UNSAFE_WINDOW:   return "unsafe_runtime_window";
    case IVTS_OTA_E_SOURCE_OPEN:     return "http_action_failed";
    case IVTS_OTA_E_HTTP_STATUS:     return "http_status_not_200";
    case IVTS_OTA_E_SIZE_MISMATCH:   return "http_size_mismatch";
    case IVTS_OTA_E_SOURCE_READ:     return "http_read_failed";
    case IVTS_OTA_E_BEGIN:           return "ota_begin_failed";
    case IVTS_OTA_E_WRITE:           return "ota_write_failed";
    case IVTS_OTA_E_SHA256:          return "sha256_mismatch";
    case IVTS_OTA_E_END:             return "ota_end_failed";
    case IVTS_OTA_E_SET_BOOT:        return "set_boot_partition_failed";
    case IVTS_OTA_E_PERSIST:         return "confirm_context_persist_failed";
    case IVTS_OTA_E_CONFIRM_TIMEOUT: return "confirm_timeout_exceeded";
    case IVTS_OTA_E_BAD_COMMAND:     return "bad_command";
    case IVTS_OTA_E_COUNT:           break;
    }
    return "unknown";
}

static int hexval(char c)
{
    if (c >= '0' && c <= '9') { return c - '0'; }
    if (c >= 'a' && c <= 'f') { return c - 'a' + 10; }
    if (c >= 'A' && c <= 'F') { return c - 'A' + 10; }
    return -1;
}

ivts_err_t ivts_sha256_hex_decode(const char *hex, uint8_t out[32])
{
    if (hex == NULL || out == NULL) { return IVTS_ERR_INVALID_ARG; }
    for (int i = 0; i < 32; i++) {
        int hi = hexval(hex[2 * i]);
        if (hi < 0) { return IVTS_ERR_INVALID_ARG; }   /* cũng bắt chuỗi ngắn: gặp NUL */
        int lo = hexval(hex[2 * i + 1]);
        if (lo < 0) { return IVTS_ERR_INVALID_ARG; }
        out[i] = (uint8_t)((hi << 4) | lo);
    }
    return hex[64] == '\0' ? IVTS_OK : IVTS_ERR_INVALID_ARG;
}
