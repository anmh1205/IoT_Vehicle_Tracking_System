## Code Review Summary

### Scope
- Files:
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/modem_at.h`
- Focus: recent firmware changes
- Scout findings: reviewed dependent AT transport path and URC/data-flow edge behavior around RDY gate and recovery transitions

### Overall Assessment
Đúng hướng so với mục tiêu (RDY gate, anti-storm cooldown/backoff, CPIN soft retry, log theo nhịp). Tuy nhiên còn rủi ro hồi quy ở luồng URC parsing và một số cạnh tranh truy cập UART config.

### Critical Issues
- Không có lỗi mức Critical (security/data-loss/breaking ngay) trong phạm vi diff.

### High Priority
1. **High — RDY có thể bị bỏ lỡ khi URC bị chia chunk (false timeout ở WAIT_RDY)**
   - File:line:
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_at.c:499-506`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_at.c:255-262`
   - Vấn đề: parse URC theo từng chunk bằng `strtok_r` không có buffer tích lũy liên-chunk. Nếu `RDY\r\n` bị split (`"R"` rồi `"DY\r\n"`) thì callback `RDY` không chạy.
   - Tác động: `WAIT_RDY` timeout giả, rơi vào backoff/retry loop dù modem thực tế đã boot.
   - Khuyến nghị: thêm line-assembly buffer tĩnh/ring-buffer cho AT transport; chỉ dispatch khi gặp delimiter đầy đủ `\r\n`.

### High Priority
2. **High — Guard recover phụ thuộc RDY token TTL ngắn có thể chặn recover phần lớn lỗi late-stage**
   - File:line:
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_lte.c:126-128`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_lte.c:151-159`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_lte.c:600-616`
   - Vấn đề: recover hardware chỉ cho phép khi RDY token còn hạn 20s. Các timeout ở CPIN/CEREG thường xảy ra sau mốc này nên recover bị skip, chỉ còn backoff.
   - Tác động: tăng MTTR, có thể kéo dài mất kết nối trong môi trường sóng yếu/SIM chập chờn.
   - Khuyến nghị: nới policy (ví dụ chỉ gate recover trong startup window, hoặc cho phép recover sau N lần timeout liên tiếp dù token hết hạn).

### Medium Priority
1. **Medium — `modem_at_reset_uart_diag()` có thể giữ lại lỗi cũ trong queue sau khi “reset”**
   - File:line:
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_at.c:447-450`
   - Vấn đề: đang `memset(0)` rồi mới `drain queue`; event cũ đang nằm trong queue lại được cộng vào ngay sau reset.
   - Tác động: số liệu chẩn đoán nhiễu, khó phân tích đúng theo từng probe.
   - Khuyến nghị: drain trước rồi reset, hoặc reset + purge queue rõ nghĩa.

2. **Medium — API đổi UART config không khóa chung với AT transaction**
   - File:line:
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_at.c:298-313`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_at.c:320-332`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_at.c:343-358`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_at.c:364-393`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_at.c:409-432`
   - Vấn đề: các hàm set UART không lấy `s_at_lock`, có thể đổi cấu hình giữa lúc task khác đang `modem_at_send/poll`.
   - Tác động: khó tái hiện, có thể gây timeout/partial response ngẫu nhiên.
   - Khuyến nghị: serialize toàn bộ set/get nhạy cảm qua cùng mutex hoặc đảm bảo chỉ gọi từ một context duy nhất.

### Low Priority
- Không có vấn đề style nhỏ đáng kể cần ưu tiên lúc này.

### Edge Cases Found by Scout
- URC split qua nhiều lần `uart_read_bytes` làm mất token RDY.
- Poll URC trả `ESP_ERR_TIMEOUT` khi lock bận và caller bỏ qua; nếu có task khác gửi AT xen kẽ trong WAIT_RDY thì khả năng bỏ lỡ cửa sổ RDY tăng.
- Fixed-size URC callback slots (`MODEM_MAX_URC_CALLBACKS=4`) không báo lỗi khi đầy, có thể drop đăng ký về sau.

### Positive Observations
- RDY gate được tách state rõ (`WAIT_RDY`), dễ theo dõi FSM.
- Có anti-storm rõ ràng: cooldown recover + backoff exponential.
- CPIN soft retry trước recover đã đúng mục tiêu giảm reset cứng không cần thiết.
- Logging đã có throttle theo interval, tránh spam liên tục.

### Recommended Actions
1. Sửa parser URC theo line-buffer liên-chunk (ưu tiên cao nhất).
2. Điều chỉnh policy RDY-token/recover để không chặn recover quá mức ở late-stage.
3. Sửa thứ tự reset UART diag (drain rồi reset).
4. Đồng bộ hóa các API set UART với transaction lock.

### Metrics
- Type Coverage: N/A (C firmware)
- Test Coverage: N/A trong phiên review này
- Linting Issues: chưa chạy lint/build trong phiên review này

### Unresolved Questions
- Chủ đích thiết kế có muốn **cấm hoàn toàn** hardware recover khi RDY token hết hạn, kể cả sau CPIN/CEREG timeout không?
- Có luồng/task nào khác ngoài `modem_lte_tick` đang gọi `modem_at_send()` song song trong runtime thực tế không?
- Modem mục tiêu có đảm bảo luôn phát `RDY` sau mỗi boot/recover trong mọi profile nguồn/sleep hiện dùng không?