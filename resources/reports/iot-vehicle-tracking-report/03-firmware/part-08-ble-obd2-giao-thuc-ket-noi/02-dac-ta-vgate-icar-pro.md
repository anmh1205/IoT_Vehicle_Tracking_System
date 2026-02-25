# 02. Đặc tả kỹ thuật Vgate iCar Pro BLE 4.0

## 2.1. Thông số phần cứng

| Thông số | Giá trị |
|----------|---------|
| Tên sản phẩm | Vgate iCar Pro Bluetooth 4.0 (BLE) |
| Chip giao tiếp | ELM327 V2.3 |
| Giao tiếp không dây | Bluetooth Low Energy 4.0 |
| Nguồn cấp | 12V DC từ cổng OBD-II |
| Dòng hoạt động | ~45 mA |
| Dòng chế độ ngủ | < 3 mA |
| Thời gian tự ngủ | 30 phút không hoạt động |
| Nhiệt độ hoạt động | -20°C đến +70°C |
| Kích thước | 48 × 32 × 24 mm |
| Đầu nối | OBD-II 16 chân (SAE J1962) |

## 2.2. Giao thức OBD-II hỗ trợ

Vgate iCar Pro hỗ trợ **tất cả 5 giao thức** chuẩn OBD-II, tự động nhận diện giao thức phù hợp với xe:

| # | Giao thức | Mô tả | Xe tiêu biểu |
|---|-----------|-------|---------------|
| 1 | SAE J1850 PWM | Pulse Width Modulation | Ford (trước 2008) |
| 2 | SAE J1850 VPW | Variable Pulse Width | GM (trước 2008) |
| 3 | ISO 9141-2 | Giao thức K-line | Chrysler, Châu Âu cũ |
| 4 | ISO 14230-4 KWP | Keyword Protocol 2000 | Châu Á (Hyundai, Kia) |
| 5 | ISO 15765-4 CAN | Controller Area Network | Phổ biến nhất (từ 2008) |

> **Lưu ý thực tế:** Phần lớn xe sản xuất từ 2008 trở đi sử dụng giao thức CAN (ISO 15765-4). Lệnh AT `ATSP0` cho phép Vgate tự động chọn giao thức phù hợp.

---

## 2.3. GATT Profile — Cấu trúc dịch vụ BLE

### Tổng quan GATT

Khi kết nối BLE, Vgate iCar Pro đóng vai trò **GATT Server** (Peripheral). ESP32-S3 là **GATT Client** (Central). Toàn bộ giao tiếp OBD2 được thực hiện qua 1 Service và 2 Characteristics.

### Bảng UUID

| Thành phần | UUID (16-bit) | UUID đầy đủ (128-bit) | Thuộc tính |
|-----------|---------------|----------------------|------------|
| **OBD2 Service** | `0x18F0` | `000018F0-0000-1000-8000-00805F9B34FB` | — |
| **TX Characteristic** | `0x2AF1` | `00002AF1-0000-1000-8000-00805F9B34FB` | Write, Write Without Response |
| **RX Characteristic** | `0x2AF0` | `00002AF0-0000-1000-8000-00805F9B34FB` | Notify |
| **CCCD Descriptor** | `0x2902` | — | Read, Write |

> **Ghi chú về UUID:** UUID 16-bit là dạng rút gọn của UUID 128-bit theo công thức:
> `UUID_128 = UUID_16 × 2^96 + Bluetooth_Base_UUID`
> Trong đó Bluetooth Base UUID = `00000000-0000-1000-8000-00805F9B34FB`

### UUID phiên bản thay thế

Một số phiên bản Vgate iCar Pro (hoặc iCar3) sử dụng bộ UUID 128-bit khác:

| Thành phần | UUID 128-bit |
|-----------|-------------|
| **Service** | `E7810A71-73AE-499D-8C15-FAA9AEF0C3F2` |
| **Characteristic** (TX+RX) | `BEF8D6C9-9C21-4C9E-B632-BD58C1009F9F` |

> **Khuyến nghị:** Khi triển khai firmware, nên thử cả hai bộ UUID. Quét advertisement data của thiết bị để xác định bộ UUID đúng. Source code mẫu trong project sử dụng bộ `0x18F0 / 0x2AF1 / 0x2AF0` — đây là bộ đã được kiểm chứng hoạt động.

### Sơ đồ GATT Profile chi tiết

```
Vgate iCar Pro (GATT Server)
│
└── Service: OBD2 Service (UUID: 0x18F0)
    │
    ├── Characteristic: TX (UUID: 0x2AF1)
    │   ├── Properties: Write, Write Without Response
    │   ├── Value: [lệnh OBD2 dạng ASCII]
    │   └── Mục đích: ESP32 GỬI lệnh đến Vgate
    │       Ví dụ: "010C\r" (đọc RPM)
    │
    └── Characteristic: RX (UUID: 0x2AF0)
        ├── Properties: Notify
        ├── Value: [phản hồi OBD2 dạng ASCII]
        ├── Descriptor: CCCD (UUID: 0x2902)
        │   └── Giá trị: 0x0100 = Bật Notify
        │                 0x0000 = Tắt Notify
        └── Mục đích: Vgate GỬI phản hồi về ESP32
            Ví dụ: "41 0C 1F 40\r" (RPM = 2000)
```

