# Firmware Stability Deep Audit Report

**Date**: 2026-05-22
**Scope**: Toàn bộ source firmware ESP32-S3, focus vào hang/crash/resource leak
**Method**: Static code review + runtime monitoring 15 phút (0 crash observed)

---

## 1. BLE Init/Deinit Cycle — HIGH RISK

### 1.1 Semaphore use-after-free khi deinit timeout

**File**: `ble_init.c:204-222`

```c
esp_err_t ble_stack_deinit(void) {
    nimble_port_stop();
    if (s_ble_stop_sem != NULL) {
        if (xSemaphoreTake(s_ble_stop_sem, pdMS_TO_TICKS(1000)) != pdTRUE) {
            ESP_LOGW(TAG, "event=nimble_host_task_stop_timeout");
        }
        vSemaphoreDelete(s_ble_stop_sem);  // ← Xóa semaphore
        s_ble_stop_sem = NULL;
    }
    nimble_port_deinit();
    s_stack_started = false;
}
```

**Vấn đề**: Nếu timeout (NimBLE host task chưa thoát sau 1s):
- Semaphore bị xóa
- NimBLE host task vẫn chạy, sau đó gọi `xSemaphoreGive(s_ble_stop_sem)` → crash

**Tần suất**: Mỗi 120s sleep cycle gọi deinit. Nếu BLE radio busy (connection teardown chậm), timeout xảy ra.

**Impact**: Crash/hang ngẫu nhiên. LED kẹt sáng vì GPIO giữ state khi CPU crash.

### 1.2 BLE manager singleton stale state race

**File**: `ble_mgr.c:730-780`

Khi `ble_stack_deinit()` timeout, NimBLE callbacks vẫn chạy trên Core 1 và access `s_mgr.result_queue`. Nếu queue đã bị delete bởi `ble_mgr_reset_context()` → use-after-free.

### 1.3 Đề xuất fix

```c
esp_err_t ble_stack_deinit(void) {
    nimble_port_stop();
    if (s_ble_stop_sem != NULL) {
        // Tăng timeout lên 3s để cho NimBLE đủ thời gian
        if (xSemaphoreTake(s_ble_stop_sem, pdMS_TO_TICKS(3000)) != pdTRUE) {
            ESP_LOGE(TAG, "event=nimble_host_task_stop_timeout action=force_continue");
            // KHÔNG xóa semaphore nếu timeout — để task tự cleanup
            // Chỉ mark as not started để next init tạo sem mới
        } else {
            vSemaphoreDelete(s_ble_stop_sem);
            s_ble_stop_sem = NULL;
        }
    }
    nimble_port_deinit();
    s_stack_started = false;
}
```

---

## 2. SD Card File Operations — MODERATE RISK

### 2.1 Blocking file I/O trên main FSM task

**File**: `sd_log_store.c`

`fopen/fwrite/fsync/fclose` là blocking operations. Nếu SD card:
- Bị lỏng connector → `fopen` block vài giây
- Bad sector → `fwrite` block
- Power issue → `fsync` block indefinitely

Tất cả chạy trên main FSM task (Core 0). Trong thời gian block:
- FSM không yield → WDT có thể trigger (timeout 5s)
- USB guarded sleep loop không chạy → device "treo" từ góc nhìn user

### 2.2 Đề xuất

- Thêm timeout cho SD operations (dùng alarm/timer)
- Hoặc move SD I/O sang task riêng với queue

---

## 3. MQTT Publish Path — MODERATE RISK

### 3.1 AT command chain blocking

**File**: `mqtt_publish.c`, `mqtt_urc_parser.c`

Mỗi MQTT publish = 3 AT commands tuần tự:
1. `AT+CMQTTTOPIC` (8s timeout)
2. `AT+CMQTTPAYLOAD` (8s timeout)
3. `AT+CMQTTPUB` (15s timeout)

Tổng worst-case: **31s blocking** trên main task. Trong thời gian này:
- USB guarded sleep loop không chạy
- LED không update
- Từ góc nhìn user: device "treo" 31s

