## PHẦN XIV.2: BẢO MẬT (SECURITY)

### XIV.2 BẢO MẬT (SECURITY)

### XIV.2.1 Firmware Security

#### ⚠️ Vấn Đề 1: Thiếu Mã Hóa Dữ Liệu OBD2

**Hiện Trạng:**

- Dữ liệu OBD2 (RPM, tốc độ, nhiên liệu) được gửi qua BLE không mã hóa
- Dữ liệu MQTT có thể bị đọc nếu bị chặn

**Rủi Ro:**

- Kẻ tấn công có thể đọc dữ liệu xe qua BLE
- Thông tin nhạy cảm (vị trí, tốc độ) có thể bị lộ

**Giải Pháp:**

- ✅ **Mã hóa BLE GATT**: Sử dụng BLE pairing với encryption
- ✅ **TLS/SSL cho MQTT**: Đảm bảo MQTT qua TLS (port 8883)
- ✅ **Mã hóa payload**: Mã hóa dữ liệu nhạy cảm trước khi gửi

**Ưu Tiên:** 🔴 **CAO** (Bảo mật dữ liệu)

---

#### ⚠️ Vấn Đề 2: Thiếu Xác Thực Thiết Bị

**Hiện Trạng:**

- Thiết bị chỉ xác thực bằng `device_id` trong MQTT message
- Không có certificate hoặc device authentication

**Rủi Ro:**

- Kẻ tấn công có thể giả mạo thiết bị bằng cách sử dụng `device_id` hợp lệ
- Có thể gửi dữ liệu giả mạo lên server

**Giải Pháp:**

- ✅ **Device Certificate**: Mỗi thiết bị có certificate riêng
- ✅ **JWT cho Device**: Sử dụng JWT với device secret
- ✅ **MQTT Username/Password**: Xác thực thiết bị qua MQTT username/password

**Ưu Tiên:** 🔴 **CAO** (Bảo mật hệ thống)

---

#### ⚠️ Vấn Đề 3: Thiếu Bảo Vệ API Endpoints

**Hiện Trạng:**

- API endpoints chỉ có JWT authentication
- Không có rate limiting
- Không có IP whitelist

**Rủi Ro:**

- DDoS attacks
- Brute force attacks
- Unauthorized access

**Giải Pháp:**

- ✅ **Rate Limiting**: Giới hạn số request mỗi phút
- ✅ **IP Whitelist**: Chỉ cho phép IP từ mạng nội bộ (nếu cần)
- ✅ **API Key**: Thêm API key cho các endpoint quan trọng
- ✅ **CORS**: Cấu hình CORS đúng cách

**Ưu Tiên:** 🟡 **TRUNG BÌNH** (Có thể triển khai sau)

---

### XIV.2.2 Backend Security

#### ⚠️ Vấn Đề 4: Thiếu Input Validation Chi Tiết

**Hiện Trạng:**

- API có validation cơ bản nhưng chưa đủ chi tiết
- Không có sanitization cho SQL injection

**Rủi Ro:**

- SQL injection
- XSS attacks
- Data corruption

**Giải Pháp:**

- ✅ **Zod/Class-validator**: Sử dụng validation library mạnh
- ✅ **Parameterized Queries**: Luôn dùng parameterized queries
- ✅ **Input Sanitization**: Sanitize tất cả input

**Ưu Tiên:** 🔴 **CAO** (Bảo mật dữ liệu)

---

#### ⚠️ Vấn Đề 5: Thiếu Logging và Monitoring Security Events

**Hiện Trạng:**

- Không có logging cho security events
- Không có alert khi có suspicious activity

**Rủi Ro:**

- Không phát hiện được tấn công
- Không có audit trail

**Giải Pháp:**

- ✅ **Security Event Logging**: Log tất cả login attempts, failed requests
- ✅ **Alert System**: Gửi alert khi có suspicious activity
- ✅ **Audit Trail**: Lưu lại tất cả thay đổi quan trọng

**Ưu Tiên:** 🟡 **TRUNG BÌNH** (Có thể triển khai sau)

---

