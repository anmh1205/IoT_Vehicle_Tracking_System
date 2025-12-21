## PHẦN V: THIẾT KẾ PHẦN MỀM (FIRMWARE)

### V.1 Kiến Trúc

- **Layer 1 – Hardware Abstraction**: driver LIS3DH, **GNSS qua modem A7600 (AT commands)**, modem LTE, ADC, GPIO, **Bluetooth Classic (OBD2 ELM327)**
- **Layer 2 – Power Management**: sleep, wakeup, LVD
- **Layer 3 – Application**: logic chế độ lái/đỗ/cảnh báo, xử lý alert
- **Layer 4 – Communication**: MQTT/HTTP, mã hóa dữ liệu, xử lý lệnh từ server

### V.2 Luồng Hoạt Động Cơ Bản

1. Khởi tạo peripheral (IMU, modem LTE/GNSS, ADC, Bluetooth)
2. Đọc trạng thái IGN + U_batt:
   - **Ưu tiên**: Kết nối OBD2 Bluetooth → đọc IGN từ ECU
   - **Fallback**: Đo điện áp ắc quy nếu không kết nối được OBD2
3. Quyết định chế độ hoạt động
4. Trong mỗi chế độ:
   - **Lái**: Kết nối OBD2, track liên tục, giữ Bluetooth active
   - **Đỗ**: Không kết nối OBD2, sleep + heartbeat
   - **Cảnh báo**: Có thể kết nối OBD2 (tùy chọn), alert + track liên tục
5. Sau khi hoàn thành tác vụ:
   - **Nếu IGN ON**: Giữ kết nối Bluetooth, không deep sleep
   - **Nếu IGN OFF**: Ngắt Bluetooth, deep sleep

### V.3 Các Điểm Chính Trong Code

- **Cấu hình deep sleep và wakeup bằng IMU + timer**
- **Đọc IMU, lọc nhiễu, xác nhận chuyển động**
- **Đo U_batt và điều khiển LVD**
- **Quản lý kết nối Bluetooth OBD2** (kết nối/reconnect/fallback)
- **Bật/tắt GNSS trên modem và đọc vị trí qua AT commands**
- **Gửi dữ liệu lên server (MQTT/HTTP)**
- **Lưu trạng thái để sau sleep dậy vẫn biết chế độ trước đó**

