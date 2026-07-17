# SIM7600 AT Command Architecture

## Mục tiêu
Mô tả cách project hiện tại tổ chức giao tiếp AT với SIM7600CE, từ transport UART đến lớp LTE/GNSS và cách command timeout / retry / recovery được xử lý.

## Kiến trúc lớp
```text
state_machine.c
  -> modem_lte.c / modem_gnss.c / power_mgr.c
      -> modem_at.c
          -> UART1 + ISR/driver của ESP-IDF
              -> SIM7600CE U9
```

## Lớp 1: AT transport
### `modem_at.c`
- Tạo UART driver trên `MODEM_UART_NUM = UART_NUM_1`
- Gắn pin `PIN_MODEM_TX` / `PIN_MODEM_RX`
- Dùng mutex để serialize transaction AT
- Flush input trước mỗi lệnh
- Đọc response theo vòng lặp cho tới khi gặp marker hoàn tất
- Dispatch URC bằng prefix callback

### Đặc tính quan trọng
| Thuộc tính | Hiện trạng | Ý nghĩa |
|---|---|---|
| Mutex | Có | Tránh chồng lệnh khi nhiều task dùng modem |
| Response done detection | Có | Dựa trên `OK`, `ERROR`, `+CME ERROR` |
| URC support | Có | Cho phép phản ứng với unsolicited modem lines |
| RX buffer | Cố định 1024 | Đủ cho flow hiện tại, nhưng cần benchmark nếu URC dày |
| Timeout | Theo từng call site | Tùy command class |

## Lớp 2: LTE profile management
### `modem_lte.c`
Tài liệu này tách LTE thành 4 phase:

#### Phase A — Hardware power up
- `modem_power_on()` qua PWR-KEY pulse
- rail settle
- DTR thấp nếu có map
- `modem_at_init()`

#### Phase B — Modem sanity / base config
- `AT`
- nếu fail thì một lần reset recovery nếu reset pin có map
- `ATE0`
- `AT+CPIN?`
- `AT+CNMP=2`
- `AT+CGDCONT=1,"IP","<APN>"`

#### Phase C — Network registration
- Poll `AT+CEREG?`
- Chấp nhận state home hoặc roaming (1, 5)
- Retry tối đa `MODEM_LTE_CEREG_MAX_RETRY = 20`
- Delay giữa retry `1000 ms`

#### Phase D — PDP activation
- `AT+CGACT=1,1`
- `AT+CGPADDR=1`
- Set connected flag

## Lớp 3: GNSS command flow
### `modem_gnss.c`
- `AT+CGNSPWR=1` bật GNSS engine
- `AT+CGNSINF` lấy snapshot GNSS
- Parse CSV payload
- Lưu cache sample cuối trong `s_last_gnss`

## Lớp 4: Power and sleep command flow
### `power_mgr.c`
- `modem_power_on()` và `modem_power_off()` đều là pulse PWR-KEY
- `modem_reset_pulse()` chỉ chạy nếu pin được map
- `modem_set_dtr(bool)` chỉ chạy nếu pin được map
- `modem_read_status()` / `modem_read_netlight()` cho diagnostics

## Bảng command hiện tại trong project
| Command | File | Mục đích | Classification | Confidence |
|---|---|---|---|---|
| `AT` | `modem_lte.c` | Probe modem sống | Vendor chắc chắn / common AT practice | High |
| `ATE0` | `modem_lte.c` | Tắt echo để parse sạch | Vendor chắc chắn / common AT practice | High |
| `AT+CPIN?` | `modem_lte.c` | Kiểm tra SIM ready | Vendor chắc chắn | High |
| `AT+CNMP=2` | `modem_lte.c` | Chọn auto network mode | Project inference, verify against SIMCom manual | Medium |
| `AT+CGDCONT=1,"IP",...` | `modem_lte.c` | Set APN | Vendor chắc chắn / common AT practice | High |
| `AT+CEREG?` | `modem_lte.c` | Poll registration | Vendor chắc chắn | High |
| `AT+CGACT=1,1` | `modem_lte.c` | Activate PDP context | Vendor chắc chắn | High |
| `AT+CGPADDR=1` | `modem_lte.c` | Query assigned IP | Vendor chắc chắn | High |
| `AT+CSQ` | `modem_lte.c` | Read RSSI | Vendor chắc chắn | High |
| `AT+CSCLK=1` | `modem_lte.c` | Enable sleep mode | Project inference; confirm on hardware | Medium |
| `AT+CGNSPWR=1/0` | `modem_gnss.c` | Power GNSS engine | Vendor-family behavior | High |
| `AT+CGNSINF` | `modem_gnss.c` | Read GNSS sample | Vendor-family behavior | High |

