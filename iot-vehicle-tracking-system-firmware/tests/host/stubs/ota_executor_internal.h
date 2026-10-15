#pragma once
#include <stddef.h>
#include <stdint.h>
#include <string.h>

typedef int esp_err_t;
#define ESP_OK 0
#define ESP_ERR_INVALID_ARG 0x102
#define ESP_ERR_INVALID_STATE 0x103
#define ESP_ERR_NOT_FOUND 0x105
#define ESP_FAIL -1
#define UTIL_TAG "OTA"
#define ESP_RETURN_ON_NULL(p, err, tag, msg) do { (void)(tag); (void)(msg); if (!(p)) return (err); } while (0)
#define TRACKER_OTA_STATUS_ROLLED_BACK "rolled_back"
#define TRACKER_OTA_PROGRESS_DONE 100

typedef int esp_partition_subtype_t;
enum {
    ESP_PARTITION_TYPE_APP = 0,
    ESP_PARTITION_SUBTYPE_APP_FACTORY = 0,
    ESP_PARTITION_SUBTYPE_APP_OTA_0 = 0x10,
    ESP_PARTITION_SUBTYPE_APP_OTA_1 = 0x11
};
typedef struct {
    int subtype;
    char label[16];
} esp_partition_t;
typedef enum {
    ESP_OTA_IMG_NEW,
    ESP_OTA_IMG_PENDING_VERIFY,
    ESP_OTA_IMG_VALID,
    ESP_OTA_IMG_INVALID,
    ESP_OTA_IMG_ABORTED,
    ESP_OTA_IMG_UNDEFINED
} esp_ota_img_states_t;

typedef struct {
    char job_id[48];
    char target_version[48];
    char current_version[48];
    char status[24];
    char partition[24];
    int progress;
} firmware_status_t;

static inline void util_copy_string(char *dst, size_t capacity, const char *src) {
    if (!dst || !capacity) return;
    strncpy(dst, src, capacity - 1);
    dst[capacity - 1] = '\0';
}

static inline void util_fill_partition_label(const esp_partition_t *p, char *dst, size_t size) {
    util_copy_string(dst, size, p->label);
}
