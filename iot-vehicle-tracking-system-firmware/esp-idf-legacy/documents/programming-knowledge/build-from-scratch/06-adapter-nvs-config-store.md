# 06 — Adapter NVS config store

> 🎯 Mục tiêu: viết adapter đầu tiên — lưu/đọc `config_t` vào NVS (flash). Đây là adapter đơn giản nhất để làm quen pattern "adapter điền port".

Nguồn thật: `components/adapter-kv-nvs/`

## 1. NVS là gì và vì sao cần

NVS (Non-Volatile Storage) là key-value store nằm trên flash, **sống sót qua reboot và mất điện**. Ta dùng nó lưu config runtime (device_id, MQTT host, interval…) để device được cấu hình từ xa rồi nhớ luôn.

```
components/adapter-kv-nvs/
├── CMakeLists.txt
├── include/nvs_config.h
└── src/
    ├── nvs_config.c              # load/save config_t blob
    ├── config_store_nvs.c        # wrapper mỏng cho config_store_port_t
    └── ota_context_store_nvs.c   # lưu OTA context qua reboot
```

🧩 `CMakeLists.txt`

```cmake
idf_component_register(
    SRCS
        "src/config_store_nvs.c"
        "src/nvs_config.c"
        "src/ota_context_store_nvs.c"
    INCLUDE_DIRS "include"
    REQUIRES contracts-device-cloud log nvs_flash shared-kernel
)
```

## 2. nvs_config.h — khớp đúng config_store_port_t

Nhớ port từ bước 05:

```c
typedef struct {
    esp_err_t (*init)(void);
    esp_err_t (*load)(config_t *config);
    esp_err_t (*save)(const config_t *config);
} config_store_port_t;
```

Adapter phải có 3 hàm signature **khớp y hệt**:

🧩 `nvs_config.h`

```c
#pragma once
#include "esp_err.h"
#include "runtime_config.h"

esp_err_t nvs_config_init(void);
esp_err_t nvs_config_load(config_t *config);
esp_err_t nvs_config_save(const config_t *config);
```

## 3. nvs_config.c — load có fallback về default

🧩 (rút gọn, giữ đúng hành vi codebase)

```c
#include "nvs_config.h"
#include "app_config.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "esp_log.h"
#include <string.h>

static const char *TAG = "NVS_CONFIG";
#define NS "tracker"
#define KEY_BLOB "config"

esp_err_t nvs_config_init(void) {
    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase()); // partition hỏng -> xóa, init lại
        err = nvs_flash_init();
    }
    return err;
}

esp_err_t nvs_config_load(config_t *config) {
    if (!config) return ESP_ERR_INVALID_ARG;

    nvs_handle_t h;
    esp_err_t err = nvs_open(NS, NVS_READONLY, &h);
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "no stored config, dùng default");
        app_config_set_defaults(config);   // fallback an toàn
        return ESP_OK;
    }

    size_t len = sizeof(config_t);
    err = nvs_get_blob(h, KEY_BLOB, config, &len);
    nvs_close(h);

    if (err != ESP_OK || len != sizeof(config_t)) {
        app_config_set_defaults(config);   // blob lỗi/khác kích thước -> default
        return ESP_OK;
    }

    if (!app_config_is_valid(config)) {    // validate giá trị
        app_config_set_defaults(config);
    }
    return ESP_OK;
}

esp_err_t nvs_config_save(const config_t *config) {
    if (!config) return ESP_ERR_INVALID_ARG;
    nvs_handle_t h;
    esp_err_t err = nvs_open(NS, NVS_READWRITE, &h);
    if (err != ESP_OK) return err;

    err = nvs_set_blob(h, KEY_BLOB, config, sizeof(config_t));
    if (err == ESP_OK) err = nvs_commit(h); // PHẢI commit mới ghi thật
    nvs_close(h);
    return err;
}
```

> 💡 **Triết lý "luôn trả config dùng được":** dù NVS trống, blob hỏng, hay giá trị vô lệ — `load` luôn trả `ESP_OK` với config hợp lệ (default). FSM không bao giờ chạy với config rác. Đây là "defensive boot".

> 💡 Lưu **cả struct dạng blob** thay vì từng key. Đơn giản, atomic. Nhược điểm: đổi layout `config_t` → blob cũ khác size → rơi về default (đã xử lý ở `len != sizeof`).

## 4. 🔧 Build & kiểm tra

```c
nvs_config_init();
config_t c;
nvs_config_load(&c);                 // lần đầu: default
ESP_LOGI(TAG, "host=%s interval=%u", c.mqtt_host, c.tracking_interval_s);

strcpy(c.mqtt_host, "broker.test");
c.tracking_interval_s = 30;
nvs_config_save(&c);                 // ghi

config_t c2;
nvs_config_load(&c2);                // phải đọc lại host=broker.test
ESP_LOGI(TAG, "reload host=%s", c2.mqtt_host);
```

Reboot rồi load lại → vẫn thấy `broker.test` ⇒ NVS hoạt động.

## ⚠️ Bẫy thường gặp

- **Quên `nvs_commit`:** `nvs_set_blob` chỉ ghi vào cache. Không commit → mất sau reboot.
- **Không `nvs_flash_init` trước khi dùng:** mọi thao tác NVS fail. Phải init ở rất sớm trong boot.
- **Tin tưởng blob mù quáng:** luôn validate sau khi load; flash có thể bị hỏng bit.
- **Đổi `config_t` mà không nghĩ tới blob cũ:** cân nhắc thêm field `version` nếu cần migrate thay vì rơi default.

## ➡️ Tiếp theo

[07 — Adapter modem SIM7600 (AT + LTE + GNSS)](./07-adapter-modem-sim7600.md)
