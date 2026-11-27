# 09. Thiết kế triển khai IVTS

## Topology và cổng

Các Compose service dùng Docker network external `tracking-network`. Cột cổng ghi listener hoặc cổng dịch vụ trong cấu hình đi kèm. Host binding phụ thuộc vào từng manifest, profile và môi trường.

| Thành phần | Cổng | Mục đích |
| --- | --- | --- |
| Nginx Proxy Manager | 80, 443, 81, 8883 | HTTP/HTTPS, giao diện quản trị và stream MQTTS |
| EMQX | 1883, 8883, 8083, 18083 | MQTT nội bộ, MQTTS, MQTT over WebSocket và dashboard broker |
| Backend | 4000 | REST, Socket.IO, health và metrics |
| Frontend | 4001 | Dashboard Next.js |
| MQTT Bridge | 4003 mặc định | Health/readiness HTTP trong service |
| PostgreSQL | 5432 | Truy cập SQL. Compose mặc định bind qua loopback trên host |
| VictoriaMetrics | 8428 | HTTP metrics |
| VictoriaLogs | 9428 | HTTP logs |
| Grafana | 4002 | Dashboard giám sát |

Trong topology proxy, WSS dùng HTTPS listener của NPM và chuyển tiếp WebSocket tới EMQX `8083`. Với MQTTS, NPM chuyển tiếp TCP trên `8883` để EMQX kết thúc TLS. EMQX Compose gốc chạy trên Docker network và không khai báo host port. Kiểm tra proxy host, firewall và certificate tại môi trường định triển khai trước khi xác nhận đường truy cập bên ngoài.

## Khởi tạo và nâng cấp

1. Tạo network dùng chung rồi cấp cấu hình từng service theo [README cục bộ](../../../../README.vi.md).
2. Chuẩn bị PostgreSQL, broker và các kho quan sát. Database mới dùng init scripts. Database đã có dữ liệu dùng đường migration có kiểm tra kết quả.
3. Khởi động Bridge, backend và frontend. Đối chiếu health/readiness của service và đường kết nối phụ thuộc.
4. Đối với firmware, chọn đúng ESP-IDF project và kiểm tra các yêu cầu về PCB, flash, chứng chỉ modem, hàng đợi và OTA trước khi nâng cấp tracker.

## Phát hành UAT

Workflow backend và bridge dùng `workflow_dispatch` với lựa chọn triển khai sau khi publish. Image được gắn tag UAT và tag theo commit. Job triển khai dùng Compose và kiểm tra health trước khi kết thúc. Điều kiện kích hoạt và quyền theo môi trường nằm trong từng workflow.

- [Compose của proxy](../../../../iot-vehicle-tracking-system-cloud/Tracking_NPM/docker-compose.yml)
- [Compose của broker](../../../../iot-vehicle-tracking-system-cloud/Tracking_EMQX/docker-compose.yml)
- [Backend UAT](../../../../.github/workflows/backend-uat.yml) và [MQTT Bridge UAT](../../../../.github/workflows/mqtt-bridge-uat.yml)
- [Firmware và tương thích khi nâng cấp](../../../../iot-vehicle-tracking-system-firmware/README.md)
