# microSD SDMMC 4-bit Guide

## Mục tiêu
Tài liệu này tập trung vào đường microSD theo netlist và cách mount FATFS trên ESP32-S3 bằng SDMMC 4-bit theo ESP-IDF.

## Kết luận nhanh
- Netlist cho thấy `J4` là socket microSD wired theo bus `SDMMC`.
- Các net chính: `SD-DAT0`, `SD-DAT1`, `SD-DAT2`, `SD-DAT3`, `SD-CMD`, `SD-CLK`, `SD-CD`.
- Pull-up board-level có đủ trên `R26..R32` kéo lên `V-MCU`.
- Source firmware hiện tại **chưa có implementation storage app-level** cho microSD.
- Confidence: **High** cho phần cứng SDMMC 4-bit; **High** cho việc chưa có code path storage; **Medium** cho assumption hotplug.

## Pin / net mapping theo netlist
| Tín hiệu | Netlist evidence | Ghi chú | Confidence |
|---|---|---|---|
| DAT0 | `U6 pin 16 -> SD-DAT0`, `R30 10K -> V-MCU` | line data | High |
| DAT1 | `U6 pin 17 -> SD-DAT1`, `R31 10K -> V-MCU` | line data | High |
| DAT2 | `U6 pin 12 -> SD-DAT2`, `R26 10K -> V-MCU` | line data | High |
| DAT3 | `U6 pin 13 -> SD-DAT3`, `R27 10K -> V-MCU` | line data | High |
| CMD | `U6 pin 14 -> SD-CMD`, `R28 10K -> V-MCU` | command line | High |
| CLK | `U6 pin 15 -> SD-CLK`, `R29 10K -> V-MCU` | clock line | High |
| CD | `U6 pin 18 -> SD-CD`, `R32 10K -> V-MCU` | card detect | High |
| Socket | `J4 693071040911` | microSD connector | High |

## Đường khởi tạo khuyến nghị trong ESP-IDF
### Flow chuẩn
1. Khởi tạo `sdmmc_host_t` ở chế độ SDMMC.
2. Cấu hình `sdmmc_slot_config_t` cho 4-bit bus.
3. Gán chân theo board mapping thực tế.
4. Mount FATFS bằng `esp_vfs_fat_sdmmc_mount()`.
5. Kiểm tra `card` info và mở file thử nghiệm.
6. Khi dừng, unmount bằng `esp_vfs_fat_sdcard_unmount()`.

### Lưu ý khi dùng 4-bit
- 4-bit cần đủ `DAT0..DAT3` và `CMD/CLK`.
- Board đã có pull-up ngoài trên các line này, nên đừng giả định pull-up nội của MCU là đủ.
- `SD-CD` chỉ hữu ích nếu firmware có logic hotplug/reprobe.

## Đối chiếu source hiện tại
### Chưa thấy trong repo
- Không thấy module `sdmmc` hoặc `fatfs` trong `main/CMakeLists.txt`.
- Không thấy file source nào gọi `esp_vfs_fat_sdmmc_mount()`.
- Không thấy state machine nào đọc/ghi file log vào microSD.
- Không thấy handling cho `SD-CD` trong `power_mgr.c` hoặc `state_machine.c`.

### Kết luận thực tế
- microSD hardware đã hiện diện theo netlist.
- Firmware hiện tại chưa khai thác đường này.
- Nếu cần logging/telemetry offline, đây là đường storage hợp lý nhất để triển khai trước.

## Hotplug assumptions
- Do source hiện tại chưa có poll/reprobe, nên **giả định an toàn nhất là mount lúc boot** và coi thẻ như “present at startup”.
- Nếu muốn hotplug thật, cần thêm debounce + re-mount path + xử lý file handle đang mở.
- `SD-CD` có trên netlist, nhưng chưa đủ để khẳng định firmware hiện tại hỗ trợ rút/cắm nóng.

## Error handling nên có
- `ESP_ERR_TIMEOUT` khi thẻ không phản hồi.
- `ESP_FAIL` khi mount thất bại hoặc FATFS không khởi tạo được.
- `ESP_ERR_NOT_FOUND` hoặc trạng thái tương đương khi card detect báo rỗng.
- Không ghi log liên tục khi card bị rút; phải backoff để tránh spam lỗi.

## Nguồn tham khảo
- **project**: `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/netlist_parsed_summary.md`
- **project**: `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/hardware_pin_mapping.md`
- **project**: `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`
- **project**: `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- **project**: `iot-vehicle-tracking-system-firmware/main/src/power_mgr.c`
- **official**: [FAT Filesystem Support — ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/storage/fatfs.html)
- **official**: [SDMMC Host Driver — ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/sdmmc_host.html)
- **official**: [SD/SDIO/MMC Driver — ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/v5.1/esp32s3/api-reference/storage/sdmmc.html)
- **netlist**: `iot-vehicle-tracking-system-firmware/documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET`
