# Flash Memory Usage Notes

## Mục tiêu
Ghi lại cách hiểu hiện tại về flash memory trên board này, tách rõ phần **board-level evidence**, **firmware hiện tại**, và **điểm chưa xác nhận**.

## Tóm tắt
- `U8 W25Q128` xuất hiện trên netlist như một chip flash nối trực tiếp với `U6 ESP32-S3`.
- Source firmware hiện tại **không có app-level storage path riêng** cho chip này.
- Vì vậy, mặc định nên xem đây là **flash nền tảng/boot flash** hơn là flash dữ liệu ứng dụng.
- Confidence: **High** cho bus flash tồn tại; **Medium** cho vai trò boot/main flash; **High** cho việc chưa có path ứng dụng.

## Phân loại claim
| Claim | Loại | Trạng thái | Confidence |
|---|---|---|---|
| `U8` tồn tại trên board | netlist | xác nhận | High |
| `U8` nối với ESP32-S3 qua bus `FL-*` | netlist | xác nhận | High |
| Firmware có module riêng cho storage flash | project | chưa thấy | High |
| `U8` dùng như boot/main flash | project + official + netlist | suy luận mạnh | Medium |
| Dữ liệu ứng dụng được ghi thẳng lên `U8` | project | chưa có bằng chứng | Low |

## Đối chiếu source hiện tại
### Có thể kiểm tra trực tiếp
- `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt` không có `sdmmc`, `fatfs`, hay module flash app-level riêng.
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c` không chứa logic quản lý storage.
- `iot-vehicle-tracking-system-firmware/main/src/power_mgr.c` và `modem_lte.c` không đụng tới flash data path.

### Hệ quả
- Nếu board đang boot được, flash này gần như chắc chắn đang tham gia luồng boot/runtime của ESP32-S3.
- Nhưng code hiện tại chưa cho thấy bất kỳ API read/write/erase nào dành cho dữ liệu người dùng.

## Ghi chú kỹ thuật
- ESP-IDF cho phép làm việc với flash qua API `esp_flash_*` cho flash chính và một số trường hợp flash phụ.
- Không nên nhầm `flash chip có trên schematic` với `storage app-level đã tích hợp trong firmware`.
- Nếu muốn ghi dữ liệu vận hành, nên tách rõ một trong ba hướng: `NVS`, `FATFS trên microSD`, hoặc `partition flash`.

## Điểm chưa chắc chắn
- `W25Q128` là main flash hay secondary flash không thể kết luận 100% chỉ từ đoạn netlist text; tuy nhiên bus `FL-*` và vị trí nối thẳng vào `U6` làm giả thiết **main/boot flash** có độ tin cậy cao.
- Không có bằng chứng về wear leveling, partition layout, hay mount flow trong source hiện tại.

## Nguồn tham khảo
- **project**: `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/netlist_parsed_summary.md`
- **project**: `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/hardware_firmware_crosscheck.md`
- **project**: `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`
- **project**: `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- **official**: [SPI Flash API - ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/spi_flash/index.html)
- **official**: [Optional Features for Flash - ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/v5.2/esp32s3/api-reference/peripherals/spi_flash/spi_flash_optional_feature.html)
- **community**: ESP-IDF examples and board bring-up notes are commonly used to confirm whether a flash chip is main flash or external data flash; current repo has no such board note attached.
- **netlist**: `iot-vehicle-tracking-system-firmware/documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET`
