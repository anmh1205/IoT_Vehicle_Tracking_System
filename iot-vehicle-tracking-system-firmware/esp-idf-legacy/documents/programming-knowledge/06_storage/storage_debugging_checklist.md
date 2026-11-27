# Storage Debugging Checklist

## Mục tiêu
Checklist này giúp debug nhanh hai nhánh storage của board: `W25Q128JV` và microSD `SDMMC 4-bit`.

## Phân luồng debug
### A. W25Q128JV / flash bus
- [ ] Xác nhận board boot bình thường từ flash hiện tại.
- [ ] Xác nhận `U8 W25Q128` nối trên `FL-*` theo netlist.
- [ ] Kiểm tra source có bất kỳ `esp_flash_*` app-level path nào không.
- [ ] Nếu cần dùng flash cho dữ liệu, xác nhận partition/OTA không bị chồng lấn.
- [ ] Ghi rõ: hiện chưa thấy storage app-level path riêng; confidence cao.

### B. microSD / SDMMC 4-bit
- [ ] Xác nhận `J4` hiện diện và đúng chân `SD-DAT0..3`, `SD-CMD`, `SD-CLK`, `SD-CD`.
- [ ] Kiểm tra pull-up `R26..R32` lên `V-MCU`.
- [ ] Xác nhận firmware có cấu hình 4-bit bus width.
- [ ] Mount thử bằng `esp_vfs_fat_sdmmc_mount()`.
- [ ] Mở/ghi/đóng file test.
- [ ] Unmount sạch trước khi reset hoặc tháo thẻ.

## Dấu hiệu lỗi và hướng xử lý
| Dấu hiệu | Khả năng cao | Hướng xử lý |
|---|---|---|
| Mount timeout | Pull-up/pin map/cấp nguồn | Rà netlist, kiểm tra `R26..R32`, kiểm tra slot config |
| Card init fail | Bus width hoặc clock | Hạ clock, thử 1-bit để cô lập lỗi, rồi quay lại 4-bit |
| Read/write lỗi ngẫu nhiên | Signal integrity / hotplug | Giảm tốc, kiểm tra tiếp xúc socket, tránh rút nóng |
| File system corrupt | Unmount thiếu sạch | Close file, sync, unmount đúng trình tự |
| Không thấy card detect | `SD-CD` chưa được dùng trong code | Xác minh logic level và debounce |
| Boot vẫn ổn nhưng app không thấy storage | Chưa có code path | Đây là tình trạng hiện tại của repo; cần bổ sung module storage |

## Trình tự kiểm tra khuyến nghị
1. Đọc netlist để xác nhận đường vật lý.
2. Đọc `main/CMakeLists.txt` để xác nhận component đã link chưa.
3. Đọc `state_machine.c` để xác nhận có flow mount/umount không.
4. Kiểm tra `pin_map.h` nếu có pin mapping app-level mới.
5. Chạy test boot/mount trên board thật.
6. Chỉ sau đó mới thêm logic hotplug hoặc logging dài hạn.

## Đối chiếu source hiện tại
- `main/CMakeLists.txt`: chưa có `sdmmc`/`fatfs` component.
- `main/src/state_machine.c`: chưa có storage lifecycle.
- `main/src/power_mgr.c`: chưa consume `SD-CD`.
- `main/src/modem_lte.c`: không liên quan storage.

## Đánh giá tin cậy
- `W25Q128JV` là flash bus nền tảng: **Medium**.
- `W25Q128JV` có app-level path riêng: **Low**.
- microSD `SDMMC 4-bit` là phần cứng có thật: **High**.
- firmware đã có mount/FS flow: **Low**.
- hotplug được hỗ trợ: **Low to Medium**.

## Nguồn tham khảo
- **project**: `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/netlist_parsed_summary.md`
- **project**: `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/hardware_firmware_crosscheck.md`
- **project**: `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`
- **project**: `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- **project**: `iot-vehicle-tracking-system-firmware/main/src/power_mgr.c`
- **official**: [FAT Filesystem Support — ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/storage/fatfs.html)
- **official**: [SDMMC Host Driver — ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/sdmmc_host.html)
- **official**: [SPI Flash API - ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/spi_flash/index.html)
- **netlist**: `iot-vehicle-tracking-system-firmware/documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET`
