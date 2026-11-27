# SIM7600 Power and Boot Sequence

## Mục tiêu
Mô tả chuỗi bật/tắt nguồn SIM7600CE, các tín hiệu điều khiển trên board, và cách firmware hiện tại phối hợp modem với power manager và state machine.

## Board-level power picture
### Tín hiệu liên quan
| Signal | Firmware pin | Netlist evidence | Vai trò | Confidence |
|---|---|---|---|---|
| `PIN_MODEM_PWRKEY` | GPIO 26 | U9 pin 3 `PWR-KEY`, driver `Q5` | Bật/tắt modem bằng pulse | High |
| `PIN_MODEM_RESET` | `GPIO_NUM_NC` | U9 pin 4 `RESET`, driver `Q4` | Reset cứng modem | Hardware present, firmware unassigned |
| `PIN_MODEM_DTR` | `GPIO_NUM_NC` | U9 pin 72 `SIM-DTR`, driver stage `Q1` | Sleep/wake handshake | Hardware present, firmware unassigned |
| `PIN_MODEM_STATUS` | `GPIO_NUM_NC` | U9 pin 49 `STATUS` | Trạng thái modem | Hardware present, firmware unassigned |
| `PIN_MODEM_NETLIGHT` | `GPIO_NUM_NC` | U9 pin 51 `NET-LIGHT` | LED / activity indicator | Hardware present, firmware unassigned |

## Boot sequence hiện tại trong project
### 1) Board power init
`power_mgr_init()` cấu hình GPIO output/input, rồi đưa system về trạng thái an toàn:
- chọn backup power path
- tắt charger
- kéo `PWR-KEY` xuống mức 0
- nếu có reset pin thì giữ reset ở 1
- nếu có DTR pin thì giữ ở 0

### 2) Modem power on
`modem_power_on()` gọi pulse trên `PIN_MODEM_PWRKEY`.

### 3) Rail settle
`modem_lte_init()` chờ `MODEM_LTE_POWER_RAIL_SETTLE_MS = 250 ms` trước AT probe.

### 4) Optional wake alignment
Nếu DTR có map, firmware kéo DTR low trong init để modem ở active mode.

### 5) AT transport init
`modem_at_init()` cài UART driver và flush pending bytes.

### 6) Sanity check
Firmware gửi `AT` rồi `ATE0`, `AT+CPIN?`, `AT+CNMP=2`, APN, registration, PDP.

## Boot sequence đề xuất dưới dạng state
```text
POWER_SAFE -> PWRKEY_PULSE -> RAIL_SETTLE -> AT_INIT -> AT_PROBE
-> SIM_READY -> MODE_CONFIG -> REGISTRATION_POLL -> PDP_ACTIVATE -> ONLINE
```

## Ý nghĩa từng signal
### PWR-KEY
- Dùng để đánh thức modem từ trạng thái off/sleep.
- Trong code hiện tại, cả `modem_power_on()` và `modem_power_off()` đều dùng cùng một pulse helper.
- Điều này phù hợp với một số module modem khi pulse PWR-KEY là cơ chế toggle power.

### RESET
- Board có dấu hiệu route reset, nhưng firmware hiện chưa map.
- Nếu reset được dùng, nó nên là recovery path sau khi AT probe fail.

### DTR
- DTR thường dùng để handshake low-power / sleep with modem.
- Project hiện đang hạ DTR khi khởi động và kéo DTR high trước sleep.
- Tuy nhiên, vì pin đang `GPIO_NUM_NC`, hành vi này chỉ là best-effort khi có hardware mapping.

### STATUS / NET-LIGHT
- Đây là hai đường cực hữu ích cho diagnostics.
- `STATUS` xác nhận modem đã lên nguồn hay chưa.
- `NET-LIGHT` cho biết modem activity / network registration.
- Project hiện chỉ đọc nếu board variant có map sau này.

