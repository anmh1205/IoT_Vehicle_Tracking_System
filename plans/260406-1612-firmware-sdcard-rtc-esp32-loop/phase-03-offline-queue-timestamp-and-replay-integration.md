# 1) Context links
- Research SD: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260406-1612-firmware-sdcard-rtc-esp32-loop/research/researcher-01-sd-card-sdmmc-strategy.md`
- Research RTC: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260406-1612-firmware-sdcard-rtc-esp32-loop/research/researcher-02-rtc-ds3231m-integration.md`
- Code: `.../main/src/offline_queue.c`, `.../main/src/sd_log_store.c`

# 2) Overview
- Priority: P1
- Status: completed
- Mục tiêu: đồng bộ timestamp RTC vào record/session, giữ replay FIFO fail-safe, không duplicate ack critical.

# 3) Key Insights
- Replay hiện dựa vào `replay_seq` + scan file, đủ dùng nếu pointer không lùi.
- Critical record đã có cơ chế QoS1 ack; rawdata nên tiếp tục best-effort.
- Timestamp hiện dùng uptime, cần bổ sung trusted/untrusted marker từ RTC policy.

# 4) Requirements
- Functional:
  - Record phải lưu timestamp nhất quán theo policy `trusted/untrusted`.
  - Cờ trusted/untrusted phải tồn tại cả nội bộ queue/log và payload MQTT để quan sát end-to-end.
  - `replay_seq` là nguồn sự thật duy nhất cho tiến trình replay.
  - ACK critical phải cập nhật atomically: `ack_seq_critical` và `replay_seq`.
  - Khi parse lỗi line log: skip an toàn, không reset pointer lùi.
- Non-functional:
  - Không đổi cấu trúc queue phức tạp, giữ scan tuần tự.
  - Không thêm storage engine mới.

# 5) Architecture
<!-- Updated: Validation Session 1 - trust flag must be internal + MQTT -->
- Timestamp contract:
  - Tại enqueue: lấy thời gian từ RTC nếu valid, ngược lại uptime fallback.
  - Gắn cờ trust cả trong metadata nội bộ và trong payload MQTT để downstream biết chất lượng thời gian.
- Replay contract:
  - QoS0: publish xong thì tăng `replay_seq` ngay.
  - QoS1 critical: chờ puback rồi mới tăng `ack_seq_critical` + `replay_seq`.
- Error contract:
  - Bản ghi hỏng: bỏ qua và tiếp tục scan.
  - Mount fail: replay tạm dừng, loop chính vẫn chạy.

# 6) Related Code Files
- Modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/offline_queue.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/sd_log_store.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- Create: none (ưu tiên tận dụng cấu trúc queue/store hiện có)
- Delete: none

# 7) Implementation Steps
1. Chốt schema record cho timestamp + trust flag (không phá backward compatibility nếu có log cũ).
2. Cập nhật enqueue path để lấy thời gian theo policy từ Phase 02.
3. Siết logic `offline_queue_handle_publish_ack()` để bảo toàn tiến pointer critical.
4. Siết `sd_log_store_peek_next()` và parse lỗi line theo chiến lược skip-safe.
5. Rà soát `offline_queue_depth()` với trường hợp pointer/meta lệch.
6. Bổ sung telemetry counters cần thiết cho replay success/retry/skip-corrupt.

# 8) Todo List
- [ ] Chốt representation trusted/untrusted timestamp.
- [ ] Chốt semantics puback cho critical-only.
- [ ] Chốt behavior khi gặp line corrupt liên tiếp.
- [ ] Cập nhật checklist replay FIFO sau reboot.

# 9) Success Criteria
- Record mới có timestamp đúng policy trusted/untrusted.
- Reconnect sau mất mạng replay đúng thứ tự, không duplicate critical ack.
- Reboot giữa chừng không làm lùi `replay_seq`.
- Line log hỏng không làm crash hoặc kẹt replay.

# 10) Risk Assessment
- Rủi ro: thay đổi record format gây không đọc được log cũ.
  - Giảm thiểu: parser tolerant, hỗ trợ định dạng cũ trong giai đoạn chuyển tiếp.
- Rủi ro: pointer update không đồng bộ khi mất điện.
  - Giảm thiểu: thứ tự flush rõ, cập nhật meta ngay sau mốc quan trọng.

# 11) Security Considerations
- Không chèn payload chưa kiểm soát vào format log gây phá parser.
- Giới hạn chiều dài payload để tránh overflow.
- Dữ liệu timestamp untrusted phải được phân biệt rõ để tránh quyết định sai.

# 12) Next Steps
- Chuyển contract replay/timestamp vào loop logic ở Phase 04.
- Chuẩn bị test case fault-injection: mất mạng, power cut, parse lỗi.

## Unresolved questions
- Có cần migrate log cũ sang schema mới không, hay chỉ hỗ trợ đọc tương thích?
