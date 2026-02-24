# Sub-Phase 1A: Foundation & Project Skeleton

> **Context:** ~5KB | **Max Files:** 8 | **Est. Time:** 1 session

## Summary
Khởi tạo ESP-IDF project, cấu hình toolchain, định nghĩa GPIO pin map, NVS config struct, utility macros. Đây là nền tảng cho tất cả phase sau.

## Tasks
| ID     | Description                          | Files                                                    |
| ------ | ------------------------------------ | -------------------------------------------------------- |
| FW-001 | ESP-IDF project init + CMakeLists    | `CMakeLists.txt`, `main/CMakeLists.txt`                  |
| FW-002 | Partition table (OTA-ready)          | `partitions.csv`                                         |
| FW-003 | SDK config defaults                  | `sdkconfig.defaults`                                     |
| FW-004 | Kconfig menu (tunable params)        | `main/Kconfig.projbuild`                                 |
| FW-005 | GPIO pin map definitions             | `main/inc/pin_map.h`                                     |
| FW-006 | App state enums + RTC context        | `main/inc/app_state.h`                                   |
| FW-007 | NVS config struct + read/write       | `main/inc/app_config.h`, `main/inc/nvs_config.h`, `main/src/nvs_config.c` |
| FW-008 | Utility macros + helpers             | `main/inc/util.h`, `main/src/util.c`                     |
| FW-009 | Skeleton main.c (init + blink test)  | `main/main.c`                                            |

## Key Definitions

### pin_map.h
```c
#pragma once

// IGN detection (GPIO fallback)
#define PIN_IGN_IN          2

// ADC - Battery voltage
#define PIN_U_BATT_ADC      4

// Power management
#define PIN_CHARGER_EN      5
#define PIN_POWER_MUX_SEL   18
#define PIN_LVD_STATUS      19

// Modem UART
#define PIN_MODEM_TX        16
#define PIN_MODEM_RX        17
#define PIN_MODEM_PWRKEY    25

// IMU I2C + interrupt
#define PIN_LIS3DH_SDA      22
#define PIN_LIS3DH_SCL      23
#define PIN_LIS3DH_INT      21

// UART config
#define MODEM_UART_NUM      UART_NUM_1
#define MODEM_UART_BAUD     115200
```

### app_state.h
```c
#pragma once
#include <stdint.h>
#include <stdbool.h>

typedef enum {
    APP_STATE_INIT = 0,
    APP_STATE_CHECK_IGN,
    APP_STATE_DRIVING,
    APP_STATE_PARKED,
    APP_STATE_ALARM,
    APP_STATE_HEARTBEAT,
    APP_STATE_SLEEP,
} app_state_t;

typedef struct {
    app_state_t last_state;
    uint32_t    boot_count;
    uint32_t    last_heartbeat_ts;
    uint8_t     ble_mac[6];
    bool        ign_last_known;
    float       last_battery_v;
} rtc_context_t;
```

### app_config.h (NVS config)
```c
typedef struct {
    char     device_id[32];
    char     auth_token[64];
    char     mqtt_host[64];
    uint16_t mqtt_port;             // default: 1883
    char     mqtt_username[32];
    char     mqtt_password[64];
    uint16_t heartbeat_interval_s;  // default: 900
    uint16_t tracking_interval_s;   // default: 10
    char     obd2_ble_address[18];  // "AA:BB:CC:DD:EE:FF"
    float    lvd_threshold_v;       // default: 12.0
    float    lvd_hysteresis_v;      // default: 12.2
} config_t;
```

### sdkconfig.defaults
```ini
# BLE (NimBLE only, central role)
CONFIG_BT_ENABLED=y
CONFIG_BT_NIMBLE_ENABLED=y
CONFIG_BT_NIMBLE_MAX_CONNECTIONS=1
CONFIG_BT_NIMBLE_ROLE_CENTRAL=y
CONFIG_BT_NIMBLE_ROLE_PERIPHERAL=n
CONFIG_BT_NIMBLE_ROLE_BROADCASTER=n
CONFIG_BT_NIMBLE_ROLE_OBSERVER=y

# UART
CONFIG_ESP_CONSOLE_UART_NUM=0

# Power Management
CONFIG_PM_ENABLE=y
CONFIG_FREERTOS_USE_TICKLESS_IDLE=y

# Partition (OTA-ready)
CONFIG_PARTITION_TABLE_CUSTOM=y
CONFIG_PARTITION_TABLE_CUSTOM_FILENAME="partitions.csv"
```

### partitions.csv
```
# Name,    Type, SubType, Offset,  Size,   Flags
nvs,       data, nvs,     ,        0x6000,
otadata,   data, ota,     ,        0x2000,
phy_init,  data, phy,     ,        0x1000,
factory,   app,  factory, ,        1536K,
ota_0,     app,  ota_0,   ,        1536K,
ota_1,     app,  ota_1,   ,        1536K,
```

### util.h Macros
```c
#pragma once
#include "esp_err.h"
#include "esp_log.h"

#define ARRAY_SIZE(arr) (sizeof(arr) / sizeof((arr)[0]))

#define ESP_NULL_CHECK(ptr, tag, msg)       \
    do {                                     \
        if ((ptr) == NULL) {                 \
            ESP_LOGE(tag, "%s", msg);        \
            return;                          \
        }                                    \
    } while (0)

#define ESP_RETURN_ON_NULL(ptr, tag, msg, ret) \
    do {                                        \
        if ((ptr) == NULL) {                    \
            ESP_LOGE(tag, "%s", msg);           \
            return (ret);                       \
        }                                       \
    } while (0)

#define ESP_CHECK(cond, tag, msg)           \
    do {                                     \
        if (!(cond)) {                       \
            ESP_LOGE(tag, "%s", msg);        \
            return;                          \
        }                                    \
    } while (0)
```

## Dependencies
- ✅ Independent — first phase, no prerequisites
- ➡️ Phase 2A, 2B, 2C all depend on this

## Verification
- [ ] `idf.py build` — compiles without errors
- [ ] `idf.py flash monitor` — blink test or log output OK
- [ ] NVS read/write: save config -> reboot -> load config matches
- [ ] Pin map compiles and all GPIOs are valid for ESP32-S3

## Full Spec Reference
- [00-firmware-architecture.md](../../00-firmware-architecture.md) — Architecture overview
- [firmware-development-plan.md](../../../../design-reports/firmware-development-plan.md) — Phase 0 details
