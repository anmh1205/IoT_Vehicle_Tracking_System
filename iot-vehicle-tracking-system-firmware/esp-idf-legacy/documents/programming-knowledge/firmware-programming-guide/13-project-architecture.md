# 13 - Project Architecture

> Kiến trúc tổng thể firmware: component layout, data flow, design decisions.

---

## Mục lục

1. [High-Level Architecture](#1-high-level-architecture)
2. [Component Dependency](#2-component-dependency)
3. [End-to-End Data Flow](#3-end-to-end-data-flow)
4. [Design Decisions](#4-design-decisions)
5. [File Map](#5-file-map)

---

## 1. High-Level Architecture

```mermaid
graph TD
    subgraph "Cloud"
        BROKER["MQTT Broker"]
        BACKEND["Backend Service"]
    end
    
    subgraph "ESP32-S3 Firmware"
        subgraph "Application Layer"
            FSM["State Machine Core<br/>FSM transitions, orchestration"]
            PUB["Publish Pipeline<br/>Format + send telemetry"]
            OTA_R["OTA Runtime<br/>Update/confirm/rollback"]
        end
        
        subgraph "Domain Layer"
            CMD["Command Handler<br/>Parse cloud commands"]
            SESSION["Session Manager<br/>Driving session lifecycle"]
            OFFLINE["Offline Queue<br/>SD card buffer"]
        end
        
        subgraph "Adapter Layer"
            BLE_A["BLE OBD Adapter<br/>NimBLE + ELM327"]
            MODEM_A["Modem Adapter<br/>SIM7600 AT transport"]
            MQTT_A["MQTT Adapter<br/>MQTT over AT"]
        end
        
        subgraph "Infrastructure"
            NVS_I["NVS Config<br/>Persistent storage"]
            UTIL_I["Utilities<br/>Retry, time, string"]
            PWR["Power Manager<br/>ADC, sleep control"]
        end
    end
    
    subgraph "Hardware"
        SIM["SIM7600<br/>4G + GPS"]
        OBD_HW["ELM327<br/>OBD dongle"]
        IMU_HW["LIS3DSH<br/>Accelerometer"]
        RTC_HW["DS3231M<br/>Real-time clock"]
        SD_HW["SD Card"]
    end
    
    FSM --> PUB
    FSM --> CMD
    FSM --> BLE_A
    FSM --> OTA_R
    PUB --> MQTT_A
    PUB --> OFFLINE
    CMD --> NVS_I
    MQTT_A --> MODEM_A
    BLE_A --> OBD_HW
    MODEM_A --> SIM
    OFFLINE --> SD_HW
    MQTT_A --> BROKER
    BROKER --> BACKEND
```

**Layered Architecture:**
- **Application**: Logic điều khiển — KHÔNG biết hardware cụ thể
- **Domain**: Logic nghiệp vụ — command parsing, session management
- **Adapter**: Giao tiếp hardware cụ thể — có thể thay thế (ví dụ: đổi modem)
- **Infrastructure**: Utilities dùng chung

---

## 2. Component Dependency

```mermaid
graph LR
    MAIN["main"] --> CORE["app-core"]
    CORE --> CONN["domain-connectivity"]
    CORE --> BLE["adapter-ble-obd-nimble"]
    CORE --> MQTT["adapter-mqtt-sim7600-at"]
    CORE --> MODEM_LTE["adapter-modem-sim7600-at"]
    CORE --> OTA["ota-executor"]
    CORE --> OFFLINE_Q["offline-queue"]
    CORE --> PWR_M["power-mgr"]
    CORE --> IMU_D["imu-lis3dsh"]
    CORE --> RTC_D["rtc-ds3231m"]
    
    MQTT --> MODEM_LTE
    CONN --> NVS_C["nvs-config"]
    
    CORE --> UTIL["util"]
    CONN --> UTIL
    BLE --> UTIL
    MODEM_LTE --> UTIL
```

**Quy tắc dependency:**
- Mũi tên = "phụ thuộc vào" (include header, gọi API)
- Tầng trên phụ thuộc tầng dưới (KHÔNG ngược lại)
- Adapter không phụ thuộc lẫn nhau
- Util không phụ thuộc ai (leaf node)

---

## 3. End-to-End Data Flow

### Xe đang chạy → Cloud nhận telemetry

```mermaid
flowchart LR
    subgraph "Sensors"
        OBD["OBD Dongle<br/>Speed: 60km/h<br/>RPM: 2500"]
        GPS["GNSS Module<br/>Lat: 10.76<br/>Lon: 106.66"]
        BATT["ADC<br/>Battery: 12.4V"]
        ACC["IMU<br/>Accel: 0.1g"]
    end
    
    subgraph "FSM Processing"
        TEL["Telemetry struct<br/>Aggregate all data"]
        FMT["JSON Formatter<br/>+ metadata (UUID, seq, ts)"]
    end
    
    subgraph "Transport"
        MQTT_PUB["MQTT Publish<br/>AT+CMQTTPUB"]
        SD["SD Card<br/>(fallback)"]
    end
    
    subgraph "Cloud"
        BRK["Broker → Backend"]
    end
    
    OBD -->|"BLE notify"| TEL
    GPS -->|"AT+CGNSSINFO"| TEL
    BATT -->|"ADC read"| TEL
    ACC -->|"I2C read"| TEL
    
    TEL --> FMT
    FMT -->|"Online"| MQTT_PUB --> BRK
    FMT -->|"Offline"| SD -->|"Replay later"| MQTT_PUB
```

### Cloud gửi command → Device thực thi

```mermaid
flowchart LR
    CLOUD["Cloud Backend"] -->|"MQTT publish"| BROKER["Broker"]
    BROKER -->|"Forward"| MODEM["SIM7600<br/>URC: +CMQTTRX*"]
    MODEM -->|"UART"| PARSE["URC Parser<br/>Ghép topic+payload"]
    PARSE -->|"Callback"| CMD["Command Handler<br/>Parse JSON, validate"]
    CMD -->|"Queue"| FSM["FSM Main<br/>Execute action"]
    FSM --> RESULT{"Action?"}
    RESULT -->|"update_config"| NVS["Write NVS"]
    RESULT -->|"ota_update"| OTA["Download + Flash"]
    RESULT -->|"reboot"| REBOOT["esp_restart()"]
```

---

## 4. Design Decisions

| Quyết định | Lý do |
|------------|-------|
| **1 task FSM thay vì multi-task** | Đơn giản, không race condition, dễ debug. 100ms latency đủ cho tracker |
| **MQTT qua AT thay vì TCP socket** | Tiết kiệm 30KB RAM (không cần TLS stack trên ESP32). Modem xử lý reconnect |
| **Offline queue trên SD card** | Flash NVS có giới hạn write cycles. SD card chịu được millions of writes |
| **Cooperative FSM thay vì event-driven** | Deterministic timing, dễ trace, không cần event loop framework |
| **BLE connect offload sang task riêng** | Blocking 8s — ngoại lệ duy nhất cần task riêng |
| **Retry manager pattern** | Exponential backoff tránh flood khi lỗi liên tục. Configurable per-subsystem |
| **RTC-retained context** | Survive deep sleep — giữ boot count, BLE MAC, OTA state qua sleep cycles |
| **Structured logging (event=...)** | Dễ grep, dễ parse tự động, dễ monitor field devices |

---

## 5. File Map

| File | Vai trò |
|------|---------|
| `main/main.c` | Entry point — chỉ gọi `app_core_bootstrap_run()` |
| `app-core/src/tracker-app-bootstrap.c` | Boot sequence, config load, FSM main loop |
| `app-core/src/state_machine_core.c` | FSM switch/case, state handlers, init |
| `app-core/src/state_obd_runtime.c` | BLE OBD connect task, OBD polling |
| `app-core/src/state_publish_pipeline.c` | Format + publish telemetry/status/events |
| `app-core/src/state_sleep_controller.c` | Sleep decision, shutdown sequence |
| `app-core/src/state_ota_runtime.c` | OTA command handling, confirm/rollback |
| `app-core/src/state_wake_prelude.c` | Wake-up initialization sequence |
| `domain-connectivity/src/command_handler.c` | Parse cloud commands, queue actions |
| `adapter-ble-obd-nimble/src/ble_mgr.c` | BLE scan/connect/disconnect manager |
| `adapter-ble-obd-nimble/src/ble_init.c` | NimBLE stack init/deinit |
| `adapter-modem-sim7600-at/src/modem_at.c` | UART AT transport, mutex, URC dispatch |
| `adapter-mqtt-sim7600-at/src/mqtt_client.c` | MQTT connect/publish/subscribe |
| `adapter-mqtt-sim7600-at/src/mqtt_urc_parser.c` | Parse MQTT URC messages |

---

> Đây là file cuối trong bộ tài liệu programming-knowledge.
> Quay lại: [01-freertos-fundamentals.md](./01-freertos-fundamentals.md)
