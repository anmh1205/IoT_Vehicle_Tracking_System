# SDMMC ESP32-S3 Pitfalls

## Phạm vi
Các lỗi hay gặp khi bring-up microSD SDMMC 4-bit trên ESP32-S3, ưu tiên theo board này.

## Pitfalls chính
| Pitfall | Vì sao đáng chú ý | Dấu hiệu | Mức tin cậy |
|---|---|---|---|
| Nhầm flash bus với storage app-level | `U8 W25Q128` là flash bus riêng, không phải microSD | Không thấy API ứng dụng nào đụng tới flash/mount | High |
| Quên pull-up ngoài trên `CMD/DAT` | SDMMC rất nhạy với line idle | Mount fail ngẫu nhiên hoặc card init timeout | High |
| Đặt pin map sai | Netlist có tên net, source chưa có GPIO mapping cho SDMMC | Thẻ không respond dù hardware có mặt | High |
| Giả định hotplug khi chưa có logic re-mount | Source hiện tại không có event handler cho `SD-CD` | Cắm/rút thẻ gây lỗi file handle hoặc mount state treo | High |
| Không xử lý card absent | Có `SD-CD` nhưng chưa thấy code | Boot chậm, log spam, fail không rõ nguyên nhân | High |
| Bỏ qua unmount sạch | FATFS cần flush và close | Mất dữ liệu sau reset/power drop | High |
| Dùng 1-bit thay vì 4-bit mà quên bus width | Board đã route đủ 4 data lines | Throughput thấp hoặc init không khớp cấu hình | Medium |
| Hiểu nhầm `SD-CD` là đủ cho hotplug | CD chỉ là tín hiệu; cần software debounce | Rút/cắm nhanh tạo false positives | Medium |

## Checklist thiết kế an toàn
1. Xác nhận `DAT0..DAT3`, `CMD`, `CLK`, `CD` theo netlist.
2. Dùng external pull-up hiện có trên `R26..R32` làm baseline.
3. Mount bằng `esp_vfs_fat_sdmmc_mount()` khi boot.
4. Đóng file trước khi unmount.
5. Nếu hỗ trợ hotplug, thêm debounce và trạng thái mount rõ ràng.
6. Log lỗi có backoff, không retry dồn dập.

## Đối chiếu source hiện tại
- `main/CMakeLists.txt` chưa khai báo storage module.
- `main/src/state_machine.c` chưa có branch đọc/ghi file.
- `main/src/power_mgr.c` chưa dùng `SD-CD`.
- `main/src/modem_lte.c` chỉ lo network path, không liên quan storage.

## Kết luận áp dụng cho board này
- Board **đã sẵn phần cứng** cho SDMMC 4-bit.
- Firmware **chưa sẵn luồng mount/ghi file**.
- Nếu bring-up thất bại, ưu tiên kiểm tra pull-up, pin mux, và mount sequence trước khi đổ lỗi card.

## Nguồn tham khảo
- **project**: `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/netlist_parsed_summary.md`
- **project**: `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/unresolved_hardware_questions.md`
- **project**: `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`
- **project**: `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- **official**: [FAT Filesystem Support — ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/storage/fatfs.html)
- **official**: [SDMMC Host Driver — ESP32-S3](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/sdmmc_host.html)
- **community**: ESP-IDF SD card bring-up patterns commonly require board-specific GPIO confirmation and explicit mount/unmount handling; this repo currently has no dedicated storage bring-up log.
- **netlist**: `iot-vehicle-tracking-system-firmware/documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET`
