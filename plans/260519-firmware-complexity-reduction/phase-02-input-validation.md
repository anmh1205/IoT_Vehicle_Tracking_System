---
phase: "02"
title: "Input Validation & Safety Fixes"
status: pending
priority: P1
effort: 3h
---

# Phase 02: Input Validation & Safety Fixes

## Context
- Audit report: `resources/docs/firmware-complexity-audit-2026-05-18.md`
- Plan: `plans/260519-firmware-complexity-reduction/plan.md`
- Depends on: Phase 01

## Overview
Đóng các lỗ hổng validation có thể gây crash, corruption, hoặc behavior không mong muốn.

## Tasks

### 1. cJSON NULL/type checks trong command_handler.c

Tất cả `cJSON_GetObjectItemCaseSensitive` phải có NULL và type check trước khi access:

**command_parse_ota_update()** (line ~790-850):
```c
const cJSON *url = cJSON_GetObjectItemCaseSensitive(params, "url");
if (!cJSON_IsString(url) || url->valuestring == NULL) {
    ESP_LOGE(TAG, "Missing or invalid 'url' parameter");
    return COMMAND_RESULT_INVALID;
}

const cJSON *encoding = cJSON_GetObjectItemCaseSensitive(params, "encoding");
if (!cJSON_IsString(encoding) || encoding->valuestring == NULL) {
    ESP_LOGE(TAG, "Missing or invalid 'encoding' parameter");
    return COMMAND_RESULT_INVALID;
}

const cJSON *job_id = cJSON_GetObjectItemCaseSensitive(params, "jobId");
if (!cJSON_IsString(job_id) || job_id->valuestring == NULL) {
    ESP_LOGE(TAG, "Missing or invalid 'jobId' parameter");
    return COMMAND_RESULT_INVALID;
}

// Tương tự cho: targetVersion, hash, hashAlgo
```

**command_apply_update_config()** (line ~860-920):
```c
const cJSON *device_id = cJSON_GetObjectItemCaseSensitive(params, "device_id");
if (!cJSON_IsString(device_id) || device_id->valuestring == NULL) {
    ESP_LOGE(TAG, "Missing or invalid 'device_id' parameter");
    return COMMAND_RESULT_INVALID;
}

const cJSON *auth_token = cJSON_GetObjectItemCaseSensitive(params, "auth_token");
if (!cJSON_IsString(auth_token) || auth_token->valuestring == NULL) {
    ESP_LOGE(TAG, "Missing or invalid 'auth_token' parameter");
    return COMMAND_RESULT_INVALID;
}

const cJSON *broker_url = cJSON_GetObjectItemCaseSensitive(params, "broker_url");
if (cJSON_IsString(broker_url) && broker_url->valuestring != NULL) {
    // Only validate if present (optional field)
    if (strstr(broker_url->valuestring, "example.com") != NULL) {
        ESP_LOGW(TAG, "Placeholder broker URL detected");
    }
}

// Tương tự cho: broker_port (number), tracking_interval_s (number)
```

### 2. atoi/atof → strtol/strtod trong modem_gnss.c

**modem_gnss_parse_utc_time_ms()** (line ~120-130):
```c
// TRƯỚC:
return ((uint64_t)epoch * 1000ULL) + (uint64_t)atoi(fractional);

// SAU:
if (fractional == NULL || fractional[0] == '\0') {
    return (uint64_t)epoch * 1000ULL;
}
char *end = NULL;
long frac = strtol(fractional, &end, 10);
if (end == fractional || frac < 0 || frac > 999) {
    ESP_LOGW(TAG, "Invalid fractional seconds: %s", fractional);
    return (uint64_t)epoch * 1000ULL;
}
return ((uint64_t)epoch * 1000ULL) + (uint64_t)frac;
```

**modem_gnss_parse_cgnsinf()** (line ~270-280):
```c
// TRƯỚC:
double raw = atof(value);

// SAU:
if (value == NULL || value[0] == '\0') {
    return 0.0;
}
char *end = NULL;
double raw = strtod(value, &end);
if (end == value) {
    ESP_LOGW(TAG, "Invalid numeric value: %s", value);
    return 0.0;
}
```

