# 02. Yêu cầu hệ thống IVTS

Các yêu cầu dưới đây mô tả hành vi cần giữ khi thay đổi firmware, cloud hoặc ứng dụng. [Project overview](../../../../docs/project-overview-pdr.md) cung cấp bối cảnh sản phẩm.

| Luồng | Hành vi cần giữ | Điều kiện kiểm chứng |
| --- | --- | --- |
| Quản lý thiết bị và đội xe | Người dùng thấy thiết bị, xe và lịch sử trong phạm vi được cấp. Thao tác thay đổi phải qua kiểm tra vai trò và quyền trên tài sản. | Dùng hai tài khoản có phạm vi khác nhau thử danh sách, chi tiết, Socket.IO và export. |
| Theo dõi trực tiếp | Dashboard nhận vị trí và trạng thái hiện tại. Bản tin replay cũ có thể bổ sung lịch sử mà không lùi vị trí hoặc trạng thái hiện tại. | Gửi một điểm mới rồi phát lại một điểm cũ của cùng thiết bị. So sánh lịch sử và snapshot hiện tại. |
| Phiên vận hành | Tracker gửi mốc mở và đóng phiên. Bridge liên kết mốc với định danh phiên trong PostgreSQL. Heartbeat lúc đỗ duy trì trạng thái kết nối. | Thử bật/tắt ignition, khởi động lại và lặp heartbeat lúc đỗ. Đối chiếu số phiên và mốc giờ. |
| Telemetry và báo cáo | Lịch sử lấy từ mẫu đã ghi nhận trong phạm vi thời gian và thiết bị được cấp. Đồ thị phân biệt thiếu dữ liệu, đang tải và lỗi. | Mở một khoảng trống, một khoảng có mẫu và một khoảng ngoài quyền. So sánh truy vấn và dữ liệu export. |
| Lệnh và OTA | Người vận hành theo dõi riêng trạng thái gửi, kết quả thực thi và tiến độ OTA. Retry hoặc nhận ACK trễ được đối chiếu với đúng thiết bị và lệnh. | So sánh hành vi với thiết bị online, offline, ACK trễ và tải firmware thất bại. |
| Web và mobile | Web quản lý phiên backend. Flutter WebView đồng bộ đăng nhập/đăng xuất và chỉ cấp quyền native cho origin ứng dụng đã cấu hình. | Kiểm tra reload, đăng xuất, phiên hết hạn và điều hướng ra ngoài origin. |

## Kiểm chứng phi chức năng

- Giá trị throughput, độ trễ, quy mô, SLA, RTO và RPO cần đi kèm môi trường, tải, dữ liệu nền và phương pháp đo. Khi chưa có phép đo đối chiếu, các chỉ số đó là mục tiêu cần xác nhận.
- Mức bảo đảm MQTT áp dụng theo từng chặng và từng topic. Thiết kế của các thao tác bền vững phải xét trùng lặp, mất kết nối, bản tin đến muộn và lỗi giữa các bước ghi.
- Host test và ESP32-S3 build kiểm tra hai phạm vi khác nhau. Mất điện giữa lúc ghi, tương thích PCB và OTA rollback cần kiểm chứng trên tracker. Pipeline ingest cần kiểm chứng với broker và PostgreSQL.
- Dùng [tiêu chuẩn kiểm thử của repo](../../../../AGENTS.md#tests-and-build-commands) để chọn môi trường và ghi lại phạm vi đã chạy.
