# Firmware Architecture — IoT Vehicle Tracker

> **Platform:** ESP-IDF v5.4.x | **MCU:** ESP32-S3 | **Language:** C
> **Reference:** `resources/example/esp32-obd2-meter/` — BLE OBD2 meter (NimBLE + LVGL)
> **Backend Integration:** `Tracking_MqttBridge` (TypeScript) + `Tracking_Backend` (DDD) + EMQX broker

---

## 1. Overview

Firmware cho thiết bi tracker GPS/OBD2 lap tren xe, giao tiep voi cloud qua MQTT over 4G/LTE.

| Function | Hardware | Interface |
|----------|----------|-----------|
| OBD2 (IGN, RPM, Speed, Fuel, Temp) | vgate iCar Pro | BLE (NimBLE) |
| GPS + 4G | SIMCom A7600CE-T | UART AT commands |
| Motion detection | LIS3DH IMU | I2C |
| Power management | Power MUX, IP2312, LVD | GPIO + ADC |
| Telemetry | EMQX broker | MQTT over PPP |

**State machine:** `INIT -> CHECK_IGN -> DRIVING / PARKED / ALARM / HEARTBEAT -> SLEEP`

---

## 2. Layered Architecture

```
+---------------------------------------------------+
|  Layer 4 - Communication                          |
|  mqtt_client . data_formatter . command_handler    |
+---------------------------------------------------+
|  Layer 3 - Application                            |
|  state_machine . alert_engine . data_aggregator    |
+---------------------------------------------------+
|  Layer 2 - Power Management                       |
|  power_mgr . sleep_manager                         |
+---------------------------------------------------+
|  Layer 1 - Hardware Abstraction (Drivers)         |
|  ble_obd . modem_at . imu_lis3dh . adc . gpio     |
+---------------------------------------------------+
```

### Layer Responsibilities

| Layer | Responsibility | FreeRTOS Tasks |
|-------|---------------|----------------|
| **L1 - Drivers** | Raw hardware I/O, register access, interrupt handling | ISR handlers only |
| **L2 - Power** | Battery monitoring, charger control, sleep coordination | `power_task` (periodic) |
| **L3 - Application** | State transitions, data aggregation, alert logic | `state_task` (main loop) |
| **L4 - Communication** | MQTT pub/sub, JSON formatting, command parsing | `mqtt_task`, `cmd_task` |

### Inter-Layer Rules
- **L1 -> L2:** Driver APIs return `esp_err_t`, power layer calls driver APIs
- **L2 -> L3:** Power events (low battery, charger state) via FreeRTOS event groups
- **L3 -> L4:** State machine pushes telemetry data via xQueue to MQTT task
- **L4 -> L3:** Server commands dispatched back to state machine via xQueue
- **NO cross-layer calls** (L1 never calls L3 directly)

---

## 3. Project Structure

```
iot-vehicle-tracking-system/Tracking_Firmware/
|-- CMakeLists.txt
|-- sdkconfig.defaults
|-- partitions.csv                  # OTA-ready (factory + ota_0 + ota_1)
|
|-- main/
|   |-- CMakeLists.txt
|   |-- Kconfig.projbuild
|   |-- main.c
|   |
|   |-- inc/
|   |   |-- app_config.h            # config_t struct + NVS
|   |   |-- app_state.h             # State machine enums + rtc_context_t
|   |   |-- pin_map.h               # GPIO definitions
|   |   |-- util.h                  # ESP_NULL_CHECK, ARRAY_SIZE
|   |   |
|   |   |-- ble_init.h              # BLE stack init
|   |   |-- ble_mgr.h               # BLE manager (NimBLE wrapper)
|   |   |-- ble_obd.h               # BLE OBD2 protocol
|   |   |-- ble_util.h              # BLE address helper
|   |   |-- obd.h                   # PID config types
|   |   |
|   |   |-- modem_at.h              # AT command engine
|   |   |-- modem_lte.h             # 4G/LTE control
|   |   |-- modem_gnss.h            # GNSS control
|   |   |
|   |   |-- imu_lis3dh.h            # IMU driver
|   |   |-- power_mgr.h             # Power management
|   |   |-- adc_reader.h            # ADC (U_batt)
|   |   |
|   |   |-- mqtt_client.h           # MQTT publish/subscribe
|   |   |-- data_formatter.h        # JSON payload builder
|   |   |-- command_handler.h       # Server command processor
|   |   +-- nvs_config.h            # NVS config read/write
|   |
|   +-- src/                        # Implementation files
|       |-- ble_init.c              # <- Copy from reference (84 LOC)
|       |-- ble_mgr.c               # <- Adapt from reference (648 LOC)
|       |-- ble_obd.c               # <- Adapt from reference (289 LOC)
|       |-- ble_util.c              # <- Copy from reference (25 LOC)
|       |-- modem_at.c              # New
|       |-- modem_lte.c             # New
|       |-- modem_gnss.c            # New
|       |-- imu_lis3dh.c            # New
|       |-- power_mgr.c             # New
|       |-- adc_reader.c            # New
|       |-- mqtt_client.c           # New (ESP-IDF component)
|       |-- data_formatter.c        # New
|       |-- command_handler.c       # New
|       |-- state_machine.c         # New
|       |-- nvs_config.c            # <- Adapt from reference (100 LOC)
|       +-- util.c                  # New
|
+-- components/                     # 3rd-party (if needed)
```

