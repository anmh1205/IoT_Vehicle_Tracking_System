# 09 - Power Management

> Sleep modes, tickless idle, wake sources, power budget.

---

## Mục lục

1. [Tại sao cần quản lý điện?](#1-tại-sao-cần-quản-lý-điện)
2. [ESP32 Sleep Modes](#2-esp32-sleep-modes)
3. [Wake Sources](#3-wake-sources)
4. [Tickless Idle](#4-tickless-idle)
5. [Power Budget](#5-power-budget)
6. [Sleep Flow trong project](#6-sleep-flow-trong-project)

---

## 1. Tại sao cần quản lý điện?

Thiết bị tracker chạy bằng pin xe (12V). Khi xe tắt máy:
- Nếu không ngủ: tiêu thụ ~150mA → hết pin xe trong vài ngày
- Nếu deep sleep: tiêu thụ ~0.1mA → pin xe sống hàng tháng

---

## 2. ESP32 Sleep Modes

```mermaid
graph TD
    subgraph "Active (~150mA)"
        A["ACTIVE<br/>CPU chạy, WiFi/BLE/LTE on<br/>Mọi peripheral hoạt động"]
    end
    
    subgraph "Light Sleep (~0.5mA)"
        B["LIGHT SLEEP<br/>CPU pause, RAM giữ nguyên<br/>Wake nhanh (~1ms)<br/>Tiếp tục từ chỗ cũ"]
    end
    
    subgraph "Deep Sleep (~0.05mA)"
        C["DEEP SLEEP<br/>CPU off, RAM mất<br/>Chỉ RTC memory sống<br/>Wake = REBOOT hoàn toàn"]
    end
    
    A -->|"esp_light_sleep_start()"| B
    B -->|"Wake event"| A
    A -->|"esp_deep_sleep_start()"| C
    C -->|"Wake event"| D["REBOOT<br/>app_main() chạy lại từ đầu"]
```

| Mode | Dòng điện | RAM | Wake time | Dùng khi |
|------|-----------|-----|-----------|----------|
| Active | ~150mA | ✓ Giữ | N/A | Xe đang chạy |
| Light Sleep | ~0.5mA | ✓ Giữ | ~1ms | Xe đỗ, cần wake nhanh |
| Deep Sleep | ~0.05mA | ✗ Mất | ~200ms (reboot) | Xe đỗ lâu, tiết kiệm tối đa |

**Trong project:**
- **Xe chạy (DRIVING)**: Active — poll OBD, publish liên tục
- **Xe đỗ, IMU wake enabled**: Light sleep — wake nhanh khi có rung
- **Xe đỗ, chỉ timer wake**: Deep sleep — tiết kiệm tối đa

---

## 3. Wake Sources

```mermaid
flowchart TD
    subgraph "Wake Sources"
        TIMER["Timer Wake<br/>RTC timer đếm ngược<br/>Mỗi N phút wake 1 lần<br/>→ Gửi heartbeat"]
        
        GPIO["GPIO Wake (EXT0)<br/>IMU interrupt pin<br/>Xe rung/di chuyển<br/>→ Alarm event"]
    end
    
    TIMER --> WAKE["ESP32 Wake Up"]
    GPIO --> WAKE
    
    WAKE --> CHECK{"Wakeup cause?"}
    CHECK -->|"ESP_SLEEP_WAKEUP_TIMER"| HB["APP_STATE_HEARTBEAT<br/>Gửi heartbeat rồi ngủ lại"]
    CHECK -->|"ESP_SLEEP_WAKEUP_EXT0"| AL["APP_STATE_ALARM<br/>Gửi alarm rồi ngủ lại"]
```

**Code:**
```c
// Cấu hình wake sources trước khi ngủ
esp_sleep_enable_timer_wakeup(wake_interval_us);  // Timer
esp_sleep_enable_ext0_wakeup(PIN_IMU_INT, 1);     // GPIO (IMU interrupt)

// Sau khi wake, kiểm tra nguyên nhân
esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
if (cause == ESP_SLEEP_WAKEUP_TIMER) {
    state = APP_STATE_HEARTBEAT;
} else if (cause == ESP_SLEEP_WAKEUP_EXT0) {
    state = APP_STATE_ALARM;
}
```

---

## 4. Tickless Idle

Khi FreeRTOS không có task nào cần chạy (tất cả đang blocked/delayed),
thay vì tick interrupt fire mỗi 10ms (tốn điện), nó tắt tick và đưa CPU vào idle.

```mermaid
sequenceDiagram
    participant Task as FSM Task
    participant Sched as Scheduler
    participant CPU as CPU

    Task->>Sched: vTaskDelay(100ms)
    Note over Task: BLOCKED 100ms
    
    Sched->>Sched: Không task nào Ready
    Sched->>CPU: Tắt tick interrupt
    Note over CPU: IDLE (tiết kiệm điện)<br/>Không tick mỗi 10ms
    
    Note over CPU: ...90ms trôi qua...
    
    CPU->>CPU: Timer interrupt: 100ms hết!
    CPU->>Sched: Bật tick lại
    Sched->>Task: Unblock!
```

**Config:**
```
CONFIG_PM_ENABLE=y
CONFIG_FREERTOS_USE_TICKLESS_IDLE=y
```

---

## 5. Power Budget

| Component | Active | Sleep |
|-----------|--------|-------|
| ESP32-S3 CPU | ~80mA | ~0.01mA (deep) |
| SIM7600 Modem | ~60mA | 0mA (power off) |
| BLE (NimBLE) | ~10mA | 0mA (deinit) |
| SD Card | ~5mA | ~0.01mA (idle) |
| RTC DS3231M | ~0.1mA | ~0.1mA |
| IMU LIS3DSH | ~0.1mA | ~0.01mA |
| **TỔNG** | **~155mA** | **~0.13mA** |

Deep sleep giảm tiêu thụ **1000x** so với active!

---

## 6. Sleep Flow trong project

```mermaid
flowchart TD
    A{"Sleep eligible?"} -->|"✓ Ignition OFF<br/>✓ sleep_enabled<br/>✓ No OTA<br/>✓ No BLE inflight"| B["Shutdown sequence"]
    A -->|"✗"| Z["Tiếp tục active"]
    
    B --> C["1. Disconnect BLE OBD"]
    C --> D["2. Deinit BLE stack<br/>(wait semaphore)"]
    D --> E["3. Disconnect MQTT"]
    E --> F["4. Deactivate LTE"]
    F --> G["5. Power off modem<br/>+ delay 250ms"]
    G --> H["6. Configure wake sources"]
    H --> I{"Sleep mode?"}
    
    I -->|"IMU wake enabled"| J["Light Sleep<br/>esp_light_sleep_start()<br/>Wake → tiếp tục code"]
    I -->|"Timer only"| K["Deep Sleep<br/>esp_deep_sleep_start()<br/>Wake → REBOOT"]
    I -->|"Debug/USB attached"| L["Fake Sleep<br/>vTaskDelay loop<br/>Giả ngủ, vẫn active"]
```

**Fake Sleep:** Khi USB debug đang kết nối, deep sleep sẽ ngắt kết nối USB → mất monitor.
Project dùng "fake sleep" (vòng lặp delay) để giữ USB nhưng vẫn test sleep logic.

---

> **Tiếp theo:** [10-ota-firmware-update.md](./10-ota-firmware-update.md) — OTA update flow
