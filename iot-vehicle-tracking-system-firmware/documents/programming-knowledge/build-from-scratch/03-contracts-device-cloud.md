# 03 — contracts-device-cloud: hợp đồng payload

> 🎯 Mục tiêu: xây lớp `contracts-device-cloud` — định nghĩa **hợp đồng dữ liệu** giữa firmware và cloud: cấu trúc OTA và hàm format JSON payload. Đây là "ngôn ngữ chung" hai bên phải hiểu giống nhau.

Nguồn thật: `components/contracts-device-cloud/`

## 1. Vì sao tách contract riêng?

Firmware và backend là **hai codebase khác nhau**. Nếu firmware đổi tên field JSON mà backend không biết → mất dữ liệu im lặng. Đặt mọi định nghĩa payload + hằng số trạng thái vào một component → dễ review, dễ giữ đồng bộ, và FSM không bị lẫn logic chuỗi JSON.

```
components/contracts-device-cloud/
├── CMakeLists.txt
├── include/
│   ├── ota_contract.h     # struct OTA + status strings + error codes
│   └── data_formatter.h   # các hàm build JSON
└── src/
    └── data_formatter.c   # dùng cJSON build chuỗi
```

🧩 `CMakeLists.txt`

```cmake
idf_component_register(
    SRCS "src/data_formatter.c"
    INCLUDE_DIRS "include"
    REQUIRES shared-kernel json   # 'json' = cJSON đi kèm ESP-IDF
)
```

## 2. ota_contract.h — hằng số là một phần của hợp đồng

Codebase định nghĩa **chuỗi trạng thái** và **mã lỗi** thành macro, để firmware và cloud không "gõ tay" lệch nhau.

🧩 (rút gọn)

```c
#pragma once
#include <stdint.h>
#include "runtime_config.h"

#define TRACKER_OTA_STATUS_DOWNLOADING "downloading"
#define TRACKER_OTA_STATUS_VERIFYING   "verifying"
#define TRACKER_OTA_STATUS_SUCCESS     "success"
#define TRACKER_OTA_STATUS_FAILED      "failed"
#define TRACKER_OTA_STATUS_ROLLED_BACK "rolled_back"

#define TRACKER_OTA_ERROR_SHA256_MISMATCH "sha256_mismatch"
#define TRACKER_OTA_ERROR_HTTP_STATUS_NOT_200 "http_status_not_200"

typedef struct {
    char     status[16];
    uint8_t  progress;          // 0..100
    char     job_id[TRACKER_JOB_ID_MAX_LEN];
    char     target_version[TRACKER_TARGET_VERSION_MAX_LEN];
    char     current_version[TRACKER_TARGET_VERSION_MAX_LEN];
    char     error[96];
} firmware_status_t;

typedef struct {
    bool     pending;
    bool     rollback_pending;
    bool     force;
    uint32_t size;
    uint32_t confirm_timeout_sec;
    char     job_id[TRACKER_JOB_ID_MAX_LEN];
    char     version[TRACKER_TARGET_VERSION_MAX_LEN];
    char     url[TRACKER_OTA_URL_MAX_LEN];
    char     sha256[TRACKER_SHA256_HEX_LEN]; // 64 hex + '\0'
} ota_command_t;
```

> 💡 `ota_command_t` là kết quả parse lệnh cloud; `firmware_status_t` là cái firmware báo ngược lên. Hai struct này = "request" và "response" của quy trình OTA.

## 3. data_formatter.h — các hàm build JSON

Mỗi loại topic có một hàm format riêng. Tất cả trả về **chuỗi cấp phát trên heap**, caller phải `cJSON_free`.

🧩

```c
#pragma once
#include "telemetry_model.h"
#include "ota_contract.h"

char *data_format_rawdata(const config_t *cfg, const telemetry_t *t,
                          bool include_auth_token, bool timestamp_trusted,
                          uint64_t timestamp_ms, const char *message_id,
                          uint32_t seq_no, /* … metadata … */);

char *data_format_status(const config_t *cfg, const char *status,
                         uint32_t session_id, const telemetry_t *t, /* … */);

char *data_format_event(const config_t *cfg, const char *event_type,
                        int code, const char *message, /* … */);

char *data_format_firmware(const config_t *cfg,
                           const firmware_status_t *status, /* … */);
```

> 💡 Vì sao nhiều tham số "metadata" (`message_id`, `seq_no`, `boot_id`, `session_id`)? Để cloud **chống trùng** và **ghép phiên**: mỗi payload có ID duy nhất và số thứ tự, giúp phát hiện mất gói khi replay offline.

## 4. data_formatter.c — build bằng cJSON

🧩 (mẫu rút gọn cho `rawdata`)

```c
#include "data_formatter.h"
#include "cJSON.h"

char *data_format_rawdata(const config_t *cfg, const telemetry_t *t,
                          bool include_auth_token, bool timestamp_trusted,
                          uint64_t timestamp_ms, const char *message_id,
                          uint32_t seq_no /* … */) {
    cJSON *root = cJSON_CreateObject();
    if (!root) return NULL;

    cJSON_AddStringToObject(root, "deviceId", cfg->device_id);
    cJSON_AddStringToObject(root, "messageId", message_id ? message_id : "");
    cJSON_AddNumberToObject(root, "seq", seq_no);
    cJSON_AddBoolToObject(root, "tsTrusted", timestamp_trusted);
    cJSON_AddNumberToObject(root, "ts", (double)timestamp_ms);

    cJSON_AddNumberToObject(root, "lat", t->gnss.latitude);
    cJSON_AddNumberToObject(root, "lon", t->gnss.longitude);
    cJSON_AddNumberToObject(root, "speed", t->gnss.speed_kmh);
    cJSON_AddNumberToObject(root, "rpm", t->obd_rpm);
    cJSON_AddNumberToObject(root, "vbat", t->device_battery);
    cJSON_AddNumberToObject(root, "ignition", t->ignition);

    if (include_auth_token)
        cJSON_AddStringToObject(root, "token", cfg->auth_token);

    char *out = cJSON_PrintUnformatted(root); // heap
    cJSON_Delete(root);
    return out; // caller phải cJSON_free(out)
}
```

> 💡 `cJSON_PrintUnformatted` (không xuống dòng/space) tiết kiệm băng thông cellular — quan trọng với gói data trả phí.

## 5. 🔧 Build & kiểm tra

```c
// thử trong main.c
config_t c; app_config_set_defaults(&c);
telemetry_t t = {0};
char *json = data_format_rawdata(&c, &t, false, false, 0, "m-1", 1 /*…*/);
ESP_LOGI(TAG, "payload=%s", json);
cJSON_free(json);
```

## ⚠️ Bẫy thường gặp

- **Quên `cJSON_free`:** mỗi payload là một lần `malloc`. Publish xong phải free → nếu không, heap rò rỉ và device treo sau vài giờ.
- **Đổi tên key tùy tiện:** key JSON là một phần hợp đồng. Đổi phải báo backend.
- **`cJSON_Delete` vs `cJSON_free`:** `Delete` cho object, `free` cho chuỗi `Print*` trả về. Nhầm → double free hoặc leak.

## ➡️ Tiếp theo

[04 — platform-board và pin map](./04-platform-board-va-pin-map.md)