---

## 4. GPIO Pin Map

| GPIO | Name | Direction | Description |
|------|------|-----------|-------------|
| 2 | `IGN_IN` | Input | IGN GPIO fallback |
| 4 | `U_BATT_ADC` | Input | ADC battery voltage |
| 5 | `CHARGER_EN` | Output | Enable IP2312 charger |
| 16 | `MODEM_TX` | Output | UART TX -> modem |
| 17 | `MODEM_RX` | Input | UART RX <- modem |
| 18 | `POWER_MUX_SEL` | Output | Power source select |
| 19 | `LVD_STATUS` | Input | LVD output |
| 21 | `LIS3DH_INT` | Input | IMU interrupt (wakeup) |
| 22 | `LIS3DH_SDA` | I/O | I2C data |
| 23 | `LIS3DH_SCL` | I/O | I2C clock |
| 25 | `MODEM_PWRKEY` | Output | Modem power key |

---

## 5. State Machine

```
                    +------+
                    | INIT |
                    +--+---+
                       |
                       v
                 +-----+------+
            +--->| CHECK_IGN  |<---+
            |    +-----+------+    |
            |      |       |       |
            |  IGN ON   IGN OFF    |
            |      |       |       |
            |      v       v       |
            | +--------+ +--------+|
            | |DRIVING | |PARKED  ||
            | +----+---+ +--+--+--+|
            |      |     IMU|  |   |
            |  IGN OFF     v  Timer|
            |      |  +-------+  | |
            |      |  | ALARM |  | |
            |      |  +---+---+  | |
            |      |      |      | |
            |      v      v      v |
            |    +-----------+     |
            |    | HEARTBEAT |     |
            |    +-----+-----+    |
            |          |           |
            |          v           |
            |      +-------+      |
            +------+ SLEEP +------+
                   +-------+
```

### State Descriptions

| State | Active Peripherals | Power Profile | Publish Interval |
|-------|-------------------|---------------|-----------------|
| **INIT** | All initializing | High (~400mA) | None |
| **CHECK_IGN** | BLE or ADC | Medium (~200mA) | None |
| **DRIVING** | BLE + LTE + GNSS | High (~400mA) | 5-30s (rawdata QoS 0) |
| **PARKED** | IMU interrupt only | Transition to SLEEP | 1x status (QoS 1) |
| **ALARM** | LTE + GNSS | High (~400mA) | 5s (event QoS 1) |
| **HEARTBEAT** | LTE + GNSS briefly | Medium (~200mA) | 1x rawdata (QoS 0) |
| **SLEEP** | None (deep sleep) | Ultra-low (<5mA) | None |

---

## 6. MQTT Integration (Must Match Tracking_MqttBridge)

### Topics & QoS

| Topic | Direction | QoS | When |
|-------|-----------|-----|------|
| `v1/{device_id}/rawdata` | -> Server | 0 | Every 5-30s (DRIVING), 15-30min (HEARTBEAT) |
| `v1/{device_id}/status` | -> Server | 1 | DRIVING<->PARKED transition |
| `v1/{device_id}/events` | -> Server | 1 | Errors, warnings, alerts |
| `v1/{device_id}/firmware` | -> Server | 1 | OTA progress (future) |
| `v1/{device_id}/commands` | <- Server | 1 | Remote commands |

### RawData Payload (MUST match `payload.validator.ts` Zod schema)

```json
{
  "device_id": "TRACKER_001",
  "auth_token": "device-secret-token",
  "timestamp": 1704067200000,
  "uptime": 3600,
  "data": {
    "vibration": 120,
    "battery_top": 12.5,
    "battery_bot": 3.8,
    "latitude": 21.028511,
    "longitude": 105.804817,
    "speed": 60.0,
    "course": 180.0,
    "satellites": 8,
    "ignition": true,
    "error_code": 0
  }
}
```

### Validation Rules (bridge rejects if invalid)
- `device_id`, `auth_token`: string, min 1 char
- `latitude`: -90 to 90, `longitude`: -180 to 180
- `speed` >= 0, `course`: 0 to 360, `satellites` >= 0

### Field Mapping