### Giải thích thuộc tính Characteristic

**TX Characteristic (0x2AF1) — Write:**
- ESP32 ghi (write) lệnh OBD2 vào characteristic này
- Hỗ trợ cả `Write` (có phản hồi ACK) và `Write Without Response` (nhanh hơn, không ACK)
- Dữ liệu gửi dạng ASCII string kết thúc bằng `\r` (carriage return)

**RX Characteristic (0x2AF0) — Notify:**
- Vgate tự động gửi phản hồi về ESP32 qua cơ chế Notify
- **Bắt buộc** phải ghi `0x0100` vào CCCD Descriptor (UUID 0x2902) để bật Notify
- Không bật CCCD = không nhận được bất kỳ phản hồi nào

---

## 2.4. Tham số kết nối BLE

### Tham số quảng bá (Advertisement)

Vgate iCar Pro quảng bá (advertise) với các thông tin sau:

| Trường | Giá trị | Mô tả |
|--------|---------|-------|
| Device Name | `IOS-VLINK` hoặc `V-LINK` | Tên thiết bị BLE |
| Service UUID | `0x18F0` | UUID dịch vụ OBD2 trong advertisement data |
| Connectable | Yes | Cho phép kết nối |
| Advertising Interval | ~100 ms | Tần suất phát advertisement |

> **Cách nhận diện đúng thiết bị:** Thay vì dựa vào tên BLE (có thể trùng), nên filter theo **Service UUID 0x18F0** trong advertisement data. Đây là cách chính xác nhất.

### Tham số kết nối khuyến nghị

| Tham số | Giá trị | Đơn vị | Mô tả |
|---------|---------|--------|-------|
| Connection Interval Min | 0x0010 (20 ms) | 1.25 ms/unit | Khoảng cách tối thiểu giữa 2 connection event |
| Connection Interval Max | 0x0020 (40 ms) | 1.25 ms/unit | Khoảng cách tối đa |
| Slave Latency | 0 | events | Số connection event peripheral được bỏ qua |
| Supervision Timeout | 0x0100 (3.2 s) | 10 ms/unit | Thời gian chờ trước khi coi là mất kết nối |

> **Tối ưu cho real-time OBD2:**
> - Connection interval nhỏ (20-40 ms) = phản hồi nhanh hơn, nhưng tiêu thụ pin nhiều hơn
> - Slave latency = 0: Vgate phải phản hồi mỗi connection event (không được bỏ qua)
> - Supervision timeout 3.2 giây: Đủ lớn để tránh disconnect giả do nhiễu sóng

### Tham số kết nối tối ưu (low-latency)

Trong trường hợp cần tốc độ phản hồi cao nhất:

| Tham số | Giá trị | Mô tả |
|---------|---------|-------|
| Connection Interval | 0x0006 (7.5 ms) | Nhanh nhất BLE cho phép |
| Slave Latency | 0 | Không bỏ qua event nào |
| Supervision Timeout | 0x00C8 (2 s) | Timeout nhanh hơn để phát hiện mất kết nối sớm |

> **Cảnh báo:** Interval 7.5 ms tiêu thụ năng lượng gấp ~3 lần so với 40 ms. Chỉ sử dụng khi cần polling OBD2 tần suất cao (> 10 Hz).

---

## 2.5. MTU (Maximum Transmission Unit)

| Thông số | Giá trị |
|----------|---------|
| MTU mặc định (BLE 4.0) | 23 bytes (20 bytes payload) |
| MTU tối đa (BLE 4.2+) | 512 bytes |
| MTU Vgate iCar Pro | 20 bytes payload (BLE 4.0) |

**Hệ quả quan trọng:**
- Mỗi BLE packet chỉ mang được tối đa **20 bytes** dữ liệu
- Phản hồi OBD2 dài (ví dụ: DTC codes) bị chia thành **nhiều packet**
- Firmware phải **buffer** các packet cho đến khi nhận được ký hiệu kết thúc `>\r`

Ví dụ phản hồi bị chia packet:

```
Packet 1: "41 0C 1F 40\r\n"     (14 bytes — vừa trong 1 packet)
Packet 2: ">\r"                   (2 bytes — prompt riêng)

Hoặc phản hồi dài:
Packet 1: "41 00 BE 1F A8 13"    (20 bytes — cắt giữa chừng)
Packet 2: "\r\n>\r"              (4 bytes — phần còn lại + prompt)
```

---

## Tài liệu tham khảo

1. Bluetooth SIG, "GATT Overview", bluetooth.com/specifications/gatt
2. ELM Electronics, "ELM327 Datasheet v2.3", elmelectronics.com
3. Vgate, "iCar Pro Technical Specifications", vgatemall.com
4. Project esp32-obd2-meter, `main/src/ble_obd.c`, gitlab.com/janoskut/esp32-obd2-meter
