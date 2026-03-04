# Power Management - Quản Lý Nguồn

Thư mục này chứa các file chi tiết về hệ thống quản lý nguồn và power path management.

## Danh Sách File

1. **[01-overview.md](./01-overview.md)** - Tổng quan quản lý nguồn

   - Nguyên lý hoạt động
   - Logic chuyển nguồn
   - Kiến trúc tổng thể

2. **[02-buck-converter.md](./02-buck-converter.md)** - Buck Converter 12V/24V→5V
   - IC LM2596
   - Sơ đồ mạch
   - Linh kiện phụ trợ
   - Tính toán

3. **[03-boost-converter.md](./03-boost-converter.md)** - Boost Converter 3.7V→5V

   - IC MT3608
   - Sơ đồ mạch
   - Linh kiện phụ trợ
   - Tính toán

4. **[04-power-path-management.md](./04-power-path-management.md)** - Power Path Management

   - MOSFET switching
   - Diode OR backup
   - So sánh với giải pháp khác
   - Khuyến nghị cho đồ án

5. **[05-low-voltage-disconnect.md](./05-low-voltage-disconnect.md)** - Low Voltage Disconnect (LVD)

   - Software-based (ADC ESP32) - Khuyến nghị
   - Hardware-based (LM393 Comparator)
   - So sánh và khuyến nghị

6. **[06-charger-ip2312.md](./06-charger-ip2312.md)** - Charger IP2312

   - Đặc tính kỹ thuật
   - Kết nối và điều khiển
   - Mạch bảo vệ pin
   - Tính toán thời gian sạc

7. **[07-power-modes.md](./07-power-modes.md)** - Chiến lược quản lý năng lượng

   - Ba chế độ hoạt động (Lái xe, Đỗ xe, Cảnh báo)
   - Logic chuyển nguồn và Low Voltage Disconnect
   - Quản lý pin dự phòng

8. **[08-power-calculations.md](./08-power-calculations.md)** - Tính toán năng lượng
   - Thông số pin và sạc
   - Tiêu thụ năng lượng theo chế độ
   - Thời gian hoạt động từ pin backup
   - Cân bằng năng lượng

## Cấu Trúc

```
part-02-power-management/
├── 01-overview.md
├── 02-buck-converter.md
├── 03-boost-converter.md
├── 04-power-path-management.md
├── 05-low-voltage-disconnect.md
├── 06-charger-ip2312.md
├── 07-power-modes.md
├── 08-power-calculations.md
└── README.md
```

## Khuyến Nghị cho Đồ Án

### Giải Pháp Đề Xuất

1. **Buck Converter**: Module LM2596 (12V/24V→5V, 3A)
2. **Boost Converter**: Module MT3608 (3.7V→5V, 2A)
3. **Power Path**: Relay Module 5V (đơn giản hơn MOSFET)
4. **LVD**: ADC ESP32 (software-based, không cần hardware), chạy profile 12V/24V
5. **Charger**: Module IP2312 (3A, Type-C), bật/tắt theo ngưỡng profile

**Profile mặc định bắt buộc:**

- **12V**: `Switch_OFF=12.0V`, `Switch_ON=12.2V`, `IGN_ON>=13.0V`, `IGN_OFF<=12.0V`
- **24V**: `Switch_OFF=24.0V`, `Switch_ON=24.4V`, `IGN_ON>=26.0V`, `IGN_OFF<=24.0V`

**ADC divider dùng chung 12V/24V:** `R1=100k`, `R2=10k` (tỷ lệ ~0.0909).

### Lý Do

- ✅ Đơn giản, dễ mua module trên Shopee/Lazada
- ✅ Dễ test và debug
- ✅ Giá hợp lý (~50,000–70,000 VNĐ tổng)
- ✅ Phù hợp với phạm vi đồ án
