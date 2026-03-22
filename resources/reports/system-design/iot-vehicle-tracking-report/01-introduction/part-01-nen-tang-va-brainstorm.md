## PHẦN I: THAM KHẢO KIẾN THỨC NỀN VÀ BRAINSTORM

### I.1 Bối Cảnh và Vấn Đề

Các hệ thống theo dõi GPS ô tô hiện nay gặp hai thách thức chính:

1. **Tiêu thụ pin/ắc quy**: Nếu thiết bị lấy điện từ ắc quy xe và hoạt động liên tục (track real-time), nó sẽ rút cạn ắc quy trong vài tuần, ảnh hưởng khả năng khởi động xe.

2. **Giám sát khi xe đỗ**: Khi xe tắt máy (IGN OFF), hệ thống cần vừa tiết kiệm điện vừa có khả năng phát hiện chuyển động bất thường (trộm, kéo cẩu).

### I.2 Yêu Cầu Thiết Kế

- Phát hiện chuyển động bất thường khi xe tắt máy
- Gửi vị trí GPS định kỳ không làm kiệt ắc quy
- Có khả năng "thức dậy" nhanh khi phát hiện cảnh báo
- Tối ưu hóa tiêu thụ pin/năng lượng
- Bảo vệ ắc quy khỏi rút cạn quá mức

### I.3 Hướng Giải Quyết Đề Xuất

- **Sử dụng IMU (Inertial Measurement Unit)** để phát hiện chuyển động mà không cần GPS chạy liên tục
- **Chế độ sleep (deep sleep)** của microcontroller để tiêu thụ cực thấp khi không cần hoạt động
- **Pin dự phòng (backup battery)** với dung lượng lớn để tiếp tục hoạt động khi ắc quy xe yếu
- **Mạch Low Voltage Disconnect (LVD)** để tự động tách tải khỏi ắc quy khi điện áp tụt thấp
- **Chiến lược đa chế độ (multi-mode)**: lái xe → đỗ bình thường → cảnh báo
