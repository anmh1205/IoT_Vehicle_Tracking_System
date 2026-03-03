## Code Review Summary

### Scope
- Files:
  - E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system\Tracking_Firmware\main\src\ble_mgr.c
  - E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system\Tracking_Firmware\main\src\ble_obd.c
  - E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system\Tracking_Firmware\main\src\mqtt_client.c
  - E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system\Tracking_Firmware\main\src\command_handler.c
  - E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system\Tracking_Firmware\main\inc\command_handler.h
  - E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system\Tracking_Firmware\main\src\ble_init.c
- Focus: latest fixes only
- Scout findings: Không có kết quả scout riêng cho firmware; review trực tiếp trên file.

### Overall Assessment
Chất lượng nhìn chung ổn, nhưng còn vài rủi ro về đồng bộ/điều kiện đua và giả định GATT/chuỗi cấu hình có thể gây lỗi khi triển khai thực tế.

### Critical Issues
- None found.

### High Priority
- None found.

### Medium Priority
1) [MEDIUM] Cạnh tranh dữ liệu giữa callback BLE và API không khóa đầy đủ
   - File: E:\...\main\src\ble_mgr.c:343-415, 489-549, 556-569
   - Lý do: callback GAP chạy async truy cập/mutate `mgr_ctx` trong khi API khác (send/disconnect/connect) có thể chạy ở task khác; `ble_mgr_disconnect` không khóa.
   - Rủi ro: trạng thái kết nối/conn_handle bị cập nhật lệch dẫn tới gửi nhầm handle hoặc trạng thái “connected” sai.

2) [MEDIUM] Giả định CCCD nằm ở `val_handle + 1`
   - File: E:\...\main\src\ble_mgr.c:258-266
   - Lý do: không phải thiết bị nào cũng đặt CCCD ngay sau value handle; mô tả có thể khác.
   - Rủi ro: subscribe fail âm thầm, không nhận notify.

3) [MEDIUM] Deinit BLE có thể đua với task NimBLE host
   - File: E:\...\main\src\ble_init.c:80-90, 25-30
   - Lý do: `ble_stack_deinit` gọi `nimble_port_stop/deinit` trong khi task host vẫn chạy và cũng gọi `nimble_port_freertos_deinit`.
   - Rủi ro: double-deinit hoặc use-after-free khi task chưa kết thúc.

4) [MEDIUM] Sao chép cấu hình MQTT bằng struct có thể giữ con trỏ treo
   - File: E:\...\main\src\mqtt_client.c:82-93
   - Lý do: `s_cfg = *cfg;` nếu `cfg` chứa con trỏ tới bộ nhớ tạm, sẽ hỏng khi dùng về sau.
   - Rủi ro: crash ngẫu nhiên, topic/uri sai.

### Low Priority
1) [LOW] Bỏ qua mã lỗi khi restart scan
   - File: E:\...\main\src\ble_mgr.c:389-392
   - Rủi ro: mất scan âm thầm khi `ble_gap_disc` fail.

2) [LOW] Truncation topic khi `device_id` quá dài
   - File: E:\...\main\src\mqtt_client.c:30-35
   - Rủi ro: publish/subscribe lệch topic thực tế.

### Edge Cases Found by Scout
- Không có scout result riêng cho firmware files.

### Positive Observations
- Kiểm tra null/timeout tốt ở các API công khai.
- Parsing OBD có bảo vệ buffer và giới hạn copy.
- JSON command xử lý an toàn, không crash khi dữ liệu thiếu.

### Recommended Actions
1) Bảo vệ truy cập `mgr_ctx` bằng mutex hoặc serialize API với BLE host task.
2) Thay giả định CCCD bằng discovery descriptor nếu cần tương thích rộng.
3) Đồng bộ shutdown NimBLE task trước deinit.
4) Xác nhận lifetime của chuỗi config MQTT; nếu cần, copy deep.

### Metrics
- Type Coverage: N/A (C)
- Test Coverage: N/A
- Linting Issues: Not assessed

### Unresolved Questions
- `config_t` có đảm bảo lifetime của chuỗi cấu hình MQTT không?
- Các API BLE có bị gọi từ nhiều task song song không?
