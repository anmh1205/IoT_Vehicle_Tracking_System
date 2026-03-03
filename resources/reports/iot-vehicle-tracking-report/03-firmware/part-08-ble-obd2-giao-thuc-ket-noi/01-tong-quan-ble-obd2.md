# 01. Tổng quan BLE và OBD2

## 1.1. Bluetooth Low Energy (BLE 4.0)

### Khái niệm

Bluetooth Low Energy (BLE), còn gọi là Bluetooth Smart, là phiên bản tiết kiệm năng lượng của công nghệ Bluetooth truyền thống. BLE được giới thiệu trong đặc tả Bluetooth 4.0 (năm 2010) với mục tiêu tối ưu cho các ứng dụng IoT và thiết bị nhúng.

### So sánh BLE 4.0 với Bluetooth Classic

| Tiêu chí | Bluetooth Classic (SPP) | Bluetooth Low Energy 4.0 |
|----------|------------------------|--------------------------|
| Tốc độ truyền | 2-3 Mbps | 1 Mbps (đủ cho OBD2) |
| Công suất tiêu thụ | 30-100 mA | 5-15 mA |
| Thời gian kết nối | 2-6 giây | < 1 giây |
| Hỗ trợ iOS | Cần MFi license | Hỗ trợ trực tiếp |
| Mô hình giao tiếp | Stream (SPP) | GATT (Attribute-based) |
| Phù hợp cho | Audio, file transfer | Sensor, IoT, OBD2 |

### Lý do chọn BLE cho hệ thống

1. **Tiết kiệm năng lượng**: Thiết bị tracker chạy pin backup 21700, cần tiêu thụ ít năng lượng nhất có thể
2. **Tương thích đa nền tảng**: BLE hoạt động trên cả iOS và Android mà không cần chứng nhận MFi
3. **Tốc độ kết nối nhanh**: Kết nối trong vài trăm mili-giây, phù hợp khi xe khởi động
4. **ESP32-S3 hỗ trợ native**: Chip ESP32-S3 tích hợp sẵn BLE 5.0 (tương thích ngược BLE 4.0)

### Kiến trúc GATT (Generic Attribute Profile)

GATT là giao thức cốt lõi của BLE, tổ chức dữ liệu theo cấu trúc phân cấp:

