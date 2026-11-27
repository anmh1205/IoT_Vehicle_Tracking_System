# 02 — shared-kernel: models và config

> 🎯 Mục tiêu: xây lớp nền `shared-kernel` — nơi chứa **kiểu dữ liệu, config, util, retry** mà mọi lớp khác dùng chung. Lớp này **không phụ thuộc ai**.

Nguồn thật: `components/shared-kernel/`

## 1. Vì sao shared-kernel làm trước tiên?

Theo quy tắc phụ thuộc, lớp không phụ thuộc ai phải build được độc lập. Mọi struct telemetry, enum trạng thái, hằng số giới hạn config đều nằm đây. Nếu chưa có nó, không component nào compile được.

## 2. Cấu trúc component

```
components/shared-kernel/
├── CMakeLists.txt
├── include/
│   ├── fsm_types.h          # enum trạng thái FSM
│   ├── runtime_config.h     # struct config_t + giới hạn
│   ├── app_config.h         # defaults + validate
│   ├── telemetry_model.h    # struct telemetry + các axis
│   ├── gnss_model.h, obd_model.h, rtc_context.h
│   ├── retry_manager.h      # retry không chặn (non-blocking)
│   └── util.h
└── src/
    ├── app_config_defaults.c
    ├── retry_manager.c
    └── util_core.c
```

🧩 `CMakeLists.txt`

```cmake
idf_component_register(
    SRCS
        "src/app_config_defaults.c"
        "src/retry_manager.c"
        "src/util_core.c"
    INCLUDE_DIRS "include"
    REQUIRES esp_hw_support esp_timer log   # chỉ cần hạ tầng ESP-IDF cơ bản; KHÔNG require adapter/domain
)
```

> 💡 `REQUIRES` chỉ gồm component hạ tầng ESP-IDF (timer/hw_support/log) là dấu hiệu lớp nền lành mạnh. Nếu thấy `shared-kernel` require một adapter → kiến trúc đã hỏng.

## 3. fsm_types.h — trạng thái FSM

🧩

```c
#pragma once

typedef enum {
    APP_STATE_INIT = 0,   // boot, init phần cứng
    APP_STATE_CHECK_IGN,  // quyết định ignition + transition đầu
    APP_STATE_DRIVING,    // đang chạy, telemetry tần suất cao
    APP_STATE_PARKED,     // đỗ, chờ vào sleep
    APP_STATE_ALARM,      // báo động sau wake do IMU
    APP_STATE_HEARTBEAT,  // wake định kỳ để báo sống
    APP_STATE_SLEEP,      // chuẩn bị + vào deep sleep
} app_state_t;
```

> 💡 Enum được tách riêng để FSM, domain, và contract cùng tham chiếu **một định nghĩa duy nhất**, tránh "magic number".

## 4. runtime_config.h — model config

Config là toàn bộ tham số runtime, được nạp từ NVS lúc boot và có thể đổi bằng lệnh cloud. Codebase dùng hằng số `MIN/MAX` cho từng trường để parser và validator dùng chung.

🧩 (rút gọn)

```c
#pragma once
#include <stdbool.h>
#include <stdint.h>

#define TRACKER_DEVICE_ID_MAX_LEN 32
#define TRACKER_HOST_MAX_LEN 64

#define TRACKER_CONFIG_MIN_TRACKING_INTERVAL_S 1U
#define TRACKER_CONFIG_MAX_TRACKING_INTERVAL_S 3600U
#define TRACKER_CONFIG_MIN_HEARTBEAT_INTERVAL_S 60U
// … các MIN/MAX khác

typedef struct {
    char     device_id[TRACKER_DEVICE_ID_MAX_LEN];
    char     mqtt_host[TRACKER_HOST_MAX_LEN];
    uint16_t mqtt_port;
    uint16_t tracking_interval_s;   // cadence khi DRIVING
    uint16_t heartbeat_interval_s;  // cadence wake khi ngủ
    uint16_t alarm_interval_s;
    uint16_t ignition_off_hold_ms;  // debounce tắt máy
    bool     sleep_enabled;
    bool     imu_wakeup_enabled;
    bool     command_subscribe_enabled;
    char     apn[TRACKER_HOST_MAX_LEN];
    // … (xem file thật cho đủ trường: auth_token, ota_min_battery_mv, …)
} config_t;
```

