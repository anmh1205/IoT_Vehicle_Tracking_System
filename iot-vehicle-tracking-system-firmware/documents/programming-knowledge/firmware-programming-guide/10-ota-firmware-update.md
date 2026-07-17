# 10 - OTA Firmware Update

> Over-The-Air update: download, flash, confirm, rollback.

---

## Mục lục

1. [OTA là gì?](#1-ota-là-gì)
2. [Partition Scheme](#2-partition-scheme)
3. [Update Flow](#3-update-flow)
4. [Confirm & Rollback](#4-confirm--rollback)
5. [Safety Checks](#5-safety-checks)

---

## 1. OTA là gì?

OTA (Over-The-Air) cho phép cập nhật firmware từ xa qua mạng,
không cần kết nối USB vật lý. Quan trọng cho thiết bị IoT triển khai ngoài field.

**Rủi ro:** Nếu firmware mới bị lỗi → device "brick" (không hoạt động).
Giải pháp: **dual partition + rollback**.

---

## 2. Partition Scheme

```mermaid
graph TD
    subgraph "Flash Memory"
        BOOT["Bootloader<br/>Chọn partition nào boot"]
        OTA_DATA["OTA Data<br/>Ghi nhớ partition active"]
        APP0["app0 (ota_0)<br/>Firmware v1.0<br/>← ĐANG CHẠY"]
        APP1["app1 (ota_1)<br/>Firmware v1.1<br/>← GHI MỚI VÀO ĐÂY"]
        NVS["NVS<br/>Config + OTA context"]
    end
    
    BOOT --> OTA_DATA
    OTA_DATA -->|"boot = app0"| APP0
```

**Giải thích:**
- 2 partition firmware (app0, app1) — luôn có 1 bản backup
- Firmware hiện tại chạy từ app0
- Download firmware mới → ghi vào app1 (không đụng app0)
- Reboot → boot từ app1
- Nếu app1 lỗi → rollback về app0 (vẫn còn nguyên)

---

## 3. Update Flow

```mermaid
sequenceDiagram
    participant Cloud as Cloud Server
    participant FSM as FSM Main
    participant Flash as Flash Memory
    participant Boot as Bootloader

    Cloud->>FSM: Command: ota_update<br/>{url, version, job_id}
    
    FSM->>FSM: Safety check:<br/>Battery OK? No BLE inflight?
    
    FSM->>Cloud: Status: ASSIGNED
    
    FSM->>FSM: HTTP download firmware.bin<br/>(qua modem AT commands)
    FSM->>Cloud: Status: DOWNLOADING (progress %)
    
    FSM->>Flash: Ghi từng chunk vào app1 partition
    FSM->>Cloud: Status: INSTALLING
    
    FSM->>Flash: Set boot partition = app1
    FSM->>FSM: Lưu OTA context vào NVS<br/>(job_id, version, deadline)
    FSM->>Cloud: Status: REBOOTING
    
    FSM->>Boot: esp_restart()
    
    Note over Boot: REBOOT!
    Boot->>Flash: Đọc OTA data → boot app1
    
    Note over FSM: Firmware v1.1 chạy!
    FSM->>FSM: Kiểm tra OTA context từ NVS
    FSM->>FSM: esp_ota_mark_app_valid_cancel_rollback()
    FSM->>Cloud: Status: CONFIRMING
    FSM->>Cloud: Status: SUCCESS ✓
```

---

## 4. Confirm & Rollback

```mermaid
flowchart TD
    A["Boot firmware mới (app1)"] --> B{"OTA pending confirm?"}
    
    B -->|CÓ| C["Kiểm tra deadline"]
    C --> D{"Quá deadline?"}
    D -->|CÓ| E["Status: FAILED<br/>esp_restart() → rollback"]
    D -->|KHÔNG| F["esp_ota_mark_app_valid()"]
    F --> G{"Mark OK?"}
    G -->|OK| H["Status: SUCCESS ✓<br/>Clear OTA context"]
    G -->|FAIL| I["Status: FAILED<br/>esp_restart() → rollback"]
    
    B -->|KHÔNG| J["Boot bình thường"]
    
    E --> K["Bootloader tự chọn app0<br/>(firmware cũ, ổn định)"]
```

**Giải thích:**
- Sau OTA reboot, firmware mới phải **confirm** trong thời gian cho phép
- `esp_ota_mark_app_valid_cancel_rollback()`: "Firmware mới OK, đừng rollback"
- Nếu firmware mới crash trước khi confirm → watchdog reset → bootloader chọn app0
- Nếu quá deadline → firmware tự rollback

**OTA context được lưu NVS** (survive reboot):
- `job_id`: ID của OTA job (để report status)
- `target_version`: Version mới
- `confirm_deadline_ms`: Thời hạn confirm
- `pending_confirm`: Flag "cần confirm"

---

## 5. Safety Checks

Trước khi bắt đầu OTA:

| Check | Lý do |
|-------|-------|
| Battery > threshold | Mất điện giữa flash → brick |
| No BLE connect inflight | Tránh conflict resource |
| MQTT connected | Cần report status |
| Not already in OTA | Tránh concurrent OTA |

```c
static bool state_machine_ota_start_is_safe(void) {
    // Kiểm tra mọi điều kiện trước khi bắt đầu OTA
    if (s_telemetry.vehicle_battery < s_config.ota_min_battery_mv) return false;
    if (s_ble_connect_inflight) return false;
    // ...
    return true;
}
```

---

> **Tiếp theo:** [11-debugging-techniques.md](./11-debugging-techniques.md) — Debug firmware