## Timeout / retry / recovery
### Current behavior
| Scenario | Timeout / retry | Recovery | Note |
|---|---|---|---|
| AT init probe fail | 5 s per send | One reset pulse attempt if pin exists | Good first-line recovery |
| `CEREG` poll fail | 20 retries x 1 s | Return `ESP_ERR_TIMEOUT` | No backoff jitter yet |
| PDP activate fail | 15 s | Return error | No APN fallback |
| GNSS query fail | 5 s | Return error | No stale-cache fallback beyond last sample |
| UART response timeout | call-site specific | Return `ESP_ERR_TIMEOUT` | Transport-level failure; caller decides |

### Recommended improvement targets
- Add one explicit modem recovery state in FSM
- Distinguish: `no_sim`, `sim_busy`, `no_network`, `pdp_fail`, `gnss_no_fix`, `uart_timeout`
- Introduce bounded retry/backoff for network attach and GNSS refresh
- Record last failure reason for diagnostics payload

## State machine integration points
### `state_machine.c`
- `state_machine_try_connect_network()` calls modem init, LTE connect, GNSS power on
- `APP_STATE_DRIVING` refreshes GNSS and publishes rawdata
- `APP_STATE_ALARM` may use network again after motion wake
- `state_machine_prepare_sleep()` powers GNSS off, disconnects LTE, and powers modem off

### Architectural implication
The modem layer is not autonomous. It is managed by the main FSM, which means:
- network recovery should not be hidden inside AT helpers alone
- state transitions should express modem lifecycle explicitly
- sleep/awake sequencing must stay synchronized with power rails

## Claim classification by layer
| Layer | Claim type | Confidence | How to verify on hardware |
|---|---|---|---|
| UART1 transport uses GPIO16/17 | Project inference | Medium | Compare logic analyzer traces with boot AT traffic |
| Response completion marker is enough for this modem | Project inference | Medium | Stress-test with long URCs and concatenated lines |
| `CEREG` retry policy is adequate | Community experience + project inference | Medium | Measure attach time across cells, SIM cards, and antenna conditions |
| `CSCLK` low power works with DTR high | Unconfirmed until bench | Low | Measure current draw and wake response after DTR toggle |

## Current project implementation cross-check
| Area | Current implementation | Comment |
|---|---|---|
| AT transport | Thread-safe basic transaction wrapper | Solid baseline, no streaming parser yet |
| LTE connect | Init + attach + PDP + IP query | Good linear flow, limited branch handling |
| GNSS | Power on + sample parser | Enough for telemetry, not enough for exhaustive GNSS diagnostics |
| Sleep coordination | FSM-driven power off | Good for battery saving, but recovery path is coarse |
| HW side-band pins | Some mapped, some `GPIO_NUM_NC` | Need board-variant validation |

## Hardware verification checklist
- [ ] Confirm actual AT UART pins with scope and boot echo
- [ ] Confirm `AT+CPIN?` response path after SIM insert/remove
- [ ] Measure `CEREG` attach time and failure states with poor signal
- [ ] Validate `AT+CSCLK=1` + DTR behavior against current draw
- [ ] Confirm GNSS powered query works only after `AT+CGNSPWR=1`
- [ ] Verify URC handling with at least one unsolicited line prefix

## Nguồn tham khảo
### Project files
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/modem_at.h`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_gnss.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/power_mgr.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c`

### Official / vendor references
- [SIM76XX Series AT Command Manual listing](https://en.simcom.com/technical_files.html)
- [SIM7600 family AT command manual listing](https://en.simcom.com/product/SIM7600NAG.html)
- [SIM7500/SIM7600 GNSS Application Note](https://en.simcom.com/product/SIM7600X-H-M2.html)
- [ESP-IDF UART documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/uart.html)
- [ESP-IDF Sleep Modes for ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/sleep_modes.html)