### 3.2 MQTT connect timeout

`MQTT_CONNECT_TIMEOUT_MS = 120000U` (2 phút!). Nếu broker unreachable, main task block 2 phút.

### 3.3 Đề xuất

- Giảm MQTT_CONNECT_TIMEOUT_MS xuống 30s
- Hoặc move MQTT operations sang task riêng

---

## 4. Modem AT Mutex — LOW-MODERATE RISK

### 4.1 portMAX_DELAY trong config functions

**File**: `modem_at.c`

`modem_at_set_baud()`, `modem_at_set_pins()`, etc. dùng `portMAX_DELAY`. Nếu AT command đang chạy (MQTT connect 120s), caller block vĩnh viễn.

**Hiện tại safe** vì config functions chỉ gọi lúc init. Nhưng nếu future code gọi runtime → hang.

### 4.2 Đề xuất

Thay `portMAX_DELAY` bằng bounded timeout (30s) + error return.

---

## 5. USB Guarded Sleep — LOW RISK (đã fix)

### 5.1 Grace period 60s

Đã implement. Sau boot, device giả định USB connected 60s → không vào real sleep.

### 5.2 `usb_serial_jtag_is_connected()` reliability

Hàm này check SOF packets. Nếu host PC suspend USB bus (screen lock, sleep), SOF dừng → function trả false → device vào real sleep → USB mất.

**Đây có thể là "treo" mà user thấy**: PC sleep → USB suspend → device vào real sleep → LED kẹt ON (GPIO giữ state trong light sleep).

---

## 6. Main Task Stack — LOW RISK

`CONFIG_ESP_MAIN_TASK_STACK_SIZE = 12288` (12KB). Stack HWM observed: 1572 words = 6288 bytes used. Headroom: ~6KB. Safe.

---

## 7. Memory Leak Paths — LOW RISK

### 7.1 BLE connect task args

`calloc(1, sizeof(tracker_ble_connect_task_args_t))` — 24 bytes. Freed in task function. Leak only if task killed before free (unlikely with current design).

### 7.2 cJSON payloads

`data_format_rawdata()` returns heap string. Caller (`state_publish_pipeline.c`) frees via `cJSON_free()`. Verified: no leak path.

---

## 8. Race Conditions — LOW RISK

### 8.1 BLE worker (Core 1) vs FSM (Core 0)

Communication via `xQueueOverwrite` — atomic, safe. `s_ble_ctx` only written by FSM task after queue receive. No race.

### 8.2 NimBLE callbacks vs FSM reads

`s_mgr.is_connected` written by NimBLE (Core 1), read by FSM (Core 0). Single-word access is atomic on ESP32-S3. Stale value for 1 iteration (100ms) is acceptable.

---

## Tổng kết Root Cause cho "treo"

| # | Hypothesis | Likelihood | Mechanism |
|---|-----------|-----------|-----------|
| 1 | BLE deinit timeout → semaphore crash | **High** | Crash → CPU halt → LED stuck ON |
| 2 | PC USB suspend → real sleep | **High** | Light sleep → GPIO holds → LED stuck ON |
| 3 | SD card blocking → WDT/perceived hang | **Medium** | 5-30s block → user sees "treo" |
| 4 | MQTT publish chain → 31s block | **Medium** | 31s no response → user sees "treo" |
| 5 | MQTT connect timeout → 120s block | **Low** | Only during network issues |

---

## Khuyến nghị ưu tiên

1. **Fix BLE deinit semaphore** (HIGH): Tăng timeout 1s→3s, không xóa sem nếu timeout
2. **Giảm MQTT connect timeout** (MEDIUM): 120s→30s
3. **Monitor PC USB suspend behavior** (HIGH): Nếu user để PC sleep → device vào real sleep → đây là "treo" thường gặp nhất
4. **SD card timeout protection** (MEDIUM): Thêm watchdog feed trong SD operations
