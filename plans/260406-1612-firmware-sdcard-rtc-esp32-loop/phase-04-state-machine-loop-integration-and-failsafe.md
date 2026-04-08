# 1) Context links
- Code chính: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- Queue/store: `.../main/src/offline_queue.c`, `.../main/src/sd_log_store.c`
- Rules loop: skill `esp32-loop-coding` và docs workflow nội bộ

# 2) Overview
- Priority: P2
- Status: completed
- Mục tiêu: gắn SD+RTC vào state machine/loop theo fail-safe, không ảnh hưởng luồng ignition/driving/sleep hiện hữu.

# 3) Key Insights
- `state_machine` đã có nhịp publish và replay tick rõ ràng.
- Điểm nhạy cảm là transition driving->parked/sleep và khi network dao động.
- Cần tránh thêm nhánh trạng thái mới không cần thiết.

# 4) Requirements
- Functional:
  - Boot init phải khởi tạo SD/RTC theo thứ tự an toàn, lỗi thì degrade chứ không fail toàn hệ.
  - Mỗi tick driving vẫn giữ replay/publish như cũ, nhưng nhận policy timestamp mới.
  - Trước sleep: dừng session + flush meta nếu khả dụng.
  - Khi SD/RTC lỗi kéo dài: vẫn duy trì telemetry online path tối thiểu.
- Non-functional:
  - Không phá timing loop hiện tại.
  - Log cảnh báo đủ chẩn đoán, không spam.

# 5) Architecture
- Integration tối giản theo điểm chạm:
  - Init: `offline_queue_init` + RTC init/probe.
  - Driving: enqueue/replay dùng timestamp policy đã chốt.
  - Sleep transition: gọi `offline_queue_stop_session(clean)` theo condition hiện có.
- Fail-safe mode:
  - SD down: cho phép publish trực tiếp online path qua queue interface best-effort.
  - RTC invalid: cho phép runtime tiếp tục với uptime timestamp.

# 6) Related Code Files
- Modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/offline_queue.c`
- Create: none
- Delete: none

# 7) Implementation Steps
<!-- Updated: Validation Session 1 - enforce drain timeout 3s on ignition OFF with pending critical ACK -->
1. Chèn hook init RTC ngay sau init phần cứng nền, không cản boot nếu lỗi.
2. Truyền trạng thái time-valid cho enqueue path (qua API hiện có hoặc mở rộng nhẹ).
3. Rà transition driving/parked để đảm bảo session stop luôn được gọi đúng thời điểm.
4. Cố định timeout drain = 3 giây khi ignition OFF còn pending critical ACK trước khi vào sleep.
5. Thêm điều kiện guard khi SD unavailable kéo dài để tránh retry quá dày.
6. Chuẩn hóa log tag/message cho SD/RTC failsafe để bench đọc nhanh.
7. Kiểm tra lại callback puback và replay tick hoạt động đúng khi reconnect dao động.

# 8) Todo List
- [ ] Chốt thứ tự init và fallback policy trong boot path.
- [ ] Chốt mapping trạng thái lỗi SD/RTC vào telemetry counter/log.
- [ ] Chốt hành vi khi ignition OFF trong lúc pending critical ack.
- [ ] Chốt giới hạn retry để bảo toàn CPU/power.

# 9) Success Criteria
- Boot trong cả 3 tình huống: SD+RTC OK, SD fail, RTC fail đều vào loop ổn định.
- Driving loop không bị block bởi retry SD/RTC.
- Transition về sleep vẫn ghi stop session tốt khi có SD và áp drain timeout 3 giây khi còn pending critical ACK.
- Reconnect network không làm sai luồng replay/ack.

# 10) Risk Assessment
- Rủi ro: race giữa transition state và pending ack critical.
  - Giảm thiểu: quy định rõ thứ tự stop-session và xử lý pending.
- Rủi ro: retry quá dày làm hao pin.
  - Giảm thiểu: backoff + cap retry, giảm log khi lặp lại.

# 11) Security Considerations
- Không cho lỗi RTC/SD làm bypass logic command/auth hiện có.
- Không để log nội bộ lộ payload nhạy cảm.
- Bảo đảm xử lý lỗi không dẫn tới undefined state machine transition.

# 12) Next Steps
- Chuyển sang Phase 05 để xác nhận bench, compile gates, release checklist.
- Chốt tiêu chí pass/fail để tester chạy lặp theo loop script.

## Unresolved questions
- Khi ignition OFF mà còn pending critical ack, có chờ tối đa bao lâu trước sleep?
- Cần metric riêng cho số lần fallback sang uptime timestamp không?
