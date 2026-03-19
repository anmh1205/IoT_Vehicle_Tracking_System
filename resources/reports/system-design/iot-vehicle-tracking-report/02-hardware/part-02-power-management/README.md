# Power Management - Quản Lý Nguồn

Thư mục này chứa các file chi tiết về hệ thống quản lý nguồn và power path management.

## Danh Sách File

1. **[01-overview.md](./01-overview.md)** - Tổng quan quản lý nguồn

   - Nguyên lý hoạt động
   - Logic chuyển nguồn
   - Kiến trúc tổng thể

2. **[02-buck-converter.md](./02-buck-converter.md)** - Buck Converter 12V/24V→5V
   - IC MP2482
   - Sơ đồ mạch
   - Linh kiện phụ trợ
   - Tính toán

3. **[03-boost-converter.md](./03-boost-converter.md)** - Boost Converter 3.7V→5V

   - IC SX1308
   - Sơ đồ mạch
   - Linh kiện phụ trợ
   - Tính toán

4. **[04-power-path-management.md](./04-power-path-management.md)** - Power Path Management

   - EN control + diode OR switching
   - Diode OR backup
   - So sánh với giải pháp khác
   - Khuyến nghị cho đồ án

5. **[05-low-voltage-disconnect.md](./05-low-voltage-disconnect.md)** - Low Voltage Disconnect (LVD)

   - Software-based (ADC ESP32) - Khuyến nghị
   - Hardware-based (LM393 Comparator)
   - So sánh và khuyến nghị

6. **[06-charger-ip2312.md](./06-charger-ip2312.md)** - Charger TP4056 (legacy filename remains)

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

1. **Buck Converter (MP2482)**: 12V/24V → 5V @ 5A, cung cấp bus 5V chính cho ESP32-S3, SIM7600CE-T và TP4056.
2. **Downconverters**: XL1509 hạ 5V xuống 3.3V cho ESP32-S3, TPS54231 hạ 5V xuống ~4V để cấp logic cho SIM7600CE-T.
3. **Boost Converter (SX1308)**: Nâng pin 18650 1S (3.0–4.2V) lên 5V khi xe bị ngắt, kết nối qua diode OR với MP2482.
4. **Power Routing**: Diode OR đôi (Schottky) giữa MP2482 và SX1308; GPIO18 chỉ điều khiển EN MP2482, diodes đảm nhiệm chuyển nguồn, không cần relay/MOSFET.
5. **Low Voltage Disconnect**: Comparator LM393 + firmware `power_is_low_voltage()` (GPIO19 HIGH = low-voltage) cắt EN 12/24V để bảo vệ ắc quy, diode OR chuyển sang pin backup.
6. **Charger (TP4056)**: Sạc pin 18650 1S, bật khi `CHARGER_EN=1` và U_batt đạt ngưỡng profile IGN ON.

**Profile mặc định bắt buộc:**

- **12V**: `Switch_OFF=12.0V`, `Switch_ON=12.2V`, `IGN_ON>=13.0V`, `IGN_OFF<=12.0V`
- **24V**: `Switch_OFF=24.0V`, `Switch_ON=24.4V`, `IGN_ON>=26.0V`, `IGN_OFF<=24.0V`

**ADC divider dùng chung 12V/24V:** `R1=100k`, `R2=10k` (tỷ lệ ~0.0909).

### Lý Do

- ✅ Baseline runtime hiện tại là MP2482 + diode OR, đã loại relay/MOSFET
- ✅ SX1308 đảm bảo 5V khi xe tắt và pin backup cung cấp theo diode OR
- ✅ TP4056 chỉ sạc pin 1S khi GPIO5 bật, tránh overcharging khi xe tắt
- ✅ XL1509/TPS54231 giữ rail 3.3V/4V ổn định cho MCU và SIM7600CE-T

> **Ghi chú legacy:** LM2596, MT3608, IP2312, relay/MOSFET, pin 21700/2S chỉ để đối chiếu lịch sử; không phải path runtime hiện tại.
