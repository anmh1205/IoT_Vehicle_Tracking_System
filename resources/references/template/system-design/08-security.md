# 08. Thiết kế bảo mật IVTS

## Người dùng và tài sản

Backend xác minh phiên người dùng. Vai trò quyết định loại thao tác có thể thực hiện. Quyền thiết bị hoặc xe tiếp tục giới hạn dữ liệu được đọc hay thay đổi. Kiểm tra này phải áp dụng ở thao tác trực tiếp, truy vấn danh sách/lịch sử và tác vụ nền như export. Socket.IO kiểm tra quyền ở bước mở namespace và khi đăng ký room thiết bị thuộc phạm vi người dùng.

## Thiết bị và broker

EMQX có ranh giới kết nối và ACL theo topic. Topic `v1/{device_id}/*` xác định thiết bị gửi dữ liệu hoặc nhận lệnh. Bridge kiểm tra định danh và token ở các đường ingest yêu cầu xác thực payload. Traffic `internal/events/device/*` thuộc giao tiếp giữa service. Tài khoản triển khai cho tracker, bridge và backend cần được cấp đúng phạm vi topic tương ứng.

Public MQTTS kết thúc TLS ở EMQX trong topology triển khai được mô tả. MQTT qua WSS kết thúc TLS ở proxy. [Thiết kế triển khai](09-deployment.md) ghi rõ hai đường đi.

## WebView và firmware

- Next.js Proxy kiểm tra cookie để điều hướng, cùng với xác thực và quyền dữ liệu ở backend.
- Flutter kiểm tra origin đã cấu hình, frame gọi và URL top-level hiện tại trước khi thực thi native handler. Áp dụng chính sách này cả khi điều hướng phát sinh trong quá trình trang đang tải.
- OTA có ranh giới tải và xác minh image. Lệnh điều hành, trạng thái cài đặt và xác nhận sau reboot là các bước riêng. Cấu hình thiết bị và thông tin xác thực được cấp theo môi trường. Dùng file mẫu trong Git và cấp giá trị thật ngoài Git.

- [Middleware backend](../../../../iot-vehicle-tracking-system-cloud/Tracking_Backend/src/middleware/)
- [Cấu hình EMQX](../../../../iot-vehicle-tracking-system-cloud/Tracking_EMQX/etc/emqx.conf)
- [Xác thực thiết bị của Bridge](../../../../iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/services/device-auth.service.ts)
- [Native bridge](../../../../iot-vehicle-tracking-system-cloud/Tracking_Mobile/lib/features/webview/js_bridge.dart)
- [Cấu hình CI/CD](../../../../docs/cicd-required-secrets-and-env.md)
