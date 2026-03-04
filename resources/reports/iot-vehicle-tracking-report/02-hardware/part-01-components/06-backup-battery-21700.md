## III.1.6 Pin Dự Phòng: 21700 Li-ion 5000 mAh

### Tổng Quan

**21700 Li-ion** là pin dự phòng được sử dụng để cung cấp nguồn cho tracker khi ắc quy xe yếu, đảm bảo hệ thống tiếp tục hoạt động.

### Đặc Tính Kỹ Thuật

| Thông Số            | Giá Trị                                     |
| ------------------- | ------------------------------------------- |
| **Loại**            | Li-ion 21700                                |
| **Dung lượng**      | 5000 mAh @ 3.7 V                            |
| **Năng lượng**      | ~18.5 Wh (5000 mAh × 3.7 V)                 |
| **Cấu hình**        | 1 cell đơn                                  |
| **Điện áp**         | 3.0–4.2 V (nominal 3.7 V)                   |
| **Dòng xả tối đa**  | 3–5 A (tùy cell)                            |
| **Dòng sạc tối đa** | 3 A (khuyến nghị)                           |
| **Số chu kỳ**       | 500–1000 chu kỳ (80% capacity)              |
| **Giá**             | ~100,000–200,000 VNĐ (kèm protection board) |

### Lý Do Chọn 21700 5000 mAh

#### 1. Đơn Giản

- Chỉ 1 cell đơn → không cần BMS phức tạp
- Dễ lắp đặt và bảo trì
- Chi phí thấp

#### 2. Dung Lượng Đủ

- 5000 mAh → đủ cho vài ngày hoạt động ở chế độ heartbeat
- Với heartbeat 10–30 phút, có thể hoạt động 3–5 ngày
- Đủ cho backup khi ắc quy yếu

#### 3. Phổ Biến

- Cell 21700 phổ biến, giá tốt
- Dễ mua trên Shopee, Lazada
- Nhiều thương hiệu: Samsung, LG, Panasonic, etc.

#### 4. BMS Đơn Giản

- Chỉ cần protection board đơn giản (1S)
- BMS 1S 3A giá rẻ (~10,000–20,000 VNĐ)
- Hoặc DW01 + MOSFET (nếu thiết kế PCB riêng)

### Chức Năng Trong Hệ Thống

#### 1. Cung Cấp Nguồn Backup

- Khi ắc quy yếu (U_batt < ngưỡng cấu hình), pin cấp nguồn cho toàn hệ thống
- Đảm bảo tracker tiếp tục hoạt động
- Gửi cảnh báo khi chuyển sang pin

#### 2. Được Sạc Khi Xe Chạy

- Khi IGN ON và U_batt > ngưỡng cấu hình → sạc pin
- Dòng sạc: 3 A (module IP2312)
- Thời gian sạc đầy: ~2 giờ (5000 mAh / 3 A)

#### 3. Không Sạc Khi Xe Đỗ

- Khi IGN OFF → không sạc pin
- Bảo vệ ắc quy khỏi rút cạn quá mức
- Tiết kiệm năng lượng ắc quy

### Tính Toán Thời Gian Hoạt Động

#### Chế Độ Heartbeat (IGN OFF)

**Giả định:**

- Dung lượng pin: 5000 mAh
- Điện áp: 3.7 V (nominal)
- Tiêu thụ khi active: ~200 mA (ESP32 + modem + GNSS)
- Thời gian active mỗi heartbeat: 30 giây
- Heartbeat interval: 20 phút (1200 giây)

**Tính toán:**

- Tiêu thụ mỗi heartbeat: 200 mA × 30s = 6000 mAs = 1.67 mAh
- Tiêu thụ khi sleep: ~15 μA (ESP32 deep sleep) ≈ 0 mAh
- Tiêu thụ trung bình: 1.67 mAh / 20 phút = 0.0835 mAh/phút = 5.01 mAh/giờ
- Thời gian hoạt động: 5000 mAh / 5.01 mAh/giờ = **~998 giờ = ~41 ngày**

**Kết luận:** Pin 5000 mAh đủ cho ~40 ngày hoạt động ở chế độ heartbeat.

#### Chế Độ Cảnh Báo (Motion Detected)

**Giả định:**

- Tiêu thụ khi active: ~200 mA
- Thời gian hoạt động: 2–4 giờ

**Tính toán:**

- Tiêu thụ: 200 mA × 4 giờ = 800 mAh
- Còn lại: 5000 mAh - 800 mAh = 4200 mAh
- Vẫn đủ cho nhiều lần cảnh báo

### Mạch Bảo Vệ Pin (Protection Board)

#### Chức Năng Bảo Vệ

