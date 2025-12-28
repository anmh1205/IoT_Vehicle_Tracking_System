## III.1.8 Mạch Boost DC-DC: 3.7V → 5V

### Tổng Quan

**Boost Converter** tăng điện áp từ 3.7V (pin 21700) lên 5V để cung cấp cho hệ thống khi ắc quy yếu.

### Yêu Cầu

| Thông Số        | Giá Trị                             |
| --------------- | ----------------------------------- |
| **Input**       | 3.0–4.2 V (từ pin 21700)            |
| **Output**      | 5 V                                 |
| **Dòng tối đa** | ≥ 2 A (đủ cho tracker khi dùng pin) |
| **Hiệu suất**   | >85%                                |
| **Ripple**      | <50 mV (peak-to-peak)               |

### Lý Do Cần Boost

- **Pin 21700**: 3.0–4.2 V (nominal 3.7 V)
- **Hệ thống cần**: 5 V (ESP32, modem, charger)
- **Giải pháp**: Boost converter 3.7V → 5V

### Lựa Chọn IC: MT3608

#### Đặc Tính

| Thông Số      | Giá Trị                    |
| ------------- | -------------------------- |
| **IC**        | MT3608 (Step-Up Converter) |
| **Input**     | 2–24 V                     |
| **Output**    | 5–28 V (adjustable) @ 2 A  |
| **Hiệu suất** | ~85%                       |
| **Package**   | SOT23-6 hoặc SOP-8         |
| **Giá IC**    | ~3,000–8,000 VNĐ           |

#### Lý Do Chọn MT3608

- ✅ **Phổ biến ở VN**: IC và linh kiện dễ mua
- ✅ **Thiết kế PCB**: Có thể tích hợp vào PCB tự vẽ
- ✅ **Giá rẻ**: IC ~3,000–8,000 VNĐ + linh kiện ~15,000 VNĐ
- ✅ **Đủ công suất**: 2A đủ cho tracker khi dùng pin
- ✅ **Kích thước nhỏ**: Package SOT23-6 → rất nhỏ gọn

### Sơ Đồ Mạch

```
3.7V Input ──┬── C1 (100µF, 16V) ──┬── MT3608 ──┬── L1 (22µH, 2-3A) ──┬── 5V Output
             │                     │            │                     │
             └── GND               └── GND      └── D1 (Schottky) ────┘
                                                      │
                                                      └── C2 (220µF, 16V) ── GND
                                                      │
                                                      └── R1, R2 (10kΩ) ── Feedback
```

### Linh Kiện Phụ Trợ

#### 1. Inductor (L1)

- **Giá trị**: 22 µH
- **Dòng tối đa**: 2–3 A
- **Loại**: Shielded inductor
- **Giá**: ~8,000–12,000 VNĐ

#### 2. Input Capacitor (C1)

- **Giá trị**: 100 µF, 16 V
- **Loại**: Electrolytic
- **Mục đích**: Lọc nhiễu input
- **Giá**: ~2,000 VNĐ

#### 3. Output Capacitor (C2)

- **Giá trị**: 220 µF, 16 V
- **Loại**: Electrolytic
- **Mục đích**: Lọc ripple
- **Giá**: ~3,000 VNĐ

#### 4. Feedback Resistors (R1, R2)

- **R1, R2**: 10 kΩ (cho 5V output)
- **Công thức**: Vout = 0.6V × (1 + R1/R2)
- **Giá**: ~1,000 VNĐ

### Tính Toán

#### 1. Duty Cycle

```
D = 1 - (Vin / Vout)
  = 1 - (3.7V / 5V)
  = 0.26 (26%)
```

#### 2. Output Current vs Input Current

```
Iin = Iout × (Vout / Vin) / η
    = 2A × (5V / 3.7V) / 0.85
    = 3.18 A

→ Pin cần cung cấp 3.18A khi output 2A
```

### Module vs IC Rời

#### Option 1: Module MT3608 (Khuyến nghị cho đồ án)

**Ưu điểm:**

- ✅ Dễ mua trên Shopee/Lazada
- ✅ Đã có sẵn linh kiện phụ trợ
- ✅ Dễ test và debug
- ✅ Giá: ~10,000–15,000 VNĐ

**Nhược điểm:**

- ⚠️ Kích thước lớn hơn

#### Option 2: IC Rời + Linh Kiện

**Ưu điểm:**

- ✅ Kích thước nhỏ hơn (SOT23-6)
- ✅ Chuyên nghiệp hơn

**Nhược điểm:**

- ⚠️ Cần thiết kế PCB

**Khuyến nghị:** Dùng module cho đồ án.

### Nơi Mua Hàng

#### Trên Shopee/Lazada VN:

- Tìm: "MT3608 module", "boost converter 3.7V 5V", "step up 3.7V 5V"
- Giá: ~10,000–15,000 VNĐ (module)

#### IC Rời:

- Tìm: "MT3608 IC", "MT3608 boost"
- Giá: ~3,000–8,000 VNĐ (IC)

### Tài Liệu Tham Khảo

- **Datasheet**: MT3608 Datasheet
- **Application Note**: MT3608 Design Guide

### Kết Luận

MT3608 là lựa chọn phù hợp vì:

- ✅ Phổ biến, dễ mua
- ✅ Giá rẻ
- ✅ Đủ công suất (2A)
- ✅ Kích thước nhỏ
- ✅ Phù hợp với yêu cầu đồ án

**Khuyến nghị:** Dùng module MT3608 cho đồ án.