## Timeout / retry / recovery
| Bước | Timeout / delay | Retry / recovery | Classification |
|---|---|---|---|
| PWR-KEY pulse | 1000 ms | Không retry trong helper | Community experience / project inference |
| Rail settle | 250 ms | Chỉ chờ cố định | Project inference |
| DTR settle | 50 ms | Không retry | Project inference |
| AT probe | 5000 ms | Nếu fail và có reset map thì pulse reset 1 lần | Project inference |
| CEREG poll | 20 x 1000 ms | Return timeout nếu không attach | Project inference |
| PDP activate | 15000 ms | No auto retry | Project inference |
| GNSS power on/off | 5000 ms | No auto retry | Project inference |

## Recovery strategy theo tầng
### Tầng 1: soft retry
Phù hợp cho:
- `AT` timeout
- `AT+CPIN?` chưa sẵn sàng
- `CEREG` chưa attach

### Tầng 2: hard recovery
Phù hợp cho:
- modem treo
- AT parse lỗi kéo dài
- attach thất bại lặp lại

Nếu reset pin được xác nhận trên hardware thật, recovery nên theo thứ tự:
1. DTR inactive / safe
2. pulse reset
3. chờ rail settle
4. AT probe lại
5. nếu fail tiếp, power cycle bằng PWR-KEY

### Tầng 3: full power cycle
Phù hợp cho:
- modem không lên nguồn
- `STATUS` low mãi
- không có response sau reset

## State machine integration
### `state_machine.c`
- `state_machine_try_connect_network()` chỉ gọi LTE connect và GNSS power on khi ở online path
- `state_machine_prepare_sleep()` tắt GNSS, disconnect LTE, rồi power off modem trước deep sleep
- `APP_STATE_DRIVING` giữ modem online để publish rawdata / command handling
- `APP_STATE_SLEEP` luôn là path sâu nhất và không nên để modem còn active

## Điểm cần cẩn thận
| Điểm | Rủi ro | Cách test xác minh trên hardware thật |
|---|---|---|
| Dùng cùng một pulse helper cho on/off | Có thể module không toggle như mong muốn | Scope PWR-KEY khi bật và tắt, xem modem state thay đổi đúng không |
| Reset pin chưa map | Recovery bị thiếu | Continuity test và thử hard reset bằng jumper nếu an toàn |
| DTR pin chưa map | Sleep current không giảm như kỳ vọng | Đo current khi set DTR state khác nhau |
| `STATUS` / `NET-LIGHT` chưa dùng | Mất kênh debug phần cứng | Đo line trong 3 trạng thái: off, booting, registered |

## Đối chiếu implementation hiện tại của project
| Area | Current implementation | Assessment |
|---|---|---|
| Power init | Có | Tốt, đủ an toàn lúc boot |
| PWR-KEY control | Có | Tốt, cần bench verify pulse width |
| Reset control | Có helper nhưng pin NC | Chưa khai thác hardware route hiện có |
| DTR control | Có helper nhưng pin NC | Chưa xác nhận board variant |
| Status readback | Có helper nhưng pin NC | Chưa có telemetry diagnostics dùng line này |
| Sleep sequencing | Có trong FSM | Hợp lý, nhưng cần test current draw |

## Đề xuất test hardware
- [ ] Đo PWR-KEY pulse width và polarity
- [ ] Đo current khi modem off / on / attached / GNSS on
- [ ] Xác nhận modem có re-attach sau power cycle nhanh không
- [ ] Kiểm tra DTR có thực sự giảm current hoặc chỉ là no-op
- [ ] Nếu reset route tồn tại, test hard reset và compare với full power cycle
- [ ] Ghi log `STATUS` / `NET-LIGHT` theo từng phase boot

## Nguồn tham khảo
### Project files
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/power_mgr.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c`

### Netlist evidence
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET`

### Official / vendor references
- [SIM7600CE product page](https://cn.simcom.com/product/SIM7600CE.html)
- [SIM7600CE technical files](https://cn.simcom.com/technical_files-p1.html?filetype=0&pro_cat=4&pro_li=69&time=0)
- [SIM76XX Series AT Command Manual listing](https://en.simcom.com/technical_files.html)
- [ESP-IDF Sleep Modes for ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/sleep_modes.html)