# Firmware Build/Test Readiness Report

Date: 2026-03-02
Scope: main/src/ble_mgr.c, main/src/ble_obd.c, main/src/mqtt_client.c, main/src/ble_init.c, main/src/command_handler.c, main/inc/command_handler.h

## Sequential Thinking Log
Thought 1/5: Xác nhận bối cảnh repo/firmware, tìm lệnh build/test khả dụng, ưu tiên kiểm tra ESP-IDF.
Thought 2/5: Đọc file được chỉ định, tìm lỗi compile blocker hoặc rủi ro runtime mới.
Thought 3/5: Tổng hợp findings theo file:line, phân loại compile vs runtime risk.
Thought 4/5: Xác định các bước validation không thể chạy do thiếu tooling.
Thought 5/5 [FINAL]: Ghi báo cáo ngắn gọn, nêu rủi ro còn lại và câu hỏi mở.

## Tooling/Build Availability
- ESP-IDF tool idf.py: KHÔNG có trong môi trường (idf.py --version trả lỗi "command not found"). Không thể build/test thật.

## Static Validation Findings (file:line)
### Possible compile blockers
- Không thấy lỗi cú pháp rõ ràng trong các file đã đọc. Các API và macro cần xác nhận từ ESP-IDF/headers nội bộ.

### Runtime/logic risks
- E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Firmware/main/src/ble_obd.c:115-118: strtol(token, NULL, 16) chấp nhận token không hợp lệ và bỏ qua; phản hồi có thể bị parse sai nếu có ký tự không-hex. Đang trả cb lỗi nhưng không log, có thể khó debug.
- E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Firmware/main/src/ble_obd.c:215-236: xSemaphoreTake(ctx->api_mutex, timeout) và xSemaphoreTake(response_sem, timeout) có thể gây timeout liên tục nếu notify bị mất; không có retry/timeout log.
- E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Firmware/main/src/ble_mgr.c:360-370: gọi ble_gap_disc_cancel rồi ble_gap_connect; nếu connect rc != 0, s_mgr.state có thể vẫn giữ disc_cfg cũ và is_connecting false, OK; nhưng không có backoff, có thể loop scan-connect nhanh.
- E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Firmware/main/src/ble_mgr.c:461-469: nếu ble_init_stack ok nhưng queue_wait timeout, cleanup gọi xQueueReset + vQueueDelete + delete mutex; hợp lý nhưng không log nên khó trace.
- E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Firmware/main/src/ble_init.c:61-66: xTaskCreate fail -> deinit; ổn nhưng không log chi tiết failure reason.
- E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Firmware/main/src/mqtt_client.c:67-73: so sánh topic_len với strlen(s_topic_commands) OK; payload buffer 512 bytes, data_len > 511 bị truncate; không log truncate.
- E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Firmware/main/src/command_handler.c:45-46: nvs_config_save return không kiểm tra; lỗi lưu config không được surface.

## Build/Test Readiness
- Build: Không thể xác nhận do thiếu ESP-IDF tooling.
- Runtime readiness: Logic nhìn chung ổn, rủi ro chủ yếu là thiếu log/timeout handling và payload truncation.

## Recommendations
- Chạy build với ESP-IDF (idf.py build) trong môi trường chuẩn để xác nhận API/macro.
- Chạy unit/integration tests nếu có; ưu tiên BLE connect/OBD parse và MQTT command handling.
- Bổ sung log cho timeout/truncate nếu QA yêu cầu traceability (không thực hiện do yêu cầu không chỉnh code).

## Unresolved Questions
- ESP-IDF version dự kiến? Có thể ảnh hưởng cấu trúc esp_mqtt_client_config_t và nimble APIs.
- Có test harness cho BLE/MQTT? Nếu có, yêu cầu cung cấp lệnh chạy.