**modem_gnss_parse_cgps()** (line ~375-385):
```c
// Áp dụng strtod thay cho atof cho: speed_kmh, course_deg
// Kiểm tra NULL và empty string trước khi parse
```

**modem_gnss_parse_cgnsinf_full()** (line ~448-465):
```c
// Áp dụng strtol/strtod cho: fix_valid, latitude, longitude, speed_kmh,
// course_deg, sat_gps, sat_glonass
// Giữ field_count check hiện tại, thêm string validation
```

### 3. esp_ota_set_boot_partition NULL check

**util_ota_rollback.c** (line 33-55):
```c
esp_err_t util_ota_rollback_to_previous(void) {
    const esp_partition_t *rollback = esp_partition_find_first(
        ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_APP_OTA_1, NULL);
    if (rollback == NULL) {
        ESP_LOGE(TAG, "No OTA_1 partition found for rollback");
        return ESP_ERR_NOT_FOUND;
    }
    return esp_ota_set_boot_partition(rollback);
}

// Tương tự cho util_ota_rollback_to_factory() và util_ota_rollback_to_ota0()
```

**util_ota_update.c** (line 628):
```c
// TRƯỚC:
err = esp_ota_set_boot_partition(ctx->update_partition);

// SAU:
if (ctx->update_partition == NULL) {
    ESP_LOGE(TAG, "Cannot set boot: update_partition is NULL");
    return ESP_ERR_INVALID_STATE;
}
err = esp_ota_set_boot_partition(ctx->update_partition);
```

### 4. malloc → heap_caps_malloc cho DMA buffers

**util_ota_update.c** (line 311, 317):
```c
// TRƯỚC:
ctx->decode_buffer = (uint8_t *)malloc(OTA_HTTP_BINARY_CHUNK_SIZE);
ctx->http_read_response = (uint8_t *)malloc(OTA_HTTP_READ_RESPONSE_MAX_LEN);

// SAU:
ctx->decode_buffer = (uint8_t *)heap_caps_malloc(
    OTA_HTTP_BINARY_CHUNK_SIZE, MALLOC_CAP_DMA | MALLOC_CAP_8BIT);
if (ctx->decode_buffer == NULL) {
    ESP_LOGE(TAG, "Failed to allocate DMA-capable decode buffer (%u bytes)",
             OTA_HTTP_BINARY_CHUNK_SIZE);
    return ESP_ERR_NO_MEM;
}

ctx->http_read_response = (uint8_t *)heap_caps_malloc(
    OTA_HTTP_READ_RESPONSE_MAX_LEN, MALLOC_CAP_DMA | MALLOC_CAP_8BIT);
if (ctx->http_read_response == NULL) {
    ESP_LOGE(TAG, "Failed to allocate DMA-capable read buffer (%u bytes)",
             OTA_HTTP_READ_RESPONSE_MAX_LEN);
    heap_caps_free(ctx->decode_buffer);
    ctx->decode_buffer = NULL;
    return ESP_ERR_NO_MEM;
}
```

### 5. ESP_ERROR_CHECK trong runtime path

**state_machine_core.c** (line 635):
```c
// TRƯỚC:
ESP_ERROR_CHECK(gpio_config(&led_cfg));

// SAU:
esp_err_t err = gpio_config(&led_cfg);
if (err != ESP_OK) {
    ESP_LOGE(TAG, "Failed to configure user LED gpio: %s", esp_err_to_name(err));
    s_user_led_initialized = false;
    return;
}
s_user_led_initialized = true;
```

## Success Criteria
- [ ] Tất cả cJSON_GetObjectItem có NULL + type check
- [ ] Không còn atoi/atof không validation
- [ ] esp_ota_set_boot_partition có NULL partition check
- [ ] DMA buffers dùng heap_caps_malloc
- [ ] Không còn ESP_ERROR_CHECK trong runtime path
- [ ] Build pass, không warning mới

## Risk Assessment
- Medium risk: Thay đổi error handling có thể affect control flow
- Mitigation: Test kỹ OTA flow, command handling, GNSS parsing
