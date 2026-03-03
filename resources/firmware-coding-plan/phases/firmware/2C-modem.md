# Sub-Phase 2C: LTE (A7670C) + GNSS (NEO-M8N)

> **Context:** target architecture planning only | **Scope:** docs/plan update | **Canonical path:** `iot-vehicle-tracking-firmware/`

## Summary

Sub-phase này mô tả kế hoạch refactor firmware từ mô hình **modem tích hợp GNSS** sang mô hình **hai module tách rời**:

- **SIMCom A7670C** cho LTE / PDP / PPP / MQTT transport
- **u-blox NEO-M8N** cho GNSS / NMEA / UBX

Đợt hiện tại chỉ cập nhật **kế hoạch**. Chưa sửa source firmware.

## Current Baseline Gap

Source hiện tại vẫn đang ở kiến trúc cũ:

- `iot-vehicle-tracking-system/Tracking_Firmware/main/src/modem_gnss.c` dùng `AT+CGNSPWR`, `AT+CGNSINF`
- `iot-vehicle-tracking-system/Tracking_Firmware/main/inc/pin_map.h` chưa có UART GNSS riêng
- `iot-vehicle-tracking-system/Tracking_Firmware/main/src/state_machine.c` còn coupling lifecycle LTE + GNSS

Mục tiêu của sub-phase này là định nghĩa rõ hướng refactor để chuyển sang kiến trúc A7670C + NEO-M8N.

## Tasks

| ID | Description | Target files |
|----|-------------|--------------|
| FW-030 | AT command engine cho modem LTE | `main/inc/modem_at.h`, `main/src/modem_at.c` |
| FW-031 | LTE control cho A7670C | `main/inc/modem_lte.h`, `main/src/modem_lte.c` |
| FW-032 | GNSS device + parser cho NEO-M8N | `main/inc/gnss_device.h`, `main/src/gnss_device.c`, `main/inc/gnss_parser.h`, `main/src/gnss_parser.c` |
| FW-033 | Tách state machine lifecycle giữa LTE và GNSS | `main/src/state_machine.c`, `main/inc/pin_map.h` |

---

## 1. AT Command Engine (`modem_at.c`)

| Item | Detail |
|------|--------|
| Scope | Chỉ phục vụ modem LTE A7670C |
| Transport | UART modem riêng |
| Pattern | Send command -> wait response -> parse OK/ERROR/URC |
| Serialization | Mutex / queue để chống concurrent access |
| Timeout | Configurable per command |

### API intent

```c
esp_err_t modem_at_init(void);
void      modem_at_deinit(void);
esp_err_t modem_at_send(const char *cmd, char *response, size_t resp_len, uint32_t timeout_ms);
esp_err_t modem_at_send_expect(const char *cmd, const char *expect, uint32_t timeout_ms);
```

### Important rule

- AT engine này **không** còn là nơi đọc vị trí GNSS target
- Không dùng flow `AT+CGNSPWR`, `AT+CGNSINF` như kiến trúc chuẩn mới
- Mọi GNSS data sẽ đi qua UART GNSS riêng

---

## 2. LTE Control (`modem_lte.c`)

### Responsibilities

- Power on / reset A7670C
- SIM readiness check
- Network registration (`CEREG` / `CREG`)
- PDP activation
- Sleep / wakeup / PSM orchestration
- Expose LTE connection state cho application layer

### State outline

| State | LTE sequence |
|-------|--------------|
| Init | `AT` -> `CPIN?` -> `CEREG?` -> `CSQ` |
| Connect | `CGDCONT` -> `CGACT=1` |
| Disconnect | `CGACT=0` |
| Sleep | `CSCLK`, `CFUN`, hoặc PSM policy |
| Power | `PWRKEY`, `RESET`, `EN` |

### API intent

```c
esp_err_t modem_lte_init(void);
esp_err_t modem_lte_connect(void);
esp_err_t modem_lte_disconnect(void);
esp_err_t modem_lte_sleep(void);
esp_err_t modem_lte_wakeup(void);
int       modem_lte_get_rssi(void);
bool      modem_lte_is_connected(void);
```

### Notes

- A7670C chỉ lo **cellular stack**
- MQTT có thể chạy qua AT MQTT hoặc qua PPP + `esp_modem` tùy quyết định implementation phase sau
- Lifecycle LTE phải độc lập với GNSS

---

## 3. GNSS Device (`gnss_device.c`) + Parser (`gnss_parser.c`)

