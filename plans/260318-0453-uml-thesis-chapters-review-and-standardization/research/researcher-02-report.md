# Báo cáo nghiên cứu UML Thesis (Researcher 02)

**Mục tiêu rà soát:** chuẩn hóa ngôn ngữ tiếng Việt có dấu cho nhãn UML và kiểm tra logic/flow giữa UML và nội dung thesis.

## 1) Quy tắc chuẩn hoá ngôn ngữ cho UML thesis

### 1.1 Nguyên tắc dịch
- Dùng tiếng Việt có dấu cho tất cả nhãn nghiệp vụ, tiêu đề luồng, ghi chú luồng ngoại lệ.
- Giữ nguyên thuật ngữ kỹ thuật bất dịch: `Device`, `Gateway`, `API`, `MQTT`, `OTA`, `ACL`, `JWT`, `Session`, `Dashboard`, `Microcontroller`, `IMEI`, `SIMCom`, `OBD2`, `BLE`, `GNSS`, `Docker`, `PostgreSQL`, `Redis`, `VictoriaMetrics`, `VictoriaLogs`, `EMQX`, `WebSocket`.
- Nếu cần vừa rõ kỹ thuật vừa thân thiện tiếng Việt: viết tiếng Việt + thuật ngữ gốc trong ngoặc, ví dụ: `phân quyền (authorization)`, `cảnh báo (alert)`.

### 1.2 Quy tắc từ vựng nội bộ (khuyên dùng)
- `Thiết bị` (thống nhất toàn repo cho `device`),
- `Người dùng` cho `user`,
- `Phiên` cho `session`,
- `Lịch trình`/`trạm cron` cho `job` tùy ngữ cảnh,
- `Bản tin` cho `payload` khi mô tả dữ liệu giao tiếp.
- `Khả dụng` cho `online/online-state`; tránh trộn `đang hoạt động`/`active` trong cùng một cụm.

### 1.3 Cú pháp nhãn hành động
- Ưu tiên động từ ở **thể mệnh lệnh ngắn**: `Gửi`, `Nhận`, `Xác thực`, `Lưu`, `Phản hồi`, `Ghi log`.
- Cấu trúc nhất quán: `Điều kiện -> Hành động -> Kết quả`.
- Ưu tiên một tiếng khoá cho điều kiện: `nếu/không`, `thất bại/nếu không`.
- Nhãn node quá dài hoặc lặp kỹ thuật nên tách thành note/annotation.

## 2) Nhóm lỗi ngôn ngữ phổ biến cần kiểm tra

1. **Thiếu dấu (high risk):** `khong`, `dong bo`, `nguoi dung`, `thiet bi`, `du lieu`, `canh bao`, `gia tri`.
2. **Trộn Việt-Anh sai ngữ cảnh:** `thiet bi publish`, `user gui request`, `kiem tra auth`.
3. **Dịch sai thuật ngữ hẹp:** `triển khai` dùng sai chỗ `deploy`, `nâng cấp`/`cập nhật` không nhất quán (OTA flow), `phiên` bị lẫn `token`.
4. **Không nhất quán vai trò actor:** cùng một actor gọi bằng `Client`, `Người dùng`, `Người quản trị` tùy chỗ khiến luồng khó đối chiếu.
5. **Lỗi chính tả/chữ Việt - Anh trái quy chuẩn:** viết tắt không thống nhất `geo-fence`, `geofencing`, `GeoFence`.
6. **Rập khuôn kỹ thuật trong tiếng Việt:** `định tuyến message` nên dùng `định tuyến bản tin`; `quá trình rollback` cần mô tả đầy đủ `thu hồi/đảo ngược phiên bản`.

## 3) Framework kiểm tra logic/flow cho UML

### A. Actor & Boundary
- Mỗi luồng có actor nguồn rạch ròi: `Người dùng`, `Thiết bị`, `MQTT Gateway`, `API Server`, `Cơ sở dữ liệu`, `Dashboard`.
- Mỗi actor phải có **đầu vào đủ điều kiện** (sự kiện, request, timer, cron/event).

