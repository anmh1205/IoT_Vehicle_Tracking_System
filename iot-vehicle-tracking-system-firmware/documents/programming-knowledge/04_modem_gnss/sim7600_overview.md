# SIM7600 / SIM7600CE Overview

## Mục tiêu
Tài liệu này tổng hợp cách modem SIM7600CE được tích hợp vào firmware hiện tại của dự án, cùng cách đọc đúng giữa **vendor fact**, **community experience**, **project inference**, và **chưa xác nhận**.

## Phạm vi
- U9 SIM7600CE trên netlist PCB
- AT command transport qua `modem_at.c`
- LTE flow qua `modem_lte.c`
- GNSS flow qua `modem_gnss.c`
- Power / reset / sleep coordination qua `power_mgr.c`
- Runtime orchestration qua `state_machine.c`
- Pin mapping liên quan trong `pin_map.h`

## Kết luận nhanh
- **SIM7600 vs SIM7600CE**: về lớp AT command, project hiện đang dùng chung một mô hình điều khiển modem SIM76xx; về lớp hardware integration, board này thể hiện rõ một biến thể **SIM7600CE** với các đường `PWR-KEY`, `RESET`, `STATUS`, `NET-LIGHT`, `SIM-DTR`, UART và power-control rời.
- **Độ tin cậy cao nhất**: `PWR-KEY`, UART modem, GNSS query flow, sleep/wake orchestration.
- **Độ tin cậy thấp hơn**: exact MCU GPIO behind every modem side-band line (`RESET`, `STATUS`, `NET-LIGHT`, `SIM-DTR`).

## Phân loại claim
| Loại claim | Ý nghĩa | Khi dùng |
|---|---|---|
| Vendor chắc chắn | Có thể đối chiếu trực tiếp từ tài liệu SIMCom / Espressif chính thức | Pin behavior, AT command family, ESP-IDF APIs |
| Community experience | Được nhiều hệ thống modem tương tự dùng, nhưng không phải bằng chứng chính thức từ project | Kinh nghiệm về pulse width, retry, low power |
| Project inference | Suy ra từ source và netlist của dự án | Flow state machine, timeout, retry, mapping nội bộ |
| Chưa xác nhận | Có dấu hiệu nhưng chưa có bench test / schematic trace đủ mạnh | Exact MCU GPIO, polarity thực tế, optional pin use |

## U9 modem integration snapshot
| Signal / function | Netlist evidence | Firmware evidence | Classification | Confidence | Hardware verification |
|---|---|---|---|---|---|
| `PWR-KEY` | U9 pin 3, discrete driver `Q5` | `PIN_MODEM_PWRKEY GPIO_NUM_26`, `modem_power_on()/off()` | Project inference + netlist aligned | High | Scope line during boot pulse; verify active level and pulse width |
| `RESET` | U9 pin 4, driver stage `Q4` | `PIN_MODEM_RESET GPIO_NUM_NC` | Unconfirmed board feature | Medium hardware / low firmware | Continuity test from U9 RESET to MCU pad; pulse it and check modem reboot |
| `STATUS` | U9 pin 49 | `PIN_MODEM_STATUS GPIO_NUM_NC` | Unconfirmed board feature | Medium hardware / low firmware | Power modem on/off, measure line state changes |
| `NET-LIGHT` | U9 pin 51, pull network via `R54` | `PIN_MODEM_NETLIGHT GPIO_NUM_NC` | Unconfirmed board feature | Medium hardware / low firmware | Observe during no-service vs registered state |
| `SIM-DTR` | U9 pin 72 via `Q1` / `R45` / `R47` | `PIN_MODEM_DTR GPIO_NUM_NC` | Unconfirmed board feature | Medium hardware / low firmware | Check if MCU can really drive the line or only buffer logic exists |
| UART AT path | `SIM-RX` / `SIM-TX` through `Q2` / `Q3` | `MODEM_UART_NUM = UART_NUM_1`, `PIN_MODEM_TX`, `PIN_MODEM_RX` | Project inference + board evidence | Medium | Sniff boot traffic and verify AT echo on chosen UART pins |

## SIM7600 vs SIM7600CE
### Giống nhau
- Cùng họ SIM76xx, nên phần lớn AT flow trong project có thể đi theo cùng một logic base: power up, echo off, SIM ready, registration, PDP, GNSS, sleep.
- Các lệnh đang dùng trong firmware map đúng kiểu modem cellular/GNSS thông dụng:
  - `AT`
  - `ATE0`
  - `AT+CPIN?`
  - `AT+CNMP=2`
  - `AT+CGDCONT=1,"IP",...`
  - `AT+CEREG?`
  - `AT+CGACT=1,1`
  - `AT+CGPADDR=1`
  - `AT+CSQ`
  - `AT+CSCLK=1`
  - `AT+CGNSPWR=1/0`
  - `AT+CGNSINF`