> 💡 Đặt MIN/MAX thành macro (không phải số rải rác trong code) là cách codebase đảm bảo: ai parse JSON config cũng clamp theo cùng một biên.

## 5. app_config.h — defaults + validate

🧩 `app_config.h`

```c
#pragma once
#include "runtime_config.h"

void app_config_set_defaults(config_t *config);  // điền giá trị an toàn
bool app_config_is_valid(const config_t *config); // kiểm tra trường bắt buộc
```

🧩 `src/app_config_defaults.c` (mẫu)

```c
#include "app_config.h"
#include <string.h>

void app_config_set_defaults(config_t *c) {
    memset(c, 0, sizeof(*c));
    strncpy(c->device_id, "tracker-unknown", sizeof(c->device_id) - 1);
    c->mqtt_port            = 1883;
    c->tracking_interval_s  = 10;
    c->heartbeat_interval_s = 300;
    c->alarm_interval_s     = 5;
    c->ignition_off_hold_ms = 15000; // TRACKER_CONFIG_EFFECTIVE_MIN…
    c->sleep_enabled        = true;
}

bool app_config_is_valid(const config_t *c) {
    if (c->device_id[0] == '\0') return false;
    if (c->mqtt_host[0] == '\0') return false;
    if (c->mqtt_port == 0)       return false;
    return true;
}
```

> 💡 Tách `set_defaults` và `is_valid` ra header riêng: lúc boot nếu NVS trống → dùng defaults; nếu config nạp về hỏng → từ chối và quay lại defaults.

## 6. retry_manager — retry KHÔNG chặn

Đây là một viên ngọc của codebase. Thay vì `vTaskDelay()` (chặn cả task), retry manager chỉ ghi nhớ **"khi nào được phép thử lại"**. FSM tiếp tục chạy việc khác trong lúc chờ.

🧩 `retry_manager.h` (rút gọn)

```c
typedef enum { RETRY_MODE_FIXED = 0, RETRY_MODE_EXPONENTIAL } retry_mode_t;

typedef struct {
    retry_mode_t mode;
    uint32_t base_delay_ms;
    uint32_t max_delay_ms;
    uint32_t max_attempts;  // 0 = không giới hạn
    uint32_t jitter_ms;     // 0 = tắt
} retry_policy_t;

typedef struct {
    uint32_t attempts;
    uint64_t next_allowed_ms;
    esp_err_t last_err;
} retry_state_t;

bool retry_state_can_run(const retry_state_t *s, uint64_t now_ms);
esp_err_t retry_state_schedule(retry_state_t *s, const retry_policy_t *p,
                               uint64_t now_ms, esp_err_t err);
```

Cách dùng (pattern lặp khắp firmware), codebase còn gói thành macro `RETRY_ATTEMPT(...)`:

```c
if (retry_state_can_run(&s_net_retry, now_ms)) {
    esp_err_t err = modem_lte_tick(now_ms);
    if (err != ESP_OK) {
        retry_state_schedule(&s_net_retry, &s_net_policy, now_ms, err);
    } else {
        retry_state_reset(&s_net_retry);
    }
}
```

> 💡 Vì sao không chặn? Firmware là **cooperative single-loop**: một chỗ ngủ là cả vòng lặp đứng. Retry kiểu "gate theo thời gian" giữ FSM luôn phản hồi.

## 7. 🔧 Build & kiểm tra

Tạm thời cho `main` require `shared-kernel` rồi build:

```cmake
# main/CMakeLists.txt
idf_component_register(SRCS "main.c" INCLUDE_DIRS "." REQUIRES shared-kernel)
```

```c
// main.c – thử dùng
#include "app_config.h"
config_t c;
app_config_set_defaults(&c);
ESP_LOGI(TAG, "default tracking=%us", c.tracking_interval_s);
```

```powershell
idf.py build
```

## ⚠️ Bẫy thường gặp

- **`#include` ngược:** đừng để `shared-kernel` include header của adapter/domain.
- **Quên null-terminate khi `strncpy`:** trừ 1 cho `\0` như ví dụ.
- **Dùng `vTaskDelay` cho retry:** phá mô hình single-loop. Dùng `retry_manager`.

## ➡️ Tiếp theo

[03 — contracts-device-cloud](./03-contracts-device-cloud.md)
