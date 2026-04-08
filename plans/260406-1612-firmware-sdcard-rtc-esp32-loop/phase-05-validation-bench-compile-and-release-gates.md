# 1) Context links
- Skill loop: `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/`
- Code under test: `.../main/src/state_machine.c`, `.../main/src/offline_queue.c`, `.../main/src/sd_log_store.c`
- Plan tổng: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260406-1612-firmware-sdcard-rtc-esp32-loop/plan.md`

# 2) Overview
- Priority: P1
- Status: completed
- Mục tiêu: chốt test bench thực dụng + compile/release gates để tránh regression SD/RTC.

# 3) Key Insights
- Rủi ro chính nằm ở runtime thật: card insert/remove, power cycle, reconnect mạng.
- Chỉ build pass là chưa đủ; phải có log monitor xác nhận behavior fail-safe.
- Môi trường Windows cần chạy ESP-IDF qua PowerShell/CMD, không Git Bash cho `idf.py`.

# 4) Requirements
- Functional:
  - Có test matrix cho SD mount, RTC validity, replay ack, sleep transition.
  - Có log chuẩn lưu ở `documents/test-logs/com{N}-monitor-latest.log`.
  - Có gate build/flash/monitor lặp tối thiểu 1 vòng sau mỗi nhóm thay đổi lớn.
- Non-functional:
  - Checklist rõ pass/fail để dev junior tự chạy được.
  - Không dùng mock để “qua gate”.

# 5) Architecture
- Validation stack 3 lớp:
  - Lớp 1: compile gate (`idf.py build`) trên Windows shell chuẩn.
  - Lớp 2: flash + monitor ổn định (serial_reader/log_analyzer).
  - Lớp 3: bench scenario (network drop, SD hot-remove, power-cycle).
- Release gate chỉ pass khi cả 3 lớp pass.

# 6) Related Code Files
- Modify (khi cần test hooks/log):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/offline_queue.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/sd_log_store.c`
- Create (artifact test):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/documents/test-logs/com{N}-monitor-latest.log`
- Delete: none

# 7) Implementation Steps
1. Chốt COM selection flow theo skill (auto detect, hỏi user nếu nhiều cổng).
2. Chạy compile gate bằng PowerShell/CMD với ESP-IDF export script.
3. Flash firmware và monitor serial có điều kiện dừng ổn định/lỗi nghiêm trọng.
4. Chạy test scenario:
   - SD cắm sẵn từ boot.
   - Rút/gắn SD khi driving.
   - Mất mạng rồi có lại để replay.
   - Reboot/power-cycle giữa pending replay.
5. Phân tích log bằng `log_analyzer.py`, ghi kết luận pass/fail từng case.
6. Chốt release gate: fail nếu còn panic, reset loop bất thường, replay pointer sai.

# 8) Todo List
- [ ] Tạo test matrix chi tiết theo từng scenario.
- [ ] Chuẩn hóa lệnh build/flash/monitor cho Windows.
- [ ] Định nghĩa ngưỡng ổn định monitor (stable-seconds/quiet-seconds).
- [ ] Chốt template báo cáo test cho mỗi vòng lặp.

# 9) Success Criteria
- `idf.py build` pass ổn định sau thay đổi SD/RTC.
- Monitor không có panic/reset bất thường trong cửa sổ ổn định.
- Replay/ack đạt kỳ vọng trong test mất mạng và reboot.
- Có log test đầy đủ để truy vết khi lỗi phát sinh sau release.

# 10) Risk Assessment
- Rủi ro: test bench không lặp lại được do thao tác tay khác nhau.
  - Giảm thiểu: checklist thao tác từng bước + thông số monitor cố định.
- Rủi ro: bỏ sót lỗi hiếm trong reconnect dài.
  - Giảm thiểu: chạy soak test tối thiểu 1 phiên dài trước release.

# 11) Security Considerations
- Không ghi token/credential vào test log serial.
- Log artifacts phải nằm đúng thư mục project, không rải ở root.
- Chỉ flash firmware đã build từ source hiện tại, không dùng binary không rõ nguồn.

# 12) Next Steps
- Khi pass gate: bàn giao checklist release + notes vận hành cho team implementation.
- Nếu fail gate: rollback về phase liên quan, sửa kế hoạch mục tiêu trước khi code tiếp.

## Unresolved questions
- Thời lượng soak test tối thiểu trước release nội bộ là bao lâu?
- Có cần gate riêng cho đo wear SD (ước tính fsync/write cycle) ở vòng này không?
