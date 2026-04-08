# 1) Context links
- Research RTC: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260406-1612-firmware-sdcard-rtc-esp32-loop/research/researcher-02-rtc-ds3231m-integration.md`
- Code hiện tại: `.../main/src/state_machine.c`, `.../main/inc/pin_map.h`
- Docs chuẩn: `.../docs/system-architecture.md`, `.../docs/code-standards.md`

# 2) Overview
- Priority: P1
- Status: completed
- Mục tiêu: thêm tích hợp DS3231M tối thiểu (probe/read/set/validity), shared I2C an toàn, policy trusted time rõ.

# 3) Key Insights
- DS3231M chưa có driver thật trong code hiện trạng.
- RTC_DATA_ATTR hiện tại không thay thế RTC phần cứng.
- RTC và IMU dùng chung I2C, cần giới hạn retry/timeout để không ảnh hưởng loop.

# 4) Requirements
- Functional:
  - Có API tối thiểu: init/probe/get_time/set_time/get_health.
  - Có cờ `time_valid` để phân biệt timestamp trusted/untrusted.
  - Có policy boot sync: ưu tiên network time khi available và hợp lệ; RTC là fallback khi offline hoặc chưa có network time.
- Non-functional:
  - Không đưa timezone/business logic vào driver.
  - Không tích hợp alarm/wake trong release này.

# 5) Architecture
<!-- Updated: Validation Session 1 - network-first time authority, RTC fallback, alarm/wake deferred -->
- Tách vai trò:
  - Module RTC chỉ xử lý I2C + register + chuyển đổi thời gian.
  - `state_machine` quyết định nguồn giờ ở boot/runtime theo rule network-first.
- Shared I2C policy:
  - Transaction ngắn, timeout thấp, retry hữu hạn.
  - Lỗi RTC không làm dừng IMU/loop chính.
- Validity policy:
  - `valid=true`: timestamp authoritative theo nguồn giờ đã chọn (ưu tiên network khi online).
  - `valid=false`: dùng uptime + gắn cờ untrusted cho record.

# 6) Related Code Files
- Modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- Create (tối thiểu, nếu chưa có):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/rtc_ds3231m.h`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/rtc_ds3231m.c`
- Delete: none

# 7) Implementation Steps
1. Xác nhận pin I2C DS3231M dùng mapping hiện tại trong `pin_map.h`.
2. Thiết kế API tối thiểu của `rtc_ds3231m` với `esp_err_t` rõ ràng.
3. Thêm probe/init trong boot path, log health ngắn gọn.
4. Thêm logic đánh giá `time_valid` tại boot.
5. Thêm hook set_time khi có nguồn giờ tin cậy hơn (network/modem), cập nhật RTC.
6. Chuẩn hóa fallback khi RTC lỗi: continue runtime, không fail init toàn hệ thống.

# 8) Todo List
- [ ] Chốt danh sách API RTC tối thiểu.
- [ ] Chốt rule `time_valid` cho boot/runtime.
- [ ] Chốt luồng sync RTC từ network time.
- [ ] Chốt timeout/retry I2C dùng chung với IMU.

# 9) Success Criteria
- Boot có RTC: đọc giờ thành công, `time_valid=true` đúng điều kiện.
- Boot RTC lỗi/invalid: firmware vẫn chạy, `time_valid=false`.
- Ghi lại RTC sau khi sync nguồn giờ tin cậy thành công.
- Không xuất hiện deadlock/treo trên shared I2C.

# 10) Risk Assessment
- Rủi ro: bus contention I2C giữa IMU và RTC.
  - Giảm thiểu: retry hữu hạn, timeout ngắn, không polling dày.
- Rủi ro: sai giờ do nguồn giờ modem/network chưa ổn.
  - Giảm thiểu: chỉ set RTC khi nguồn giờ vượt ngưỡng tin cậy đã định.

# 11) Security Considerations
- Không tin cậy tuyệt đối dữ liệu thời gian khi `time_valid=false`.
- Tránh overflow/underflow khi parse BCD/time struct.
- Không cho command từ xa set time tùy ý nếu chưa qua xác thực command layer.

# 12) Next Steps
- Bàn giao `time_valid` + timestamp source contract cho Phase 03.
- Chốt test matrix power-cycle RTC và shared I2C stress.

## Unresolved questions
- Có cần periodic re-sync RTC hay chỉ sync lúc boot/reconnect là đủ?
