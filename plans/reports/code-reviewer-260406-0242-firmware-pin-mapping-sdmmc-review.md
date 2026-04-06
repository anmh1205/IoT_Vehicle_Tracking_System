## Code Review Summary

### Scope
- Files:
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/sdkconfig`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/sdkconfig.defaults`
- LOC changed: 16 (2+7+7)
- Focus: recent (pin mapping + SDMMC config)
- Scout findings: phụ thuộc chính là `power_mgr.c`, `state_machine.c`, `sd_log_store.c`, `offline_queue.c`; có rủi ro giả định phần cứng (modem control line và card-detect polarity)

### Overall Assessment
Thay đổi có ý nghĩa chức năng rõ ràng (bật map SDMMC thật + thêm modem reset pin), nhưng hiện có rủi ro hồi quy phần cứng mức cao vì mapping modem mới mâu thuẫn với tài liệu mapping hiện có và chưa có bằng chứng xác thực board variant trong code/config.

### Critical Issues
- Không phát hiện lỗ hổng bảo mật trực tiếp trong scope này.

### High Priority
1. **[High] Modem PWRKEY đổi từ GPIO26 -> GPIO34 có nguy cơ sai map board**
   - Bằng chứng:
     - Mã đổi tại `pin_map.h`.
     - Tài liệu mapping hiện tại vẫn ghi `PIN_MODEM_PWRKEY GPIO_NUM_26` (high confidence).
   - Tác động: modem có thể không boot/tắt đúng chu kỳ, kéo theo mất LTE/GNSS path.
   - Khuyến nghị: xác nhận lại netlist/board revision trước khi merge; nếu có board variant thì tách config theo variant thay vì hardcode global.

2. **[High] Modem RESET đổi từ NC -> GPIO35 làm firmware bắt đầu actively drive chân reset**
   - Bằng chứng:
     - `power_mgr_init()` sẽ set mức reset mặc định.
     - `modem_reset_pulse()` giờ có thể tác động thật lên phần cứng.
   - Tác động: nếu map sai hoặc cực tính driver khác giả định, modem có thể bị giữ reset/intermittent reboot.
   - Khuyến nghị: xác thực polarity thực tế tại transistor stage; test boot + attach mạng + reset pulse end-to-end trên phần cứng thật.

### Medium Priority
1. **[Medium] Card-detect đã được map GPIO13 nhưng cấu hình polarity chưa được áp dụng trong code mount path**
   - Bằng chứng: có `CONFIG_TRACKER_SDMMC_CD_ACTIVE_LOW` trong Kconfig, nhưng `sd_log_store.c` chỉ set `slot->cd`, không dùng flag/polarity tương ứng.
   - Tác động: có thể mount fail sai điều kiện “card present” trên board có active level ngược.
   - Khuyến nghị: áp dụng rõ ràng cấu hình active-low/active-high theo API SDMMC hiện tại của ESP-IDF.

2. **[Medium] Giả định bus SDMMC 4-bit luôn sẵn sàng**
   - Bằng chứng: cấu hình set đủ D0..D3 + bus_width=4 ở cả `sdkconfig` và `sdkconfig.defaults`.
   - Tác động: board spin chỉ nối 1-bit hoặc nhiễu line phụ có thể gây mount không ổn định.
   - Khuyến nghị: có fallback 1-bit khi mount lỗi, hoặc profile cấu hình theo board revision.

### Low Priority
- Không thấy xung đột phần mềm trực tiếp (trong `main/`) với các GPIO SDMMC mới 7/8/9/10/11/12/13.

### Edge Cases Found by Scout
- Thay đổi pin modem ảnh hưởng dây chuyền: `power_mgr_init()` -> `modem_power_on/off()` -> `state_machine_prepare_sleep()`.
- SD mount fail không làm crash (đã degrade mềm qua retry trong `offline_queue`), nhưng có thể âm thầm mất tính năng lưu/replay nếu CD polarity hoặc wiring không đúng.

### Positive Observations
- `sdkconfig` và `sdkconfig.defaults` được cập nhật đồng nhất.
- Đường lỗi SD mount đã có xử lý không sập hệ thống (retry path tồn tại).

### Recommended Actions
1. Chặn merge cho tới khi xác thực phần cứng cho GPIO34/35 (PWRKEY/RESET) trên board thực tế hoặc netlist revision đúng.
2. Bổ sung test matrix ngắn: modem power cycle + reset pulse + network attach.
3. Hoàn thiện xử lý `CONFIG_TRACKER_SDMMC_CD_ACTIVE_LOW` trong `sd_log_store.c`.
4. Cân nhắc fallback SDMMC 1-bit khi 4-bit mount lỗi để giảm regression trên board variant.

### Metrics
- Type Coverage: N/A (C firmware scope)
- Test Coverage: N/A trong review này (chưa chạy test hardware/integration)
- Linting Issues: N/A trong review này

### Unresolved Questions
- Board revision hiện tại có xác nhận chính thức rằng SIM7600 PWRKEY/RESET đi vào GPIO34/35 không?
- Card-detect line trên J4 active-low hay active-high theo schematic cuối cùng?
- Có cần hỗ trợ nhiều board variant (mapping theo Kconfig) thay vì 1 `pin_map.h` hardcode?
