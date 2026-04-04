# Phase 01 - SD storage layout and mount lifecycle

## Context links
- Research: `./research/researcher-01-report.md`, `./research/researcher-02-report.md`
- Hardware: `iot-vehicle-tracking-system-firmware/documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET`, `.../iot-vehicle-tracking-system-main.pdf`
- Code touchpoints: `main/inc/pin_map.h`, `main/CMakeLists.txt`, `main/main.c`

## Overview
- Priority: P1
- Status: pending
- Goal: chốt nền tảng SDMMC 4-bit + FATFS mount lifecycle + card detect fail-safe.

## Key Insights
- SDMMC 4-bit cần pull-up CMD + DAT0..DAT3; docs không yêu cầu CLK pull-up bắt buộc.
- Netlist có `R29 10K` kéo `SD-CLK` lên `V-MCU`; khác khuyến nghị thường gặp, cần verify lab.
- `CONFIG_FATFS_IMMEDIATE_FSYNC` tăng durability nhưng không biến FATFS thành power-cut-proof tuyệt đối.

## Requirements
- Functional:
  - Mount SD khi card present + init pass.
  - Unmount sạch khi card remove/error.
  - Expose API append-record sync-safe (fsync mỗi record).
- Non-functional:
  - Không block loop quá lâu.
  - Recovery determinism sau reboot.

## Architecture
- Folder/file trên SD (KISS):
  - `/sdcard/tracker/meta/queue.meta` (ack pointer, head/tail file index)
  - `/sdcard/tracker/logs/session-YYYYMMDD-HHMMSS.log` (append-only NDJSON)
  - `/sdcard/tracker/logs/session-...-idx.log` (offset map nhẹ, optional nếu cần)
- Mount state:
  - `UNMOUNTED -> PROBING -> MOUNTED -> DEGRADED -> UNMOUNTED`
- Card-detect:
  - debounce software, chỉ cho write khi `MOUNTED`.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
  - `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`
  - `iot-vehicle-tracking-system-firmware/main/main.c`
- Create:
  - `iot-vehicle-tracking-system-firmware/main/inc/sd_log_store.h`
  - `iot-vehicle-tracking-system-firmware/main/src/sd_log_store.c`
- Delete: none.

## Implementation Steps
1. Khai báo pin SDMMC 4-bit + CD/WP trong `pin_map.h` theo wiring thực tế.
2. Bổ sung deps `fatfs`, `sdmmc`, `vfs` trong `CMakeLists.txt`.
3. Thiết kế `sd_log_store` API: `init/mount/unmount/append/read/compact/get_stats`.
4. Bật `IMMEDIATE_FSYNC`; viết append path fsync từng record.
5. Thêm xử lý hot-remove: dừng ghi, close file, unmount, set fault flag.
6. Định nghĩa startup probe trong `main.c`: init SD trước khi state machine run.
7. Viết checklist test phần cứng cho risk R29 SD-CLK.

## Todo List
- [ ] Chốt mapping GPIO SDMMC + card detect từ schematic/PDF.
- [ ] Chốt cấu trúc thư mục/file tối giản.
- [ ] Chốt mount/unmount state transitions.
- [ ] Chốt policy lỗi I/O (retry, cooldown, disable tạm).

## Success Criteria
- Mount/unmount ổn định qua 100 chu kỳ insert/remove test bench.
- Append + fsync thành công với record size thiết kế.
- Card remove giữa phiên không crash, không deadlock.

## Risk Assessment
- R29 kéo SD-CLK lên có thể ảnh hưởng timing/signal integrity ở tần số cao.
- CD pin nếu floating -> false detect, churn mount/unmount.
- Fsync mỗi record tăng wear + latency.
- Mitigation: hạ clock ban đầu, soak test, logging timing stats, debounce CD.

## Security Considerations
- Không lưu secret/token vào SD logs.
- Chỉ lưu telemetry cần thiết; tránh PII dư thừa.
- Chuẩn bị hook để thêm record encryption nếu phase security yêu cầu.

## Next Steps
- Khi P01 xong, chuyển sang queue/replay semantics ở P02.

## Unresolved questions
- GPIO cụ thể cho SD-CLK/CMD/DAT0..3/CD/WP đã map chính thức chưa?
- Có cần chạy SD ở 1-bit fallback mode tạm để debug board rev đầu?
- Ngưỡng clock SDMMC mục tiêu ban đầu là bao nhiêu MHz để an toàn với R29?
