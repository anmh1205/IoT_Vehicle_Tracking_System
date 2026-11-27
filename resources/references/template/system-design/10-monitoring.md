# 10. Thiết kế giám sát IVTS

## Tín hiệu vận hành

| Tín hiệu | Cách đọc |
| --- | --- |
| Backend `/health`, `/health/ready` | Kiểm tra service HTTP và readiness của các phụ thuộc được endpoint theo dõi. |
| Backend `/ws-health`, `/metrics` | Kiểm tra snapshot kết nối Socket.IO và bộ đếm Prometheus. |
| MQTT Bridge `/health` | Endpoint trả snapshot gồm trạng thái kết nối MQTT, subscription, bản tin gần nhất và lỗi gần nhất khi có. |
| MQTT Bridge `/ready` | Trả 503 khi snapshot chưa sẵn sàng. Bridge xác minh broker cấp các subscription yêu cầu sau mỗi lần kết nối. |
| VictoriaMetrics | Lưu metric theo thời gian. Compose hiện đặt retention 30 ngày. |
| VictoriaLogs | Lưu structured logs. Compose hiện đặt retention 7 ngày. |
| Grafana | Đọc datasource VictoriaMetrics và VictoriaLogs đã provision. |

Số lượng kết nối hoặc một endpoint HTTP trả 200 chỉ mô tả tín hiệu của endpoint đó. Để kiểm tra một tracker đến dashboard, đối chiếu broker, bridge, bản ghi SQL và sự kiện đã nhận trên client.

## Lần theo sự kiện qua các service

- Khi mất dữ liệu mới, kiểm tra thời điểm publish ở tracker, listener broker, readiness của Bridge và watermark của snapshot. Đối chiếu `message_id` và `boot_id` nếu payload có các trường đó.
- Khi thiếu lịch sử phiên, đối chiếu mốc `status`, khóa phiên cục bộ, định danh canonical và liên kết mẫu trong PostgreSQL. Phân biệt thời gian do thiết bị gửi và thời gian server quan sát.
- Khi lệnh dừng ở trạng thái chờ, đối chiếu `command_id` giữa command record, topic gửi lệnh, ACK ứng dụng và sự kiện Socket.IO. Kiểm tra tiến độ OTA theo job riêng nếu thao tác là cập nhật firmware.
- Giữ ID tương quan và thông tin thời điểm cho chẩn đoán. Log chia sẻ cần bỏ token và thông tin nhận dạng nhạy cảm.

- [Health server của Bridge](../../../../iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/services/bridge-health.service.ts)
- [Health router của Backend](../../../../iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/health.routes.ts)
- [VictoriaMetrics](../../../../iot-vehicle-tracking-system-cloud/Tracking_VictoriaMetrics/docker-compose.yml), [VictoriaLogs](../../../../iot-vehicle-tracking-system-cloud/Tracking_VictoriaLogs/docker-compose.yml) và [Grafana provisioning](../../../../iot-vehicle-tracking-system-cloud/Tracking_Grafana/provisioning/)