```
┌─────────────────────────────────────────┐
│              GATT Server                │
│         (Vgate iCar Pro)                │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │         Service (0x18F0)          │  │
│  │         "OBD2 Service"            │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  TX Characteristic (0x2AF1) │  │  │
│  │  │  Property: Write            │  │  │
│  │  │  Mục đích: Gửi lệnh OBD2   │  │  │
│  │  └─────────────────────────────┘  │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  RX Characteristic (0x2AF0) │  │  │
│  │  │  Property: Notify           │  │  │
│  │  │  Mục đích: Nhận phản hồi    │  │  │
│  │  │                             │  │  │
│  │  │  ┌───────────────────────┐  │  │  │
│  │  │  │  CCCD Descriptor      │  │  │  │
│  │  │  │  (0x2902)             │  │  │  │
│  │  │  │  Ghi 0x0100 = ON      │  │  │  │
│  │  │  └───────────────────────┘  │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Giải thích:**
- **Service**: Nhóm logic chứa các characteristic liên quan. Mỗi service có một UUID duy nhất
- **Characteristic**: Đơn vị dữ liệu nhỏ nhất trong GATT. Mỗi characteristic có UUID, thuộc tính (Read/Write/Notify), và giá trị
- **Descriptor (CCCD)**: Client Characteristic Configuration Descriptor — bộ mô tả cho phép client (ESP32) bật/tắt chế độ Notify trên characteristic

### Vai trò Central và Peripheral

Trong BLE, hai thiết bị giao tiếp theo mô hình **Central - Peripheral**:

| Vai trò | Thiết bị | Chức năng |
|---------|---------|-----------|
| **Central** (Master) | ESP32-S3 | Quét, kết nối, gửi lệnh, nhận dữ liệu |
| **Peripheral** (Slave) | Vgate iCar Pro | Quảng bá (advertise), chờ kết nối, trả lời lệnh |

ESP32-S3 chủ động quét tìm Vgate, thiết lập kết nối, và điều khiển toàn bộ luồng giao tiếp.

---

## 1.2. OBD2 (On-Board Diagnostics II)

### Khái niệm

OBD-II (On-Board Diagnostics, phiên bản 2) là hệ thống chẩn đoán tiêu chuẩn được tích hợp trong tất cả xe ô tô sản xuất từ năm 1996 (Mỹ) và 2001 (Châu Âu). Hệ thống cho phép đọc dữ liệu vận hành động cơ theo thời gian thực thông qua cổng OBD2 (16 chân) thường nằm dưới vô-lăng.

### Giao thức truyền thông OBD-II

OBD-II hỗ trợ 5 giao thức truyền thông cấp thấp:

| Giao thức | Tốc độ | Xe sử dụng |
|-----------|--------|-------------|
| ISO 15765-4 (CAN) | 250/500 Kbps | Phổ biến nhất (từ 2008) |
| ISO 14230-4 (KWP2000) | 10.4 Kbps | Xe Châu Á (trước 2008) |
| ISO 9141-2 | 10.4 Kbps | Xe Châu Âu cũ |
| SAE J1850 PWM | 41.6 Kbps | Ford |
| SAE J1850 VPW | 10.4 Kbps | GM |

> **Lưu ý:** Vgate iCar Pro hỗ trợ **tất cả 5 giao thức** và tự động nhận diện giao thức của xe (Auto Protocol Detection).

### Cấu trúc lệnh OBD-II

Lệnh OBD-II gồm 2 phần: **Mode** (chế độ) và **PID** (Parameter ID):

```
Lệnh: [Mode][PID]
Ví dụ: 01 0C  →  Mode 01 (dữ liệu hiện tại), PID 0C (tốc độ động cơ)
```

**Các Mode phổ biến:**

| Mode | Mô tả | Ứng dụng |
|------|--------|----------|
| 01 | Dữ liệu hiện tại (Current Data) | Đọc RPM, tốc độ, nhiệt độ real-time |
| 02 | Freeze Frame Data | Dữ liệu tại thời điểm lỗi |
| 03 | Mã lỗi chẩn đoán (DTC) | Đọc mã lỗi đang hoạt động |
| 04 | Xóa mã lỗi | Reset đèn Check Engine |
| 09 | Thông tin xe | Đọc VIN, Calibration ID |

---

## 1.3. Vgate iCar Pro BLE 4.0

### Giới thiệu

Vgate iCar Pro là adapter OBD2 sử dụng BLE 4.0 được sản xuất bởi Vgate (Trung Quốc). Thiết bị này đóng vai trò **cầu nối** giữa cổng OBD2 của xe và ESP32-S3 qua kênh BLE:

```
┌──────────┐        OBD-II        ┌──────────────┐       BLE 4.0      ┌──────────┐
│   ECU    │◄─────────────────────│ Vgate iCar   │◄────────────────────│  ESP32   │
│  (Xe)    │   CAN/KWP/J1850     │   Pro BLE    │  GATT Service      │   S3     │
│          │                      │  (ELM327)    │  UUID: 0x18F0      │          │
└──────────┘                      └──────────────┘                     └──────────┘
```

### Lý do chọn Vgate iCar Pro

| Tiêu chí | Vgate iCar Pro | ELM327 Clone giá rẻ | OBDLink MX+ |
|----------|---------------|---------------------|-------------|
| Giá thành | ~15-25 USD | ~3-5 USD | ~80-100 USD |
| Firmware | ELM327 V2.3 chính hãng | Clone không ổn định | Chính hãng |
| BLE 4.0 | Có | Có (một số) | Có |
| Độ tin cậy | Cao | Thấp, hay mất kết nối | Rất cao |
| Tương thích | Tốt | Không đảm bảo | Tốt |
| Tiêu thụ pin xe | Thấp (tự ngủ sau 30 phút) | Không có chế độ ngủ | Thấp |

**Kết luận:** Vgate iCar Pro là lựa chọn tối ưu về tỷ lệ **giá thành / độ tin cậy** cho dự án IoT Vehicle Tracking.

### Đặc tính kỹ thuật

- **Chip BLE**: Hỗ trợ BLE 4.0
- **Chip ELM327**: Firmware V2.3, hỗ trợ đầy đủ AT commands
- **Nguồn cấp**: Lấy nguồn 12V từ cổng OBD2 của xe
- **Chế độ ngủ**: Tự động sleep sau 30 phút không hoạt động
- **Tên BLE quảng bá**: `IOS-VLINK` (iOS) hoặc `ANDROID-VLINK` (Android)
- **Tốc độ phản hồi**: 50-100ms mỗi lệnh OBD2

---

## 1.4. Vai trò trong hệ thống IoT Vehicle Tracking

Trong kiến trúc tổng thể của hệ thống, Vgate iCar Pro là **nguồn dữ liệu OBD2** cung cấp thông tin động cơ cho ESP32-S3:

```
                        ┌─────────────────────────────┐
                        │      ESP32-S3 Tracker        │
                        │                             │
  Vgate iCar Pro ──BLE──► BLE OBD2 Task              │
                        │   ├── RPM, Speed, Fuel      │
  GPS Module ──UART────►│   ├── GPS Lat/Lon           │──MQTT──► Cloud Server
                        │   └── IMU Acceleration      │
  LIS3DH IMU ──I2C────►│                             │
                        │  SIMCom A7670C Modem ───4G──┘
                        └─────────────────────────────┘
```

Dữ liệu OBD2 được kết hợp với GPS và IMU tạo thành **gói telemetry** hoàn chỉnh, truyền lên cloud qua MQTT.

---

## Tài liệu tham khảo

1. Bluetooth SIG, "Bluetooth Core Specification v4.0", 2010
2. SAE International, "SAE J1979 - OBD-II PIDs", 2014
3. ELM Electronics, "ELM327 OBD to RS232 Interpreter Datasheet", 2017
4. Vgate, "iCar Pro BLE 4.0 Product Specifications", vgatemall.com
5. Espressif, "ESP-IDF NimBLE Documentation", docs.espressif.com
