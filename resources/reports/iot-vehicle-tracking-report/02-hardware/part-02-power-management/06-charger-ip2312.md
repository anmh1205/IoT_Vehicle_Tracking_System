## III.1.9 Mạch Sạc và Bảo Vệ Pin 21700: IP2312

### Tổng Quan

**IP2312** là IC sạc Li-ion với dòng sạc cao (3A), được sử dụng để sạc pin 21700 khi xe chạy.

### Đặc Tính Kỹ Thuật

| Thông Số        | Giá Trị                                                         |
| --------------- | --------------------------------------------------------------- |
| **IC**          | IP2312 (Injoinic)                                               |
| **Dòng sạc**    | 3 A (3000 mA) - có thể điều chỉnh                               |
| **Điện áp vào** | 4.5–5.5 V (USB Type-C hoặc 5V từ buck)                          |
| **Điện áp ra**  | 4.2 V (Li-ion standard)                                         |
| **Hiệu suất**   | ~85–90%                                                         |
| **Package**     | QFN-16 hoặc SOP-16                                              |
| **Tính năng**   | Tự ngắt khi đầy, bảo vệ quá dòng, quá nhiệt, reverse protection |

### Lý Do Chọn IP2312

#### 1. Dòng Sạc Cao (3A)

- Sạc pin 5000 mAh nhanh hơn (~2 giờ thay vì 6 giờ với 1A)
- Phù hợp với yêu cầu sạc nhanh

#### 2. Phổ Biến ở Việt Nam

- Dễ mua trên Shopee, Lazada
- Module sẵn có, không cần thiết kế PCB riêng
- Giá hợp lý (~20,000–40,000 VNĐ)

#### 3. Module Sẵn Có

- Không cần thiết kế PCB riêng
- Tiết kiệm thời gian
- Dễ test và debug

#### 4. Type-C

- Dễ sử dụng, hiện đại
- Có thể sạc bằng USB Type-C (nếu cần)

#### 5. Tích Hợp Bảo Vệ

- Bảo vệ quá dòng sạc
- Bảo vệ quá nhiệt
- Reverse protection (bảo vệ khi cắm ngược)
- Tự ngắt khi pin đầy (4.2V)

### Chức Năng

#### 1. Sạc Pin 21700

- Dòng sạc: 3 A (khi IGN ON, U_batt > 12V)
- Điện áp sạc: 4.2 V (Li-ion standard)
- Thời gian sạc đầy: ~2 giờ (5000 mAh / 3A)

#### 2. Tự Ngắt Khi Đầy

- Khi pin đạt 4.2V → tự động ngắt sạc
- Bảo vệ pin khỏi quá sạc

#### 3. Bảo Vệ

- **Quá dòng sạc**: Tự động giảm dòng nếu quá nhiệt
- **Quá nhiệt**: Tự động ngắt sạc nếu nhiệt độ cao
- **Reverse protection**: Bảo vệ khi cắm ngược

### Kết Nối

#### Sơ Đồ Kết Nối

```
5V từ Buck ──┬── IP2312 Module ──┬── Protection Board ──┬── Pin 21700
             │                   │                      │
             └── GND             └── GND                └── GND

ESP32 GPIO ── R (10kΩ) ── IP2312 EN Pin
```

#### Điều Khiển từ ESP32

- **GPIO HIGH**: Charger enabled (sạc pin)
- **GPIO LOW**: Charger disabled (không sạc)

### Điều Kiện Sạc

- **IGN ON** + **U_batt > 12 V** → Enable charger
- **IGN OFF** → Disable charger (bảo vệ ắc quy)
- **U_batt < 12 V** → Disable charger (bảo vệ ắc quy)

### Mạch Bảo Vệ Pin (Protection Board)

#### Chức Năng Bảo Vệ

1. **Bảo vệ quá dòng xả**

   - Over-discharge protection: < 2.5V
   - Tự động ngắt khi pin yếu

2. **Bảo vệ quá áp**

   - Over-voltage protection: > 4.25V
   - Tự động ngắt khi quá sạc

3. **Bảo vệ ngắn mạch**

   - Short circuit protection
   - Tự động ngắt khi ngắn mạch

4. **Dòng xả tối đa**
   - 3A (phù hợp với pin 21700)
   - Đủ cho tracker + modem

#### Lựa Chọn Protection Board

**Option 1: BMS 1S 3A Module (Khuyến nghị)**

- Module sẵn có, dễ mua
- Giá: ~10,000–20,000 VNĐ
- Tích hợp sẵn protection
- Khuyến nghị cho đồ án

**Option 2: DW01 + MOSFET**

- IC bảo vệ phổ biến
- Cần thiết kế PCB riêng
- Phù hợp nếu thiết kế PCB custom

**Option 3: Tích Hợp Sẵn**

- Một số module sạc có tích hợp protection
- Kiểm tra trước khi mua

### Tính Toán Thời Gian Sạc

#### Thời Gian Sạc Lý Thuyết

```
Thời gian = Dung lượng / Dòng sạc
          = 5000 mAh / 3000 mA
          = 1.67 giờ
          = ~100 phút
```

#### Thời Gian Sạc Thực Tế

- **Hiệu suất sạc**: ~85–90% → thời gian thực tế lâu hơn
- **Dòng sạc giảm dần**: Khi gần đầy, dòng sạc giảm → thời gian lâu hơn
- **Ước tính thực tế**: ~2–2.5 giờ

### Nơi Mua Hàng

#### Trên Shopee/Lazada VN:

- Tìm: "IP2312 charger module", "sạc pin 1S 3A Type-C", "Li-ion charger 3A"
- Giá: ~20,000–40,000 VNĐ (module)
- Lưu ý: Chọn module có protection board tích hợp

#### Cửa Hàng Linh Kiện:

- Chipdientu.com.vn
- DKE.vn
- Linhkienfpt.vn

### Tài Liệu Tham Khảo

- **Datasheet**: IP2312 Datasheet (Injoinic)
- **Application Note**: IP2312 Design Guide
- **Protection IC**: DW01 Datasheet

### Kết Luận

IP2312 là lựa chọn phù hợp vì:

- ✅ Dòng sạc cao (3A) → sạc nhanh
- ✅ Phổ biến ở VN → dễ mua
- ✅ Module sẵn có → tiết kiệm thời gian
- ✅ Tích hợp bảo vệ → an toàn
- ✅ Phù hợp với yêu cầu đồ án

**Lưu ý quan trọng:**

- Luôn sử dụng protection board cho pin
- Chỉ sạc khi IGN ON và U_batt > 12V
- Monitor trạng thái sạc và gửi cảnh báo khi cần
