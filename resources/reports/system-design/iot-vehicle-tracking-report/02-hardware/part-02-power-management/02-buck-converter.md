## III.1.8 Mạch Buck DC-DC: 12V/24V → 5V (MP2482)

### Tổng Quan

Buck converter 5V là nguồn cấp **5V bus chính** cho toàn bộ tracker (ESP32-S3, SIM7600CE-T, TP4056). Kiến trúc hiện tại dùng **MP2482** (12–40V input, 5A output) vì tích hợp internal switch, enable pin và catch diode phù hợp với môi trường xe 12V/24V.

### Yêu Cầu

| Thông Số        | Giá Trị                                             |
| --------------- | --------------------------------------------------- |
| **Input**       | 12–24 V (có thể chịu đến 40V transient)              |
| **Output**      | 5 V ±2%                                             |
| **Dòng tối đa** | ≥ 5 A (dự phòng cho ESP32, modem và charger)        |
| **Hiệu suất**   | > 90% ở dải 12–24 V                                 |
| **Protection**  | EN pin + thermal/OC shutdown                         |
| **Triển khai**  | Dùng MP2482 module hoặc board custom có EN, FB, COMP |

### Lý do giữ 5V bus

- **ESP32-S3** cần 3.3V ổn định → lấy từ XL1509 sau buck.
- **SIM7600CE-T** cần nguồn 3.8–4.0V và rail 1.8V/3.3V từ 5V.
- **TP4056** lấy 5V từ buck để sạc pin 18650 1S.
- **Diode OR + SX1308** dựa vào 5V bus để giữ tải khi ắc quy bị ngắt.

### Lựa chọn IC: MP2482

- **Internal switch**: FET 60V, hỗ trợ input 12–40V, đủ margin cho 24V.
- **EN pin**: ESP32 (GPIO18) có thể tắt PMIC khi LVD kích hoạt, cho phép diode OR chuyển sang SX1308.
- **FB/COMP**: Dễ tune cho ripple <50 mV.
- **Thermal/OC**: Tích hợp nên an toàn trong cabin nóng.

### Mạch tham chiếu

```
12V/24V ──┬── C_INPUT (100µF, 50V) ──┬── MP2482 ──┬── L (22–33µH, 5A) ──┬── 5V bus
          │                           │            │                    │
          └── GND                     │            └── D_SW (Schottky) ─┘
                                      │
                                      └── C_OUTPUT (220µF, 10V)
```

- **EN**: Kiểm soát bởi GPIO18 để tắt MP2482 trong chế độ pin backup.
- **Diode**: Catch diode trên module bảo vệ khi off-state.
- **Input capacitor**: Giảm surge khi xe khởi động.

### Linh kiện phụ trợ

1. **Inductor (22–33 µH)**: Shielded, 5–6 A rating, giảm nhiễu cho SIM7600CE-T.
2. **Output capacitor**: 220 µF low-ESR + 10 µF ceramic để xử lý tải biến thiên.
3. **Input capacitor**: 100 µF, 50 V để lọc nguồn 12/24 V.
4. **RC snubber (R = 1Ω, C = 1 nF)**: Nếu cần để ổn định loop.

### Tính toán

- **Duty cycle**: D = 5 / Vin ⇒ D_12 ≈ 0.417, D_24 ≈ 0.208.
- **Ripple current**: ΔI_L = (Vin - Vout) × D / (L × f). Với L = 33 µH, f = 500 kHz ⇒ ΔI ≈ 0.9 A.
- **Công suất tỏa**: P_loss ≈ (1 - η) × (5 V × 5 A) ≈ 1.5 W tại hiệu suất 90% → cần tản nhiệt trên module hoặc heatsink nhẹ.

### Module vs IC rời

- **Module MP2482**: Tích hợp hoàn chỉnh (coil, diode, MOSFET) → dễ dùng, có EN pin.
- **IC rời (MP2482 chip)**: Dành cho PCB custom, cần layout tight và gate resistors.
- **Thiết kế**: Luôn để đường tín hiệu EN → dễ tắt khi firmware phát hiện LVD.

### Nơi mua

- Shopee/Lazada: Tìm `MP2482 buck module 5V 5A`.
- Aliexpress/DigiKey: Tìm `MP2482 constant voltage buck`.
- Các module phổ biến kèm coil 5A, dễ hàn vào bo mạch.

> **Ghi chú legacy**: Tài liệu cũ dùng LM2596/MT3608/IP2312/relay/MOSFET; những tên này chỉ còn để so sánh, không phải kiến trúc runtime hiện tại.
