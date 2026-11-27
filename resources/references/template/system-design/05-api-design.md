# 05. Thiết kế API IVTS

[Backend](../../../../iot-vehicle-tracking-system-cloud/Tracking_Backend/src/index.ts) gắn các router nghiệp vụ dưới `/api/v1`. Controller nhận yêu cầu đã kiểm tra, gọi nghiệp vụ và dùng serializer chung. Hãy đối chiếu [router thực tế](../../../../iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/index.ts) khi bổ sung client hoặc tài liệu API.

## Envelope và quyền

| Kết quả | Hợp đồng |
| --- | --- |
| Thành công JSON | `{ "data": ..., "requestId": "...", "meta": ... }`. `meta` xuất hiện khi endpoint cần thông tin bổ sung như phân trang. |
| Lỗi HTTP | `application/problem+json` với thông tin lỗi và `requestId` để tra log. |
| Tải tệp | Dùng response tải dữ liệu của endpoint tương ứng, ví dụ firmware binary hoặc kết quả export. |

Xác thực nhận diện người dùng. Quyền vai trò kiểm soát thao tác và quyền tài sản kiểm soát thiết bị/xe được đọc hoặc thay đổi. Worker export cần giữ phạm vi tương ứng khi tạo tệp từ dữ liệu.

## Route chính

Các đường dẫn dưới đây tính từ `/api/v1`.

| Route | Vai trò |
| --- | --- |
| `POST /auth/login`, `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout` | Tạo, đọc, làm mới và kết thúc phiên backend. |
| `GET /devices`, `GET /devices/positions` | Danh sách và vị trí theo phạm vi quyền. |
| `GET /devices/:id/sessions`, `GET /devices/:id/sessions/:sessionId/telemetry` | Phiên tracker và mẫu lịch sử theo phiên. |
| `GET /telemetry/history` | Truy vấn lịch sử telemetry. Truyền `deviceId` và có thể chọn `from`, `to`, `fields`. |
| `POST /devices/:id/command`, `GET /devices/:id/commands` | Tạo lệnh và theo dõi lịch sử lệnh. |
| `POST /devices/:id/ota`, `POST /firmware/:id/deploy` | Bắt đầu quy trình OTA từ thiết bị hoặc bản firmware. |
| `POST /exports/device`, `GET /exports/device/:id`, `GET /exports/device/:id/download` | Tạo, xem trạng thái và tải export theo thiết bị. Router có đường export toàn fleet dành cho vai trò quản trị. |

## Lệnh bất đồng bộ

Khi gửi lệnh, backend tạo record `pending` và publish ở QoS 1 xuống `v1/{device_id}/commands`. `sent` cho biết đã dispatch qua broker. Backend đối chiếu ACK ứng dụng theo thiết bị và lệnh trước khi cập nhật sang `accepted`, `acknowledged` hoặc `failed`. Nếu thiết bị khởi động lại khi lệnh còn ở `accepted` với boot ID trước đó, backend có thể chuyển sang `indeterminate` vì chưa xác định kết quả. Lệnh OTA còn có tiến độ cài đặt riêng theo job.

- [Router thiết bị](../../../../iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/device.routes.ts)
- [Router export](../../../../iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/export.routes.ts)
- [Vòng đời lệnh](../../../../iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/device/services/device-command.service.ts)
- [Response helpers](../../../../iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/utils/response.util.ts)
- [Đường ACK từ MQTT sang backend](06-realtime-design.md#đường-trả-kết-quả-lệnh)
