## Code Review Summary

### Scope
- Files: 
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/offline_queue.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/sd_log_store.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/data_formatter.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/data_formatter.h`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/offline_queue.h`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/sd_log_store.h`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/rtc_ds3231m.h`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/rtc_ds3231m.c`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`
- Focus: checklist theo yêu cầu (time authority, replay atomicity, SD fail-safe, backward compatibility parser, C bugs).

### Overall
- Hướng thay đổi tốt: đã thêm `timestamp_trusted`, đã có fallback RTC, đã có API atomic ACK+advance replay, parser log cũ tương thích.
- Tuy nhiên còn lỗi nghiêm trọng về an toàn dữ liệu khi GC fail và 1 lỗi thời gian do chuyển đổi timezone.

### Critical
1. **Mất toàn bộ queue log khi GC đổi file thất bại sau khi đã xóa file cũ**
   - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/sd_log_store.c:503-512`
   - Tác động: gọi `remove(SD_LOG_DATA_PATH)` trước, rồi `rename(tmp, data)` fail => hàm xóa luôn `tmp`; kết quả cả file cũ và file mới đều mất, mất dữ liệu offline queue.
   - Đề xuất fix ngắn: dùng quy trình 2-phase không xóa bản cũ trước khi có bản mới hợp lệ (vd: rename old->bak, rename tmp->data, fsync dir, xóa bak khi thành công), hoặc dùng `rename` atomic overwrite nếu FS hỗ trợ.

### High
1. **Đọc RTC bằng `mktime()` gây lệch timezone/DST (không đối xứng với `gmtime_r`)**
   - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/rtc_ds3231m.c:156-160`
   - Tác động: DS3231 thường lưu theo UTC; `rtc_ds3231m_set_time_ms()` ghi bằng UTC (`gmtime_r`) nhưng `rtc_ds3231m_get_time_ms()` đọc lại bằng local time (`mktime`) => timestamp trusted có thể lệch giờ, làm sai time authority/replay ordering theo thời gian thực.
   - Đề xuất fix ngắn: dùng chuyển đổi UTC nhất quán (timegm/_mkgmtime hoặc helper UTC epoch conversion tự thân), tránh `mktime` localtime.

### Medium
1. **Replay ACK path bỏ qua lỗi persist meta nhưng vẫn clear pending state**
   - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/offline_queue.c:250-255`
   - Tác động: nếu `sd_log_store_ack_critical_and_advance_replay()` fail, RAM state vẫn reset `pending_seq=0`; bản ghi có thể bị replay lại gây duplicate event QoS1 sau reboot/reconnect.
   - Đề xuất fix ngắn: chỉ clear `pending_seq` khi persist thành công; nếu fail thì giữ pending và retry/backoff.

2. **Nguy cơ race condition giữa callback ACK MQTT và replay tick**
   - File: 
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c:180-182`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/offline_queue.c:188-256`
   - Tác động: `offline_queue_handle_publish_ack()` có thể chạy khác task với `offline_queue_replay_tick()`, cùng sửa `s_ctx.pending_*` không lock => trạng thái pending/retry không nhất quán, dễ duplicate hoặc bỏ lỡ chuyển trạng thái.
   - Đề xuất fix ngắn: bảo vệ `s_ctx` bằng mutex/spinlock hoặc serialize mọi thao tác queue vào cùng một task/context.

3. **Coupling I2C: RTC và IMU cùng tạo master bus trên cùng port**
   - File:
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c:708-729`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c:95-118`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/rtc_ds3231m.c:76-103`
   - Tác động: khi bật IMU path, RTC init có thể fail do bus đã được tạo bởi module khác; fallback vẫn chạy nhưng silently mất RTC fallback.
   - Đề xuất fix ngắn: dùng shared I2C bus manager hoặc để RTC/IMU attach vào cùng bus handle thay vì mỗi module tự `i2c_new_master_bus`.

### Low
1. **Dùng hằng drain timeout cố định 3s thay cho session config runtime**
   - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c:51-52, 836-838`
   - Tác động: giảm linh hoạt tuning runtime theo session policy trước đó.
   - Đề xuất fix ngắn: nếu plan không yêu cầu hard-code, giữ config-driven timeout hoặc chú thích lý do hard constraint.

### Edge Cases Found by Scout
- Hot-remove khi CD pin không dùng: chỉ phát hiện qua lỗi I/O, không phát hiện trước thao tác.
- Parser compatibility đã xử lý đúng 8-field (legacy) và 9-field (new `time_trusted`).
- Pointer monotonicity nhìn chung đúng trong luồng chuẩn (`replay_seq` default=1 khi meta=0), nhưng chưa có guard nếu API bị gọi với replay_seq giảm.

### Positive Observations
- Đã thêm `sd_log_store_ack_critical_and_advance_replay()` giúp cập nhật ACK + replay pointer atomically trong một lần ghi meta.
- Đã thêm `timestamp_trusted` xuyên suốt formatter + enqueue + persisted record.
- Đã thêm mount retry/backoff và phân mức log từ error -> warning hợp lý cho trạng thái unavailable tạm thời.
- Parser log backward-compatible tốt cho dữ liệu cũ.

### Recommended Actions
1. Sửa ngay GC fail-safe để không thể mất cả file queue (Critical).
2. Sửa UTC conversion trong RTC read path (High).
3. Đồng bộ hóa concurrency cho offline queue (ACK callback vs replay tick).
4. Chỉ clear pending ACK khi persist meta thành công.
5. (Nếu bật lại IMU) chuẩn hóa shared I2C bus ownership.

### Unresolved Questions
- Kiến trúc runtime hiện tại có đảm bảo callback puback chạy cùng task với `state_machine_run` không?
- Có yêu cầu chính thức timestamp RTC phải là UTC tuyệt đối hay cho phép localtime?
- Có cần strict guard để reject `replay_seq` giảm (API misuse protection) không?
