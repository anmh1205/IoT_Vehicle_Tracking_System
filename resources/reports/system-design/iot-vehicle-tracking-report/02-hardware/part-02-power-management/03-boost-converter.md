## III.1.8 Mạch Boost DC-DC: 3.0–4.2V → 5V (SX1308)

### Tổng Quan

Boost converter dùng để giữ 5V bus khi ắc quy xe bị ngắt, tận dụng pin 18650 1S. Thiết kế runtime hiện tại dựa vào **SX1308** (input 3.0–4.4V, output 5V ±4%, 2A), sau đó đưa qua **diode OR** để hòa cùng MP2482.

### Yêu Cầu

| Thông Số        | Giá Trị                            |
| --------------- | ---------------------------------- |
| **Input**       | 3.0–4.2 V (pin 18650 1S)           |
| **Output**      | 5 V ±4%                            |
| **Dòng tối đa** | ≥ 2.5 A (đảm bảo đủ cho ESP32 + modem)
| **Hiệu suất**   | > 90% ở dải hoạt động                |
| **Điều khiển**  | Enable pin (GPIO) để bật khi cần    |

### Lý do cần boost

- Pin 18650 1S có điện áp 3.0–4.2V, không đủ cho ESP32 + modem nên cần nâng lên 5V.
- Trạng thái low-voltage ắc quy yêu cầu pin backup tự chuyển nguồn mà không dùng relay/MOSFET; SX1308 + diode OR đáp ứng được.
- Firmware chỉ bật boost khi GPIO18 tắt MP2482 và siêu tụ, diode OR đảm bảo 5V bus không chạm nhau.

### Lựa chọn IC: SX1308

- Input rộng 2.5–5.5 V, phù hợp với pin 18650 1S.
- Đầu ra 5V, dòng tối đa 2.5 A đủ cho tải.
- Enable pin cho phép MCU (qua diode OR logic) kiểm soát trạng thái.
- Có protections (overcurrent, thermal) trên module phổ thông.

### Mạch tham chiếu

```
18650 1S ──┬── C_INPUT (100µF, 10V) ──┬── SX1308 ──┬── L (22µH, 2–3A) ──┬── 5V bus (qua diode OR)
           │                            │            │                    │
           └── GND                      │            └── D_SW (Schottky) ─┘
                                        │
                                        └── C_OUTPUT (220µF, 10V)
```

- **Enable**: Module bật khi MP2482 bị tắt, diode OR cho phép 5V từ SX1308 hòa vào bus.
- **Diode**: Schottky bảo vệ đầu ra, tránh hồi dòng.

### Linh kiện phụ trợ

1. **Inductor (22 µH, 3A)**: Shielded, chịu dòng 2.5 A liên tục.
2. **Output capacitor**: 220 µF low-ESR + 10 µF ceramic.
3. **Input capacitor**: 100 µF/10 V.
4. **Diode Schottky (1N5819)**: Kết nối 5V output với bus MP2482.

### Tính toán

- **Duty cycle**: D = 1 - (Vin / Vout) ≈ 1 - (3.7 / 5) ≈ 0.26.
- **Input current**: Iin ≈ Iout × (Vout / Vin) / η ≈ 2 A × (5 / 3.7) / 0.9 ≈ 3 A.
- **Power dissipation**: P_loss ≈ (1 - η) × P_out ≈ 0.1 × (5 V × 2 A) = 1 W → module cần tản nhiệt nhẹ.

### Khuyến nghị module

- Module SX1308 hoặc board tương đương có EN pin để firmware có thể bật/tắt khi chuyển sang pin backup.
- Diode OR 2× Schottky nối đầu ra SX1308 và MP2482 để không xảy ra loop giữa 2 converter.

> **Ghi chú legacy:** Tài liệu cũ nói MT3608; phiên bản runtime hiện tại dùng SX1308 và diode OR.