### B. Trigger, pre/post-condition
- Với mỗi sequence/activity: xác định điều kiện vào/ra của mỗi nhánh (`alt`, `opt`, `loop`).
- Bắt buộc có 3 mảnh: `pre-condition`, `action`, `post-condition`.
- Nếu có lỗi xác thực, timeout, mất mạng, cần luồng `Xử lý lỗi` rõ ràng.

### C. Data flow
- Kiểm tra tên và mục đích payload xuyên suốt: topic, message schema, kiểu dữ liệu, khóa nhận diện (vehicle_id, device_id).
- Kiểm tra phân luồng lưu trữ: time-series -> VictoriaMetrics, relational -> PostgreSQL, log -> VictoriaLogs.

### D. Class / Deployment consistency
- Class: tên lớp phải phản ánh đúng nghiệp vụ trong phần text thesis (ví dụ `Vehicle`, `Device`, `Telemetry`, `Alert`, `FirmwareJob`).
- Deployment: kiểm tra thứ tự phụ thuộc runtime (broker/DB/API/websocket dashboard).
- Kiểm tra giao thức cổng nhất quán: MQTT(8883), HTTPS, WebSocket.

### E. Validation matrix
- Checklist nhanh: có luồng xác thực? có branch ngoại lệ? có retry/backoff? có ACK/NACK? có idempotency cho nhận bản tin?

## 4) Danh sách sơ đồ ưu tiên kiểm tra sâu (ưu tiên cao)

1. `03-chuong-3-giai-phap-phan-cung-hinh-3-1.mmd` + `03-chuong-3-giai-phap-phan-cung-hinh-3-2.mmd` (phân tích tổng hợp, phụ thuộc nghiệp vụ nền)
2. `04-chuong-3-giai-phap-firmware-hinh-3-8.mmd`, `04-chuong-3-giai-phap-firmware-hinh-3-9.mmd`, `04-chuong-3-giai-phap-firmware-hinh-3-10.mmd`, `04-chuong-3-giai-phap-firmware-hinh-3-11.mmd` (toàn bộ luồng firmware/OTA)
3. `05-chuong-3-giai-phap-backend-hinh-3-12.mmd`, `05-chuong-3-giai-phap-backend-hinh-3-13.mmd`, `05-chuong-3-giai-phap-backend-hinh-3-14.mmd`, `05-chuong-3-giai-phap-backend-hinh-3-14a.mmd` (luồng backend + xác thực + API)
4. `06-chuong-3-giai-phap-frontend-hinh-3-16.mmd`, `06-chuong-3-giai-phap-frontend-hinh-3-17.mmd`, `06-chuong-3-giai-phap-frontend-hinh-3-18.mmd`, `06-chuong-3-giai-phap-frontend-hinh-3-19.mmd`, `06-chuong-3-giai-phap-frontend-hinh-3-20.mmd`, `06-chuong-3-giai-phap-frontend-hinh-3-21.mmd`, `06-chuong-3-giai-phap-frontend-hinh-3-22.mmd`, `06-chuong-3-giai-phap-frontend-hinh-3-23.mmd` (dashboard realtime/websocket)
5. `07-chuong-4-trien-khai-hardware-hinh-4-1.mmd` đến `07-chuong-4-trien-khai-hardware-hinh-4-16.mmd` (trình tự triển khai phần cứng + tích hợp)
6. `09-chuong-4-trien-khai-cloud-hinh-4-20.mmd` đến `09-chuong-4-trien-khai-cloud-hinh-4-25.mmd` (chuỗi cloud, broker, lưu trữ)
7. `10-chuong-4-ket-qua-do-luong-hinh-4-20.mmd` đến `10-chuong-4-ket-qua-do-luong-hinh-4-38.mmd` (đo-lường hiệu năng cần kiểm tra tính tương thích với narrative chapter 4).

