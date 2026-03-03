## III.1.8 Mạch Buck DC-DC: 12V/24V → 5V
### Tổng Quan

**Buck Converter** giảm điện áp từ 12V hoặc 24V (ắc quy xe) xuống 5V để cung cấp cho ESP32, modem, và charger.

### Yêu Cầu

| Thông Số        | Giá Trị                               |
| --------------- | ------------------------------------- |
| **Input**       | 12 V DC hoặc 24 V DC (từ ắc quy xe)      |
| **Output**      | 5 V                                      |
| **Dòng tối đa** | ≥ 3.5 A (đủ cho tracker + sạc pin 3A)    |
| **Hiệu suất**   | >85%                                     |
| **Ripple**      | <50 mV (peak-to-peak)                    |
| **Triển khai**  | Dùng chung một buck cho cả profile 12V/24V |

### Lý Do Chọn 5V

- **ESP32**: Cần 3.3V (qua LDO từ 5V)
- **A7670C + NEO-M8N**: Tạo rail 3.8V cho modem LTE và 3.3V cho GNSS/logic qua tầng nguồn phía sau
- **Charger IP2312**: Input 5V
- **Đơn giản hóa**: Chỉ cần 1 buck converter 5V → không cần nhiều converter

### Lựa Chọn IC: LM2596

#### Đặc Tính

| Thông Số      | Giá Trị                                            |
| ------------- | -------------------------------------------------- |
| **IC**        | LM2596-5.0 (Fixed 5V) hoặc LM2596-ADJ (Adjustable) |
| **Input**     | 7–40 V                                             |
| **Output**    | 5 V @ 3 A (fixed) hoặc 1.23–37 V (adjustable)      |
| **Hiệu suất** | ~85%                                               |
| **Package**   | TO-220-5 hoặc DDPAK                                |
| **Giá IC**    | ~5,000–10,000 VNĐ                                  |

#### Lý Do Chọn LM2596

- ✅ **Phổ biến ở VN**: IC và linh kiện dễ mua
- ✅ **Thiết kế PCB**: Có thể tích hợp vào PCB tự vẽ
- ✅ **Giá rẻ**: IC ~5,000–10,000 VNĐ + linh kiện ~20,000 VNĐ
- ✅ **Đủ công suất**: 3A đủ cho tracker + sạc pin
- ✅ **Kích thước nhỏ**: Tích hợp vào PCB → gọn hơn module

### Sơ Đồ Mạch

```
12V/24V Input ──┬── C1 (100µF, 50V) ──┬── LM2596 ──┬── L1 (100µH, 3-5A) ──┬── 5V Output
            │                     │            │                      │
            └── GND               └── GND      └── D1 (1N5822) ───────┘
                                                      │
                                                      └── C2 (220µF, 16V) ── GND
```

### Linh Kiện Phụ Trợ

#### 1. Inductor (L1)

- **Giá trị**: 100 µH
- **Dòng tối đa**: 3–5 A
- **Loại**: Shielded inductor (giảm nhiễu)
- **Giá**: ~10,000–15,000 VNĐ

#### 2. Input Capacitor (C1)

- **Giá trị**: 100 µF, 50 V
- **Loại**: Electrolytic hoặc Tantalum
- **Mục đích**: Lọc nhiễu input, cung cấp dòng peak
- **Giá**: ~3,000 VNĐ

#### 3. Output Capacitor (C2)

- **Giá trị**: 220 µF, 16 V
- **Loại**: Electrolytic
- **Mục đích**: Lọc ripple, cung cấp dòng peak
- **Giá**: ~3,000 VNĐ

#### 4. Diode (D1)

- **Loại**: 1N5822 (Schottky, 3A, 40V)
- **Mục đích**: Freewheeling diode
- **Giá**: ~2,000 VNĐ

#### 5. Bootstrap Capacitor (C3)

- **Giá trị**: 10 µF, 16 V
- **Mục đích**: Bootstrap cho internal regulator
- **Giá**: ~1,000 VNĐ

### Tính Toán

#### 1. Duty Cycle theo profile điện áp vào

```
D = Vout / Vin

Profile 12V:
D_12 = 5V / 12V = 0.417 (41.7%)

Profile 24V:
D_24 = 5V / 24V = 0.208 (20.8%)
```

Buck LM2596 cần vận hành ổn định ở cả 2 điểm làm việc 12V và 24V.

#### 2. Ripple Current

```
ΔIL = (Vin - Vout) × D / (L × f)
    = (12V - 5V) × 0.417 / (100µH × 150kHz)
    = 19.4 A (quá cao!)

→ Cần tăng L hoặc f, hoặc chấp nhận ripple cao hơn
```

**Khuyến nghị:** Sử dụng giá trị từ datasheet hoặc tính toán tool.

#### 3. Power Dissipation

```
P_loss = (1 - η) × P_out
        = (1 - 0.85) × (5V × 3A)
        = 2.25 W

→ Cần heat sink nếu công suất cao
```

### Module vs IC Rời

#### Option 1: Module LM2596 (Khuyến nghị cho đồ án)

**Ưu điểm:**

- ✅ Dễ mua trên Shopee/Lazada
- ✅ Đã có sẵn linh kiện phụ trợ
- ✅ Dễ test và debug
- ✅ Giá: ~15,000–25,000 VNĐ

**Nhược điểm:**

- ⚠️ Kích thước lớn hơn
- ⚠️ Ít chuyên nghiệp hơn

#### Option 2: IC Rời + Linh Kiện

**Ưu điểm:**

- ✅ Kích thước nhỏ hơn
- ✅ Chuyên nghiệp hơn
- ✅ Tích hợp vào PCB

**Nhược điểm:**

- ⚠️ Cần thiết kế PCB
- ⚠️ Phức tạp hơn

**Khuyến nghị:** Dùng module cho đồ án, IC rời cho production.

### Thiết Kế PCB (Nếu dùng IC rời)

#### Layout

- **Power traces**: Dày ít nhất 0.5 mm cho dòng 3A
- **Ground plane**: Tạo ground plane lớn
- **Decoupling**: Đặt capacitor gần IC (10–100 µF)
- **Thermal**: Thêm thermal via cho IC
- **Inductor**: Đặt xa phần nhạy cảm (ADC, analog)

#### Kích Thước

- **PCB 2 lớp**: Đủ cho mạch này
- **Kích thước**: ~20×30 mm (ước tính)

### Nơi Mua Hàng

#### Trên Shopee/Lazada VN:

- Tìm: "LM2596 module", "buck converter 12V 5V", "buck converter 24V 5V", "step down 12V 5V"
- Giá: ~15,000–25,000 VNĐ (module)
- Lưu ý: Chọn module có heat sink nếu công suất cao

#### IC Rời:

- Tìm: "LM2596 IC", "LM2596-5.0"
- Giá: ~5,000–10,000 VNĐ (IC)
- Linh kiện phụ trợ: ~20,000 VNĐ

### Tài Liệu Tham Khảo

- **Datasheet**: LM2596 Datasheet (Texas Instruments)
- **Application Note**: AN-1247 - LM2596 Design Guide
- **Calculator**: TI Webench Designer

### Kết Luận

LM2596 là lựa chọn phù hợp vì:

- ✅ Phổ biến, dễ mua
- ✅ Giá rẻ
- ✅ Đủ công suất (3A)
- ✅ Hiệu suất tốt (~85%)
- ✅ Phù hợp với yêu cầu đồ án

**Khuyến nghị:** Dùng module LM2596 cho đồ án (dễ test, giá rẻ).
