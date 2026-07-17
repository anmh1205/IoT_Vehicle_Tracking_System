# 19 - Session & Ignition Lifecycle

> Quản lý driving session: ignition debounce, session start/stop, NVS persistence.
> Files: `domain-connectivity/src/session_mgr.c`, `app-core/src/state_machine_core.c`

---

## Mục lục

1. [Session là gì?](#1-session-là-gì)
2. [Ignition Debounce](#2-ignition-debounce)
3. [Session Lifecycle](#3-session-lifecycle)
4. [Ignition Detection Methods](#4-ignition-detection-methods)
5. [Session Persistence](#5-session-persistence)

---

## 1. Session là gì?

Một "session" = 1 chuyến đi (từ nổ máy đến tắt máy).
Cloud dùng session để nhóm telemetry data theo chuyến.

```mermaid
flowchart LR
    A["Ignition ON"] --> B["Session Start<br/>session_id = 42"]
    B --> C["DRIVING<br/>Publish rawdata<br/>với session_id=42"]
    C --> D["Ignition OFF<br/>(debounced 1.5s)"]
    D --> E["Hold window<br/>(15s chờ xác nhận)"]
    E --> F["Session End<br/>Publish status: stopped"]
    F --> G["PARKED → SLEEP"]
```

---

## 2. Ignition Debounce

Tín hiệu ignition có thể "nhảy" (relay bounce, ECU restart). Session manager
chờ signal ổn định trước khi xác nhận:

```mermaid
stateDiagram-v2
    [*] --> WaitFirstSample : init
    WaitFirstSample --> Debouncing : Nhận sample đầu tiên
    Debouncing --> Debouncing : Sample thay đổi → reset timer
    Debouncing --> StableON : Giữ ON >= 1500ms
    Debouncing --> StableOFF : Giữ OFF >= 1500ms
    StableON --> Debouncing : Sample = OFF (bắt đầu debounce mới)
    StableOFF --> Debouncing : Sample = ON (bắt đầu debounce mới)
    StableON --> [*] : pending_start = true
```

**Code:**
```c
void session_mgr_on_ignition_sample(bool ignition_on, uint64_t now_ms) {
    // Nếu sample khác lần trước → reset debounce timer
    if (ignition_on != s_ctx.last_sample) {
        s_ctx.last_sample = ignition_on;
        s_ctx.edge_ms = now_ms;  // Restart timer
    }

    // Chờ đủ 1500ms ổn định
    uint64_t elapsed = now_ms - s_ctx.edge_ms;
    if (elapsed < CONFIG_TRACKER_IGNITION_DEBOUNCE_MS) {
        return;  // Chưa đủ → chờ tiếp
    }

    // Ổn định! Accept new state
    session_mgr_accept_stable_ignition(ignition_on);
}
```

---

## 3. Session Lifecycle

```mermaid
sequenceDiagram
    participant IGN as Ignition Signal
    participant SM as Session Manager
    participant FSM as FSM
    participant MQTT as MQTT

    IGN->>SM: ON (stable after 1.5s)
    SM->>SM: pending_start = true
    
    FSM->>SM: session_mgr_should_start()?
    SM-->>FSM: true (one-shot)
    FSM->>SM: session_mgr_mark_started()
    Note over SM: session_id = 42, state = ACTIVE
    
    FSM->>MQTT: Publish status: "running"<br/>boundary_event: "started"
    
    loop Driving
        FSM->>MQTT: Publish rawdata (session_id=42)
    end
    
    IGN->>SM: OFF (stable after 1.5s)
    Note over FSM: Ignition OFF hold window (15s)
    
    FSM->>FSM: state_machine_commit_session_end()
    FSM->>SM: session_mgr_mark_stopped()
    FSM->>MQTT: Publish status: "stopped"<br/>boundary_event: "ended"
```

**Ignition OFF Hold Window:**

Sau khi ignition OFF debounce xong, FSM vẫn chờ thêm 15 giây (`ignition_off_hold_ms`)
trước khi kết thúc session. Lý do:
- Xe dừng đèn đỏ → RPM=0 tạm thời → không nên kết thúc session
- ECU restart ngắn → không nên tạo session mới
- Cho phép OBD data cuối cùng được publish trước khi disconnect

---

## 4. Ignition Detection Methods

Project dùng 2 nguồn để detect ignition:

```mermaid
flowchart TD
    A["OBD RPM > 0?"] -->|YES| B["Ignition = ON<br/>(tin cậy nhất)"]
    A -->|"NO hoặc<br/>OBD disconnected"| C["ADC voltage > threshold?"]
    C -->|"> 11V"| D["Ignition = ON<br/>(fallback)"]
    C -->|"< 11V"| E["Ignition = OFF"]
```

| Nguồn | Ưu tiên | Khi nào dùng |
|--------|---------|-------------|
| OBD RPM | Cao nhất | Khi BLE OBD connected + ELM ready |
| ADC voltage | Fallback | Khi OBD disconnected |

---

## 5. Session Persistence

Session context được lưu NVS để survive reboot:

```c
typedef struct {
    bool active;                    // Session đang mở?
    uint32_t local_session_key;     // Session ID local
    uint64_t canonical_session_id;  // Session ID từ cloud
    char boot_id[48];               // Boot ID tạo session
} session_persist_context_t;
```

Khi reboot giữa chuyến đi (OTA, crash):
1. Boot mới đọc NVS → thấy session active
2. `session_mgr_restore_active(session_id)` → tiếp tục session cũ
3. Chờ ignition sample mới để xác nhận xe vẫn đang chạy

---

> **Tiếp theo:** [20-command-handler.md](./20-command-handler.md)