## 5) Trích dẫn file cụ thể (.mmd) và chapter markdown liên quan

- `resources/reports/thesis-chapters/assets/uml/03-chuong-3-giai-phap-phan-cung-hinh-3-1.mmd` ↔ `resources/reports/thesis-chapters/03-chuong-3-giai-phap.md`
- `resources/reports/thesis-chapters/assets/uml/04-chuong-3-giai-phap-firmware-hinh-3-10.mmd` ↔ `resources/reports/thesis-chapters/04-chuong-3-giai-phap.md`
- `resources/reports/thesis-chapters/assets/uml/05-chuong-3-giai-phap-backend-hinh-3-14.mmd` ↔ `resources/reports/thesis-chapters/05-chuong-3-giai-phap.md`
- `resources/reports/thesis-chapters/assets/uml/06-chuong-3-giai-phap-frontend-hinh-3-17.mmd` ↔ `resources/reports/thesis-chapters/06-chuong-3-giai-phap.md`
- `resources/reports/thesis-chapters/assets/uml/07-chuong-4-trien-khai-hardware-hinh-4-10.mmd` ↔ `resources/reports/thesis-chapters/07-chuong-4-trien-khai.md`
- `resources/reports/thesis-chapters/assets/uml/09-chuong-4-trien-khai-cloud-hinh-4-20.mmd` ↔ `resources/reports/thesis-chapters/09-chuong-4-trien-khai.md`
- `resources/reports/thesis-chapters/assets/uml/10-chuong-4-ket-qua-do-luong-hinh-4-20.mmd` ↔ `resources/reports/thesis-chapters/10-chuong-4-ket-qua.md`
- `resources/reports/thesis-chapters/assets/uml/thesis-05-chuong-3-giai-phap-backend-01.mmd` ↔ `resources/reports/thesis-chapters/99-bao-cao-thesis-hoan-chinh.md`
- `resources/reports/thesis-chapters/assets/uml/thesis-99-bao-cao-thesis-hoan-chinh-06.mmd` ↔ `resources/reports/thesis-chapters/99-bao-cao-thesis-hoan-chinh.md`

## 6) Sai logic/flow theo mô hình phát hiện cần ưu tiên

- Kiểm tra tính tương thích giữa các cụm: `Lịch sử vị trí` trong chapter 10 không được xuất hiện từ luồng OTA backend.
- Kiểm tra 2 ngõ ra lưu trữ: dữ liệu telemetry thời gian thực và nhật ký hệ thống có bị hoán đổi storage không.
- Kiểm tra event lỗi: luồng mất kết nối thiết bị phải kết thúc `Lưu trạng thái offline` hoặc `hủy bản tin` thay vì treo im lặng.
- Kiểm tra idempotency: xử lý bản tin duplicate (`message_id`/`timestamp`) có cơ chế bỏ qua hay gộp.
- Deployment: Gateway, DB, API, worker phải có mũi tên phụ thuộc đúng chiều; dashboard chỉ subscribe sau khi server/sockets sẵn sàng.

## Unresolved questions

1. Danh mục chương markdown chuẩn theo số thứ tự (`03-chuong-3-giai-phap.md`, `04-...`) cần xác nhận lại tên file thực tế trong repo để map 1-1 giữa `.mmd` và `.md` chính xác tuyệt đối.
2. Một số file UML có hậu tố `-a` hoặc `thesis-...` có đang dùng cho bản phụ lục hay bản thay thế? cần xác nhận quy ước đổi tên khi nộp.
3. Có cần áp dụng thêm chuẩn từ điển kỹ thuật riêng cho nhóm (ví dụ `fleet` giữ nguyên hay `đội xe`)? Nếu có, đợt chuẩn hóa tiếp theo cần bảng glossary khóa.
4. Cần có bản xuất PNG/SVG đã render để đối chiếu typo từ OCR hoặc ký tự Mermaid bị mất dấu trong pipeline xuất ảnh.