| Field | Source | Notes |
|-------|--------|-------|
| `device_id` | NVS config | |
| `auth_token` | NVS config | Bridge validates via DB |
| `timestamp` | GNSS time or boot time | Unix ms |
| `uptime` | `esp_timer_get_time()` | ms from boot |
| `vibration` | IMU LIS3DH | Composite acceleration (bridge threshold = 500) |
| `battery_top` | ADC GPIO4 | Vehicle battery (V) |
| `battery_bot` | ADC/GPIO | Backup battery (V) |
| `latitude/longitude` | GNSS `AT+CGNSINF` | |
| `speed` | GNSS (priority) or OBD2 0x0D | km/h |
| `course` | GNSS | 0-360 deg |
| `satellites` | GNSS | |
| `ignition` | OBD2 RPM>0 (priority) or U_batt>13V | boolean |
| `error_code` | App logic | 0 = OK |

---

## 7. NVS Config Structure

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

## 8. RTC Memory (persists across deep sleep)

```c
typedef struct {
    app_state_t last_state;
    uint32_t    boot_count;
    uint32_t    last_heartbeat_ts;
    uint8_t     ble_mac[6];         // vgate MAC cache
    bool        ign_last_known;
    float       last_battery_v;
} rtc_context_t;

RTC_DATA_ATTR static rtc_context_t rtc_ctx;
```

---

## 9. ESP-IDF Dependencies

| Component | Source | Purpose |
|-----------|--------|---------|
| `bt` (NimBLE) | ESP-IDF | BLE client |
| `esp_modem` | ESP-IDF component | PPP over UART |
| `mqtt` | ESP-IDF | MQTT client |
| `nvs_flash` | ESP-IDF | Config storage |
| `cJSON` | ESP-IDF | JSON formatting |
| `driver` | ESP-IDF | GPIO, UART, I2C, ADC |
| `esp_adc` | ESP-IDF | ADC oneshot + calibration |

---

## 10. sdkconfig.defaults

```ini
# BLE (NimBLE only, central role)
CONFIG_BT_ENABLED=y
CONFIG_BT_NIMBLE_ENABLED=y
CONFIG_BT_NIMBLE_MAX_CONNECTIONS=1
CONFIG_BT_NIMBLE_ROLE_CENTRAL=y
CONFIG_BT_NIMBLE_ROLE_PERIPHERAL=n
CONFIG_BT_NIMBLE_ROLE_BROADCASTER=n
CONFIG_BT_NIMBLE_ROLE_OBSERVER=y

# UART (console on UART0, modem on UART1)
CONFIG_ESP_CONSOLE_UART_NUM=0

# Power Management
CONFIG_PM_ENABLE=y
CONFIG_FREERTOS_USE_TICKLESS_IDLE=y

# Partition (OTA-ready)
CONFIG_PARTITION_TABLE_CUSTOM=y
CONFIG_PARTITION_TABLE_CUSTOM_FILENAME="partitions.csv"
```

---

## 11. OBD2 PIDs

| PID | Name | Bytes | Conversion | Purpose |
|-----|------|-------|------------|---------|
| 0x0C | RPM | 2 | (A*256+B)/4 | Detect IGN (RPM>0) |
| 0x0D | Speed | 1 | A km/h | Telemetry |
| 0x05 | Coolant Temp | 1 | A-40 C | Telemetry |
| 0x2F | Fuel Level | 1 | A*100/255 % | Telemetry |
| 0x04 | Engine Load | 1 | A*100/255 % | Telemetry |

---

## 12. Risk Matrix

| Risk | Probability | Mitigation |
|------|-------------|------------|
| vgate iCar Pro incompatible | Medium | Test early in Phase 2A; fallback U_batt |
| A7600 AT instability | Low | Retry + modem hard reset |
| GNSS cold start slow (60s) | High | Accept sending data without GPS if timeout |
| Deep sleep current too high | Medium | Audit GPIO state + properly shutdown peripherals |
| NVS wear | Low | RTC memory for temp data; limit write frequency |
| Stack overflow | Medium | Monitor `uxTaskGetStackHighWaterMark()` |

---

## 13. Execution Phases

> See compact sub-phase files in `phases/` for implementation details.

| Phase | Sub-Phase | Description | Dependencies |
|-------|-----------|-------------|--------------|
| Phase 1A | Foundation | Project skeleton, toolchain, pin map, NVS config, utilities | None |
| Phase 2A | BLE OBD2 | Adapt from reference: BLE init, manager, OBD2 protocol | 1A |
| Phase 2B | Hardware Drivers | ADC reader, IMU LIS3DH, power manager | 1A |
| Phase 2C | Modem | AT engine, LTE control, GNSS control | 1A |
| Phase 3A | Communication | MQTT client, data formatter, command handler | 2B, 2C |
| Phase 4A | Integration | State machine, main loop, full cycle testing | 2A, 3A |

> Phase 2A, 2B, 2C can run in parallel (BLE, drivers, modem are independent).

---

## Full Spec Reference
- [firmware-development-plan.md](../design-reports/firmware-development-plan.md) — Original development plan (Vietnamese)
- [esp32-obd2-meter/](../example/esp32-obd2-meter/) — Reference BLE OBD2 project
- [22-backend-mqtt-bridge.md](../cloud-coding-plan/22-backend-mqtt-bridge.md) — MQTT Bridge payload contract
