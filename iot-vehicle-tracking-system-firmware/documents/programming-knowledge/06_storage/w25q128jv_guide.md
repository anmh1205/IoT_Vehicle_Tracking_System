# W25Q128JV Guide

## Phạm vi
Tài liệu này ghi nhận vai trò của `U8 W25Q128JV` theo netlist hiện tại và đối chiếu với firmware ESP-IDF đang có.

## Kết luận nhanh
- `U8` nối trực tiếp vào `U6 ESP32-S3` qua các net `FL-CS`, `FL-DO`, `FL-WP`, `FL-DI`, `FL-CLK`, `FL-HD`, `FL-VDD`.
- Đây là bus flash mức board/SoC, không phải một feature storage ở tầng ứng dụng.
- Trong source firmware hiện tại **không thấy app-level path riêng** cho chip flash này.
- Suy luận mạnh nhất: `W25Q128JV` đang đóng vai trò **boot/main flash** cho ESP32-S3, hoặc ít nhất là flash nội bộ của nền tảng boot image.
- Confidence: **High** cho “có flash bus board-level”; **High** cho “không thấy app-level path”; **Medium** cho “đúng chính xác là boot flash” vì netlist text không ghi chú quy ước boot/main flash bằng nhãn riêng.

## Bằng chứng netlist
| Claim | Loại | Bằng chứng | Confidence |
|---|---|---|---|
| U8 là W25Q128 | netlist | `U8 W25Q128` | High |
| U8 nối vào ESP32-S3 bằng bus flash riêng | netlist | `FL-CS`, `FL-DO`, `FL-WP`, `FL-DI`, `FL-CLK`, `FL-HD`, `FL-VDD` | High |
| Đây không phải storage app-level | netlist + project | Không thấy module/app nào trong firmware gọi API flash ngoài chuẩn boot/runtime | High |
| Có thể là main boot flash của SoC | netlist + official + project | ESP32-S3 dùng flash bus riêng cho chương trình/ảnh boot; source không có đường riêng cho `U8` | Medium |

## Đối chiếu source hiện tại
### Hiện có
- `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt` không khai báo module storage riêng.
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c` chỉ xử lý state runtime, OTA, modem, MQTT, sensor.
- `iot-vehicle-tracking-system-firmware/main/src/power_mgr.c` chỉ quản lý power domain.
- `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c` chỉ có LTE/PDP/AT flow.

### Chưa thấy
- Không thấy `esp_flash_*` API được gọi từ app.
- Không thấy module đọc/ghi dữ liệu user lên `U8`.
- Không thấy partition hoặc filesystem trỏ riêng tới `U8` như một data store riêng.

## Ý nghĩa thực tế
- Nếu mục tiêu là log/telemetry, không nên coi `U8` là nơi ghi dữ liệu ứng dụng tùy ý trừ khi thiết kế partition rõ ràng.
- Nếu muốn dùng flash ngoài làm data store, cần xác nhận đây là flash chính hay flash phụ; hiện tại bằng chứng chỉ đủ để xem nó là flash bus nền tảng.

## Khuyến nghị
1. Giữ `U8` ở mức **boot/main flash assumption** cho tới khi có sơ đồ phân vùng hoặc bring-up log xác nhận khác.
2. Không mô tả `U8` như một storage app-level riêng nếu chưa có code path.
3. Nếu cần ghi dữ liệu, ưu tiên thiết kế rõ partition/FAT/NVS trước khi thêm API.

## Nguồn tham khảo
- **project**: `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/netlist_parsed_summary.md`
- **project**: `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/hardware_pin_mapping.md`
- **project**: `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`
- **project**: `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- **official**: [SPI Flash API - ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/spi_flash/index.html)
- **official**: [SPI Flash and External SPI RAM Configuration - ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/v5.5/esp32s3/api-guides/flash_psram_config.html)
- **netlist**: `iot-vehicle-tracking-system-firmware/documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET`