### Responsibilities

#### `gnss_device.c`
- Quản lý UART GNSS riêng cho NEO-M8N
- Bật/tắt nguồn GNSS qua rail riêng
- Đọc stream NMEA hoặc gửi UBX config tối thiểu

#### `gnss_parser.c`
- Parse NMEA (`GGA`, `RMC`, `VTG` tối thiểu)
- Xuất `latitude`, `longitude`, `speed`, `course`, `satellites`, `fix_valid`
- Che giấu chi tiết parse khỏi state machine

### API intent

```c
typedef struct {
    double   latitude;
    double   longitude;
    float    speed_kmh;
    float    course_deg;
    uint8_t  satellites;
    uint64_t timestamp_ms;
    bool     fix_valid;
} gnss_data_t;

esp_err_t gnss_device_init(void);
esp_err_t gnss_device_power_on(void);
esp_err_t gnss_device_power_off(void);
esp_err_t gnss_device_read(gnss_data_t *data);
bool      gnss_device_has_fix(void);
```

### Accepted target inputs

- NMEA stream từ UART GNSS riêng
- Optional UBX config để:
  - đổi baud rate
  - giới hạn số sentence cần parse
  - tối ưu throughput

### Explicit non-goals

- Không đọc GNSS bằng `AT+CGNSINF`
- Không giữ abstraction kiểu modem_gnss tích hợp như baseline cũ

---

## 4. State Machine Decoupling (`state_machine.c`)

### Current problem

State machine baseline đang còn coupling:
- bật LTE thì bật luôn GNSS theo logic modem tích hợp
- tắt GNSS kéo theo assumption cùng vòng đời modem

### Target behavior

#### DRIVING
- BLE active
- LTE active
- GNSS active
- Publish telemetry định kỳ

#### PARKED
- BLE disconnect
- LTE sleep hoặc disconnect
- GNSS off hoặc policy-based wake only
- IMU interrupt + timer wakeup config

#### ALARM
- Wake LTE để gửi event
- Wake GNSS nếu cần lấy vị trí mới
- Không bắt buộc GNSS và LTE luôn gắn cứng cùng một call path

#### HEARTBEAT
- Wake LTE
- Wake GNSS nếu cần fresh fix
- Publish xong -> đưa từng module về low power theo policy

---

## 5. Pin Map Planning Impact (`pin_map.h`)

Sub-phase này yêu cầu pin map tách tín hiệu logic:

| Logical signal | Purpose |
|----------------|---------|
| `MODEM_UART_TX`, `MODEM_UART_RX` | UART cho A7670C |
| `MODEM_PWRKEY`, `MODEM_RESET`, `MODEM_EN` | Điều khiển modem |
| `GNSS_UART_TX`, `GNSS_UART_RX` | UART cho NEO-M8N |
| `GNSS_EN` | Nguồn GNSS |
| `GNSS_PPS` | PPS optional |

> Số GPIO cụ thể sẽ được chốt ở đợt refactor code/PCB. Plan này ưu tiên tách **logical ownership** trước.

---

## 6. Verification (for implementation phase later)

- [ ] `idf.py build` compile sạch sau khi refactor
- [ ] A7670C: `AT` / SIM / network / PDP hoạt động ổn định
- [ ] GNSS UART riêng nhận được NMEA từ NEO-M8N
- [ ] Parser xuất đúng `lat/lon/speed/course/satellites`
- [ ] Không còn phụ thuộc `AT+CGNSPWR`, `AT+CGNSINF` trong flow target
- [ ] State machine có thể bật/tắt LTE và GNSS độc lập theo state
- [ ] Docs/path active đều dùng `iot-vehicle-tracking-firmware/`

---

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Refactor lớn hơn dự kiến do baseline coupling cao | Tách thành 2 bước: interface split -> state integration |
| Parser NMEA sinh edge cases | Bắt đầu với tập câu tối thiểu và validation chặt |
| Power policy không nhất quán giữa LTE/GNSS | Giao ownership rõ cho power manager |
| Team nhìn docs tưởng code đã refactor xong | Luôn giữ mục `Current Baseline Gap` |

---

## 8. Conclusion

Sub-phase 2C đã được chuẩn hóa lại để phản ánh đúng hướng phát triển firmware:

- **không còn mô tả A7600CE-T là target hiện tại**
- **không còn coi GNSS là tính năng của modem LTE**
- **tách rõ modem task và GNSS task** trong kế hoạch refactor tiếp theo