1. **Bảo vệ quá dòng xả**

   - Over-discharge protection: < 2.5 V
   - Tự động ngắt khi pin yếu

2. **Bảo vệ quá áp**

   - Over-voltage protection: > 4.25 V
   - Tự động ngắt khi sạc đầy

3. **Bảo vệ ngắn mạch**

   - Short circuit protection
   - Tự động ngắt khi ngắn mạch

4. **Dòng xả tối đa**
   - 3 A (phù hợp với pin 21700)
   - Đủ cho tracker + modem

#### Lựa Chọn Protection Board

**Option 1: BMS 1S 3A Module**

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

### Sạc Pin

#### Module Sạc IP2312

Xem chi tiết trong file: [`06-charger-ip2312.md`](../part-02-power-management/06-charger-ip2312.md)

**Tóm tắt:**

- **IC**: IP2312 (Injoinic)
- **Dòng sạc**: 3 A (3000 mA)
- **Điện áp vào**: 5 V (từ buck converter)
- **Điện áp ra**: 4.2 V (Li-ion standard)
- **Hiệu suất**: ~85–90%
- **Tự ngắt khi đầy**: ✅

#### Điều Kiện Sạc

- **IGN ON** + **U_batt >= IGN_ON theo profile** → Enable charger
- **IGN OFF** → Disable charger (bảo vệ ắc quy)
- **U_batt <= Switch_OFF theo profile** → Disable charger (bảo vệ ắc quy)

Ngưỡng mặc định:

- **Profile 12V**: `IGN_ON>=13.0V`, `Switch_OFF=12.0V`
- **Profile 24V**: `IGN_ON>=26.0V`, `Switch_OFF=24.0V`

#### Thời Gian Sạc

- Dung lượng: 5000 mAh
- Dòng sạc: 3 A
- Thời gian sạc đầy: 5000 mAh / 3 A = **~1.67 giờ = ~100 phút**

**Lưu ý:** Thời gian thực tế có thể lâu hơn do hiệu suất sạc và dòng sạc giảm dần khi gần đầy.

### Kết Nối

#### Sơ Đồ Kết Nối

```
Pin 21700 ── Protection Board ──┬── Boost Converter (3.7V→5V)
                                 │
                                 └── Charger (IP2312) ← 5V từ Buck
```

#### Lưu Ý

- **Polarity**: Đảm bảo cực dương/cực âm đúng
- **Protection Board**: Luôn sử dụng protection board để bảo vệ pin
- **Charging**: Chỉ sạc khi IGN ON và U_batt đạt `IGN_ON` theo profile (12V: `>=13.0V`, 24V: `>=26.0V`)

### Nơi Mua Hàng

#### Trên Shopee/Lazada VN:

- Tìm: "21700 5000mAh", "Li-ion 21700", "pin 21700"
- Giá: ~100,000–200,000 VNĐ (kèm protection board)
- Lưu ý: Chọn pin chính hãng (Samsung, LG, Panasonic) hoặc clone chất lượng tốt

#### Cửa Hàng Linh Kiện:

- Chipdientu.com.vn
- DKE.vn
- Linhkienfpt.vn

### An Toàn

#### 1. Bảo Vệ Quá Nhiệt

- Không sạc khi nhiệt độ > 45°C
- Không xả khi nhiệt độ > 60°C
- Monitor nhiệt độ pin (nếu có)

#### 2. Bảo Vệ Quá Dòng

- Sử dụng protection board với current limit
- Không vượt quá dòng xả tối đa (3–5 A)

#### 3. Bảo Vệ Quá Áp

- Không sạc quá 4.2 V
- Sử dụng charger có tự ngắt khi đầy

#### 4. Bảo Vệ Ngắn Mạch

- Protection board tự động ngắt khi ngắn mạch
- Kiểm tra kết nối trước khi sử dụng

### Tài Liệu Tham Khảo

- **Datasheet**: Samsung 21700, LG 21700, Panasonic 21700
- **Protection IC**: DW01 Datasheet
- **Charging**: Li-ion Charging Guide

### Kết Luận

Pin 21700 5000 mAh là lựa chọn phù hợp vì:

- ✅ Đơn giản (1 cell đơn)
- ✅ Dung lượng đủ (~40 ngày heartbeat)
- ✅ Phổ biến, giá tốt
- ✅ BMS đơn giản (1S)
- ✅ Dễ lắp đặt và bảo trì

**Lưu ý quan trọng:**

- Luôn sử dụng protection board
- Chỉ sạc khi IGN ON và U_batt đạt ngưỡng `IGN_ON` theo profile
- Nếu U_batt giảm xuống `<= Switch_OFF` theo profile thì tắt sạc để bảo vệ ắc quy
- Monitor trạng thái pin và gửi cảnh báo khi yếu
