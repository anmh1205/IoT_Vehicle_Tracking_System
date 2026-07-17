Ngắn gọn: build/flash trên Windows dùng ESP-IDF gốc, không PlatformIO. Chạy trong `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware`: `idf.py set-target esp32s3`, `idf.py build`, rồi `idf.py -p COM5 flash monitor`; nếu native USB re-enumerate, tách bước `flash` và mở monitor lại sau khi cổng quay lại.

Điểm nên soi/sửa để giảm tác động USB sleep/re-enumeration: ưu tiên `components/app-core/src/state_sleep_controller.c`, `components/app-core/src/tracker-app-bootstrap.c`, `components/shared-kernel/src/app_config_defaults.c`, `main/Kconfig.projbuild`, và `sdkconfig.defaults`. Thực dụng nhất: thêm profile bench/debug để giữ awake hoặc fake-sleep khi cắm USB; tránh deep/light sleep trong lúc cần monitor. Hiện repo đã có `CONFIG_TRACKER_FAKE_SLEEP_ENABLED`, `TRACKER_FIELD_VALIDATION_MODE`, `TRACKER_FIELD_VALIDATION_KEEP_AWAKE`; nên tận dụng trước, không thêm cơ chế mới nếu chưa cần. USB log hiện là secondary USB Serial JTAG, nên PermissionError 31 nhiều khả năng do host giữ handle lúc board reset/re-enumerate, không hẳn firmware crash.

Test/review tối thiểu: 1) clean build, 2) flash COM5, 3) monitor 2 chu kỳ reset/sleep-wake, 4) xác nhận không panic/WDT, 5) review diff chỉ quanh sleep/boot/config, 6) bench test thêm với monitor đóng để tách lỗi host-vs-firmware.

Unresolved questions:
- Có cần giữ serial logging liên tục khi sleep, hay chấp nhận mất log lúc USB rớt?
- Muốn fix cho bench debug thôi, hay cho runtime production luôn?