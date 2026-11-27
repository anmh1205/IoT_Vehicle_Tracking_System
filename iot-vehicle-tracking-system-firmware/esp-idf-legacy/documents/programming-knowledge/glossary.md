# Firmware Glossary

Danh sách thuật ngữ ngắn gọn để đọc các tài liệu firmware thống nhất hơn. Ưu tiên định nghĩa bám vào cách project hiện tại đang dùng.

## Core terms
| Term | Meaning in this project | Notes |
|---|---|---|
| ESP32-S3 | MCU chính của board | Chạy firmware ESP-IDF |
| ESP-IDF | Framework runtime của ESP32-S3 | Source hiện tại bám vào ESP-IDF APIs |
| FSM / state machine | Vòng điều phối runtime | Được giữ trong `main/src/state_machine.c` |
| NVS | Non-volatile storage | Lưu config runtime và recovery state |
| RTC context | Bộ nhớ giữ qua deep sleep | Dùng cho boot count, OTA confirm, snapshot |
| OTA | Over-the-air update | Firmware dùng verify hash + boot partition switch |
| Deep sleep | Chế độ ngủ sâu | Wake bằng timer hoặc motion interrupt |
| EXT0 wake | Wakeup từ một GPIO RTC | Dùng cho IMU interrupt |
| MQTT | Kênh publish/subscribe | Dùng cho telemetry, command, OTA status |
| QoS 0 / QoS 1 | Mức đảm bảo giao hàng MQTT | QoS 0 cho telemetry dày, QoS 1 cho event/command |
| LTE | Kết nối di động | Điều khiển qua modem SIM7600CE |
| GNSS | Định vị vệ tinh | Query qua cùng modem SIM7600CE |
| AT command | Lệnh điều khiển modem qua UART | Transport riêng trong `modem_at.c` |
| PWR-KEY | Chân bật/tắt modem bằng pulse | Rất nhạy với thứ tự và timing |
| DTR | Chân low-power handshake cho modem | Hiện còn là mapping chưa chắc chắn |
| STATUS | Line trạng thái modem | Hữu ích cho diagnostics nếu map được |
| NET-LIGHT | Line báo trạng thái mạng | Hữu ích cho diagnostics nếu map được |
| IMU | Inertial measurement unit | Cảm biến rung/motion wake |
| LIS3DSH | Part cảm biến được code/docs nhắc đến | Cần phân biệt với LIS3DH |
| LIS3DH | Part tên gần giống, dễ bị nhầm | Đây là rủi ro tài liệu cần kiểm tra |
| OBD / OBD2 | Dữ liệu từ xe qua BLE adapter | Dùng cho RPM, speed, ignition heuristic |
| ELM327 | Kiểu adapter OBD phổ biến | Project OBD BLE flow đang bám style này |
| Power manager | Module điều khiển nguồn và modem power rail | Có charger, mux, modem control |
| Pin map | Nguồn truth cho GPIO mapping trong firmware | `main/inc/pin_map.h` |

## Status words
| Word | Meaning |
|---|---|
| confirmed | Đã có source evidence rõ |
| inferred | Suy ra từ source + netlist |
| unconfirmed | Chưa đủ evidence phần cứng |
| unsupported | Có phần cứng/chip support nhưng source chưa dùng |

## Reading labels used in docs
| Label | What it means |
|---|---|
| Project source | Có thể đối chiếu trực tiếp từ source hiện tại |
| Netlist inference | Suy ra từ netlist PCB |
| Official ESP-IDF docs | Dựa trên tài liệu Espressif chính thức |
| Vendor docs | Dựa trên tài liệu hãng linh kiện |
| Community experience | Kinh nghiệm triển khai chung, chưa phải bằng chứng dự án |

## Common flow names
| Flow | Short description |
|---|---|
| Boot flow | `app_main()` khởi tạo rồi vào FSM |
| Online flow | Modem online, publish telemetry, nhận command |
| Sleep flow | Snapshot context rồi tắt radio và vào deep sleep |
| Alarm flow | Motion wake hoặc bất thường, publish event dày hơn |
| Heartbeat flow | Wake định kỳ để báo tình trạng sống |

## Why this glossary matters
- Giảm nhầm lẫn giữa fact và suy luận.
- Giữ cho tài liệu phần cứng/modem/IMU dùng cùng một bộ từ.
- Giúp dev mới đọc nhanh hơn khi chuyển giữa các nhóm tài liệu.
