## PHẦN II: LỰA CHỌN PHẠM VI (SCOPE)

### II.1 Đối Tượng Ứng Dụng

- **Loại xe**: Ô tô con (xe 4 chỗ, sedan, SUV)
- **Điện áp hệ thống**: hỗ trợ profile 12 V DC và profile 24 V DC (mỗi profile dùng bộ ngưỡng nguồn riêng)
- **Ắc quy phổ thông**: 40–70 Ah (trung bình 45–60 Ah)

### II.2 Chức Năng Chính

1. **Khi lái xe (IGN ON)**:

   - Gửi vị trí GPS định kỳ (5–30 giây)
   - Sạc pin dự phòng
   - Kết nối server liên tục (real-time tracking)

2. **Khi đỗ xe bình thường (IGN OFF, không chuyển động)**:

   - Ngủ sâu (deep sleep) để tiêu thụ tối thiểu
   - Thức dậy định kỳ (10–30 phút) để gửi heartbeat
   - IMU canh rung, sẵn sàng phát hiện

3. **Khi phát hiện cảnh báo (có chuyển động bất thường)**:
   - IMU đánh thức ESP32 ngay lập tức
   - Bật 4G + GPS, gửi cảnh báo ưu tiên
   - Tiếp tục track liên tục cho đến khi xác nhận

### II.3 Giao Tiếp với Xe

- **CAN-bus**: Có thể tích hợp để đọc trạng thái IGN, nhiên liệu, tốc độ (tùy chọn)
- **Kết nối nguồn**: Trực tiếp từ ắc quy 12V hoặc 24V (qua mạch bảo vệ)
- **4G/LTE + GNSS**: SIM card, modem 4G **SIMCom A7600CE‑T** (tích hợp GPS/GNSS)

### II.4 Giới Hạn Scope

- Không xử lý OBD-II diagnostics phức tạp (chỉ đọc IGN status cơ bản nếu cần)
- Không phát hiện va chạm (dùng IMU chủ yếu cho chuyển động/rung)
- Không điều khiển động cơ (tắt bơm xăng, khóa xe) – chỉ gửi cảnh báo
