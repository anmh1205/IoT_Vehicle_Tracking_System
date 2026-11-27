# 04. Thiết kế dữ liệu IVTS

## Vai trò của các kho dữ liệu

| Kho | Trách nhiệm |
| --- | --- |
| PostgreSQL và PostGIS | Thiết bị, xe, người dùng, quyền truy cập, vị trí hiện tại, phiên tracker, chuyến đi, cảnh báo, lệnh, firmware và bản ghi lịch sử. PostGIS phục vụ các truy vấn không gian. |
| VictoriaMetrics | Metrics theo thời gian từ các service và luồng telemetry được bridge gửi sang pipeline metrics. |
| VictoriaLogs | Log có cấu trúc phục vụ chẩn đoán vận hành. |

## Hai đường đọc telemetry

`devices` giữ snapshot hiện tại cho danh sách và bản đồ. `event_logs` giữ dữ liệu đã ghi nhận để truy vấn lịch sử, còn `device_sessions` giữ định danh và mốc mở/đóng phiên tracker. Chuyến đi thuộc mô hình nghiệp vụ riêng trong `trips`, nên API phiên thiết bị và API chuyến đi có vai trò riêng.

Bridge cập nhật trạng thái và số liệu phiên theo điều kiện ingest. Với mẫu rawdata đủ điều kiện, Bridge phát sự kiện nội bộ và backend MQTT listener ghi mẫu vào `event_logs`. Sự kiện vị trí trực tiếp và việc ghi lịch sử có thể hoàn thành ở hai thời điểm khác nhau.

| Đường đọc | Điều kiện |
| --- | --- |
| Hiện tại | Watermark của payload giúp bản tin replay cũ không ghi đè snapshot mới hơn. |
| Lịch sử | Backend giới hạn theo thiết bị, thời gian hoặc phiên. Dữ liệu gắn với phiên đã kết thúc có thể được bổ sung nếu phép đối chiếu định danh và thời gian cho phép. |
| Phân quyền | Truy vấn lịch sử và công việc export dùng phạm vi đã được cấp. Thiết bị xuất hiện trong phiên đăng nhập chỉ khi backend xác nhận quyền truy cập tương ứng. |

## Danh tính phiên và tính nhất quán

Firmware gửi khóa phiên cục bộ và boot ID. PostgreSQL có unique index theo thiết bị, boot và khóa cục bộ cho các dòng có đủ định danh. Bridge tạo hoặc tìm phiên tương ứng và gửi định danh server về tracker. Thời điểm thiết bị báo và thời điểm cloud quan sát được lưu riêng để xử lý độ trễ hoặc đồng hồ thiết bị chưa đáng tin cậy.

Bảng `device_session_telemetry_receipts` đặt khóa chính trên `(session_id, message_id)` để phép cộng dồn telemetry theo phiên không đếm lặp khi nhận lại cùng bản tin. Việc ghi lịch sử và bảo vệ snapshot theo watermark là các ranh giới riêng. Khi sửa pipeline cần giữ đầy đủ các ranh giới này.

## Schema và migration

Đọc [các file SQL có phiên bản](../../../../iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/init/) để xem DDL thực tế. Compose gắn thư mục đó vào initdb cho database mới. [Script migration](../../../../iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/scripts/apply-init-migrations.js) phục vụ đường nâng cấp. Kiểm tra cả schema và dữ liệu sau khi chạy với database trống lẫn bản sao có dữ liệu.

- [Định danh phiên](../../../../iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/init/16-authoritative-session-identity.sql)
- [Receipt telemetry theo phiên](../../../../iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/init/26-session-telemetry-receipts.sql)
- [Watermark của thiết bị](../../../../iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/init/28-device-payload-watermark.sql)
- [Khử trùng lịch sử rawdata](../../../../iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/init/29-rawdata-eventlog-message-id.sql)
- [Backend ghi lịch sử từ sự kiện MQTT](../../../../iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts)
- [Truy vấn lịch sử](../../../../iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/telemetry/services/telemetry-history.service.ts)
- [Truy vấn telemetry thiết bị và phiên](../../../../iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/device/services/device-telemetry.service.ts)