### Khác nhau
- **SIM7600CE** là một biến thể/định danh cụ thể trong board hiện tại; dự án không chứng minh rằng mọi SIM7600 variant đều có cùng band plan, regulatory profile, hay option pin mapping.
- Khác biệt thường nằm ở:
  - band / RF region
  - package / PCB integration
  - optional control pins và routing
  - antenna design / GNSS RF path
  - power sequencing and sleep wiring
- Vì vậy, **command set family** có thể rất gần nhau, nhưng **hardware integration** không nên giả định giống 100%.

### Confidence
| Khẳng định | Confidence | Lý do |
|---|---|---|
| SIM7600CE thuộc họ SIM76xx dùng chung mô hình AT cơ bản | High | Phù hợp với project source và official family docs |
| Mọi command đều identical trên mọi SKU | Medium/Low | Cần xác nhận trong AT manual bản đúng SKU |
| Các control pins trên board này đều hoạt động giống nhau ở mọi board SIM7600 | Low | Phụ thuộc schematic, transistor stage, pull-up/down |

## Firmware hiện tại đang làm gì
### AT transport
`modem_at.c` tạo một UART transport thread-safe, có mutex, timeout, flush input trước khi gửi lệnh, và dispatch URC theo prefix.

### LTE flow
`modem_lte.c`:
1. bật modem bằng `modem_power_on()`
2. chờ rail settle
3. hạ DTR nếu có
4. init AT transport
5. probe `AT`
6. `ATE0`
7. đợi `AT+CPIN?` trả `+CPIN: READY`
8. set network mode `AT+CNMP=2`
9. set PDP APN qua `AT+CGDCONT`
10. đăng ký mạng bằng `AT+CEREG?`
11. activate PDP bằng `AT+CGACT=1,1`
12. query IP bằng `AT+CGPADDR=1`

### GNSS flow
`modem_gnss.c` bật `AT+CGNSPWR=1`, sau đó query `AT+CGNSINF` và parse payload thành tọa độ, tốc độ, course, satellites, timestamp.

### Power / sleep flow
`power_mgr.c` giữ modem control lines ở trạng thái an toàn lúc boot và cung cấp helper cho power key, reset pulse, DTR, status/netlight readback.

### State machine flow
`state_machine.c` bật LTE/GNSS trong trạng thái online và tắt theo hướng tiết kiệm điện trước deep sleep.

## Điểm cần test trên hardware thật
| Điểm mơ hồ | Cách test xác minh |
|---|---|
| `PIN_MODEM_TX` / `PIN_MODEM_RX` có đúng là UART AT thật hay không | Gắn logic analyzer / USB-UART monitor và nhìn `AT` echo khi boot |
| `RESET` có thực sự nối về ESP32 GPIO hay chỉ là pad chưa dùng | Continuity test từ U9 RESET đến MCU pad / testpoint |
| `STATUS` và `NET-LIGHT` có active-high hay active-low | Đo line khi modem power on/off, registered/unregistered |
| `SIM-DTR` có hỗ trợ sleep handshake thật | Drive line low/high và đo current draw + modem awake/sleep response |
| GNSS có tách anten / path RF ổn định không | Đo time-to-first-fix, fix stability, and satellite count in open sky |

## Đối chiếu implementation hiện tại của project
| Area | Current implementation | Gap / note |
|---|---|---|
| AT transport | Có mutex, timeout, URC dispatch | Chưa thấy retry layer riêng theo command class |
| LTE bring-up | Có init/connect/disconnect/sleep/wakeup | Chưa tách rõ error taxonomy cho từng failure mode |
| GNSS | Có power on/off và sample parser | Chưa có explicit warm-start/cold-start policy |
| Power pins | PWR-KEY có, RESET/DTR/STATUS/NETLIGHT để NC | Có khả năng board support nhiều hơn firmware đang dùng |
| State machine | Có network connect trước publish | Chưa có modem recovery state riêng khi mất AT link |

## Đề xuất tài liệu / test cần bổ sung
- Bench note cho modem pin polarity và pulse width
- UART sniff log khi modem boot
- GNSS TTFF benchmark trong open sky / urban canyon
- Failure matrix cho AT timeout / SIM not ready / registration timeout / PDP fail / GNSS no-fix
- Board variant note cho SIM7600CE vs các SIM7600 SKU khác

## Nguồn tham khảo
### Project files
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_gnss.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/power_mgr.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET`

### Official / vendor references
- [SIM7600CE product page](https://cn.simcom.com/product/SIM7600CE.html)
- [SIM7600CE technical files](https://cn.simcom.com/technical_files-p1.html?filetype=0&pro_cat=4&pro_li=69&time=0)
- [SIM76XX Series AT Command Manual listing](https://en.simcom.com/technical_files.html)
- [SIM7600 family AT command manual listing](https://en.simcom.com/product/SIM7600NAG.html)
- [SIM7500/SIM7600 GNSS Application Note](https://en.simcom.com/product/SIM7600X-H-M2.html)
- [SIM7600X-PCIE product page with GNSS note](https://www.simcom.com/product/SIM7600X-PCIE.html)
- [ESP-IDF UART documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/uart.html)
- [ESP-IDF Sleep Modes for ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/sleep_modes.html)