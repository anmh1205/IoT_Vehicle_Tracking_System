# Scout Report

## Relevant Files
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c` — điều phối luồng chính: init, driving/parked/alarm/heartbeat/sleep, deep sleep wake source.
- `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c` — LTE init/connect/disconnect/sleep/wakeup, AT sequence (`AT+CPIN?`, `AT+CNMP=2`, `AT+CGDCONT`, `AT+CGACT`, `AT+CSCLK`).
- `iot-vehicle-tracking-system-firmware/main/src/modem_gnss.c` — bật/tắt GNSS và parse `+CGNSINF`.
- `iot-vehicle-tracking-system-firmware/main/src/power_mgr.c` — power mux, charger, low-voltage latch, modem `PWRKEY`/`RESET`/`DTR` control.
- `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h` — mapping chân ESP32-S3 (modem, IMU, power).
- `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c` + `main/inc/imu_lis3dsh.h` — driver IMU hiện tại (LIS3DSH), config interrupt motion.
- `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt` — xác nhận compile unit hiện tại dùng `imu_lis3dsh.c`.
- `iot-vehicle-tracking-system-firmware/hardware-specs/index/hardware-specs-index.md` — index trust-level tài liệu hardware.
- `iot-vehicle-tracking-system-firmware/hardware-specs/components/**` — bộ datasheet/TRM/AT manual nền.

## Key Findings For Planning
1. Driver IMU hiện hành là **LIS3DSH**, không còn `imu_lis3dh.*`; cần tài liệu giải thích rõ khác biệt LIS3DH vs LIS3DSH để tránh nhầm register/interrupt model.
2. Luồng sleep/wake phụ thuộc `esp_sleep_enable_ext0_wakeup(PIN_LIS3DSH_INT, 1)` và timer heartbeat, cần chương riêng về wake source reliability.
3. Modem power flow đang dùng pulse `PWRKEY`; `RESET`, `DTR`, `STATUS`, `NETLIGHT` đều có khả năng `GPIO_NUM_NC` tùy board mapping; cần section hardware-variant caveat.
4. LTE init sequence có retry + reset recovery; cần chuẩn hóa thành “AT state machine pattern” trong tài liệu.
5. GNSS phụ thuộc `AT+CGNSPWR` và parse `+CGNSINF`; cần đối chiếu field semantics theo manual phiên bản modem.
6. Thư mục đích `hardware-specs/programming/` hiện **chưa tồn tại**; kế hoạch phải bao gồm taxonomy file khoa học trước khi viết nội dung.

## Unknowns / Risks Requiring External Research
- LIS3DSH interrupt register semantics thực tế (threshold/duration/filter) so với code hiện tại có khớp khuyến nghị vendor không.
- SIM7600/SIM7600CE AT behavior theo firmware revision (timing, sleep/wakeup edge cases) có khác giữa module variants.
- Best-practice community cho UART timeout/backoff/parser resilience tương thích với vendor constraints đến mức nào.
- Brownout/EMI/noise thực địa ảnh hưởng modem + GNSS + deep sleep wake trong kiến trúc hiện tại.

## Unresolved Questions
- Board production hiện dùng đúng IMU part number nào cho toàn bộ lô (LIS3DSH-only hay mixed variants)?
- Modem firmware target version đang dùng ngoài thực địa là gì (để map đúng AT quirks)?
- Có yêu cầu tài liệu theo audience-level (new hire vs maintainer) hay một bộ unified?
