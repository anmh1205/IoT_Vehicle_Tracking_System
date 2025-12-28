## III.3 Danh Sách Vật Liệu (BOM)

### Tổng Quan

Danh sách vật liệu (Bill of Materials - BOM) cho hệ thống tracker, bao gồm tất cả các thành phần phần cứng cần thiết.

### BOM Chi Tiết

| STT | Thành Phần                      | Đơn Vị   | SL  | Giá Ước Tính (VNĐ) | Ghi Chú                                    |
| --- | ------------------------------- | -------- | --- | ------------------ | ------------------------------------------ |
| 1   | ESP32-S3 DevKit                 | Cái      | 1   | 100,000–200,000    | ESP32-S3-DevKitC-1 hoặc DevKitM-1          |
| 2   | LIS3DH                          | Cái      | 1   | 20,000–50,000      | Breakout board hoặc IC riêng               |
| 3   | OBD2 BLE (vgate iCar Pro)       | Cái      | 1   | 150,000–300,000    | BLE 4.0, tương thích với ESP32-S3          |
| 4   | Modem 4G + GNSS (A7600CE‑T)     | Cái      | 1   | 300,000–500,000    | Kèm LTE antenna + GNSS antenna + SIM       |
| 5   | 21700 Li-ion 5000mAh            | Cái      | 1   | 100,000–200,000    | Loại có protection board                   |
| 6   | Module sạc IP2312 (3A)          | Cái      | 1   | 20,000–40,000      | IP2312 charger module Type-C, 3A            |
| 7   | BMS/Protection Board 1S         | Cái      | 1   | 10,000–20,000      | BMS 1S 3A hoặc DW01+MOSFET                 |
| 8   | Buck DC-DC (12→5V, 3A)          | Cái      | 1   | 15,000–25,000      | LM2596 module (khuyến nghị)                 |
| 9   | Boost DC-DC (3.7→5V, 2A)        | Cái      | 1   | 10,000–15,000      | MT3608 module (khuyến nghị)                 |
| 10  | Relay Module 5V 1-channel       | Cái      | 1   | 5,000–10,000       | Điều khiển chuyển nguồn (Power MUX)        |
| 11  | Resistor (10kΩ, 2.2kΩ, etc.)    | Gói      | 1   | 5,000–10,000       | Voltage divider, pull-up/down              |
| 12  | Capacitor (100µF, 220µF, etc.)  | Gói      | 1   | 5,000–10,000       | Decoupling, filtering                      |
| 13  | Diode (Schottky 1N5822)         | Cái      | 2   | 2,000–5,000        | Diode OR backup                            |
| 14  | Connector (Terminal, Header)    | Gói      | 1   | 10,000–20,000      | Kết nối dây, header pin                    |
| 15  | PCB (nếu tự thiết kế)            | Cái      | 1   | 50,000–100,000     | PCB 2 lớp, kích thước ~50×50 mm            |
| 16  | Vỏ bảo vệ (Optional)            | Cái      | 1   | 50,000–100,000     | Vỏ nhựa hoặc kim loại                      |
| 17  | Dây nối, cáp                    | Mét      | -   | 20,000–30,000      | Dây điện, cáp USB, etc.                    |
| 18  | Linh kiện phụ trợ khác          | -        | -   | 20,000–30,000      | Fuse, switch, LED, etc.                    |

### Tổng Chi Phí Ước Tính

| Hạng Mục              | Chi Phí (VNĐ)      |
| --------------------- | ------------------ |
| **Thành phần chính**  | 670,000–1,250,000  |
| **Power management**  | 50,000–80,000      |
| **Linh kiện phụ trợ** | 50,000–100,000     |
| **PCB (nếu tự thiết kế)** | 50,000–100,000  |
| **Vỏ bảo vệ (Optional)** | 50,000–100,000 |
| **Tổng cộng**         | **870,000–1,630,000** |

### Lưu Ý

#### 1. Giá Cả

- Giá trên là ước tính dựa trên thị trường Việt Nam (Shopee, Lazada, cửa hàng linh kiện)
- Giá có thể thay đổi tùy theo thời điểm và nguồn mua
- Nên mua từ nhiều nguồn để so sánh giá

#### 2. Lựa Chọn Module vs IC Rời

**Khuyến nghị cho đồ án:**
- ✅ Dùng **module** cho tất cả (dễ test, giá rẻ)
- ⚠️ Chỉ dùng **IC rời** nếu thiết kế PCB riêng

**Lợi ích dùng module:**
- Dễ mua, dễ test
- Tiết kiệm thời gian
- Giá hợp lý
- Phù hợp đồ án

#### 3. Nơi Mua Hàng

**Trên Shopee/Lazada:**
- Tìm theo tên module/IC
- So sánh giá và review
- Chọn seller uy tín

**Cửa hàng linh kiện:**
- Chipdientu.com.vn
- DKE.vn
- Linhkienfpt.vn
- Cửa hàng linh kiện địa phương

#### 4. Tối Ưu Chi Phí

**Có thể tiết kiệm:**
- Mua combo/package (nhiều linh kiện cùng lúc)
- Mua từ seller có discount
- Tái sử dụng linh kiện từ project cũ (nếu có)

**Không nên tiết kiệm:**
- Protection board cho pin (an toàn)
- Chất lượng module/IC (độ tin cậy)
- Antenna cho modem (hiệu suất)

### BOM Theo Nhóm

#### Nhóm 1: Vi Điều Khiển và Cảm Biến

- ESP32-S3 DevKit
- LIS3DH breakout board

#### Nhóm 2: Giao Tiếp

- OBD2 BLE adapter (vgate iCar Pro)
- Modem 4G/GNSS (A7600CE-T)
- SIM card (data plan)

#### Nhóm 3: Nguồn và Pin

- Pin 21700 5000mAh
- Protection board 1S
- Charger module IP2312

#### Nhóm 4: Power Management

- Buck converter LM2596 (12V→5V)
- Boost converter MT3608 (3.7V→5V)
- Relay module 5V

#### Nhóm 5: Linh Kiện Phụ Trợ

- Resistor, capacitor, diode
- Connector, header pin
- Dây nối, cáp

#### Nhóm 6: Vỏ và Bảo Vệ (Optional)

- Vỏ bảo vệ
- Gioăng chống nước (nếu cần)
- Mounting bracket

### Checklist Mua Hàng

#### Trước Khi Mua

- [ ] Xác định ngân sách
- [ ] Liệt kê tất cả thành phần cần thiết
- [ ] So sánh giá từ nhiều nguồn
- [ ] Kiểm tra tương thích giữa các thành phần

#### Khi Mua

- [ ] Chọn seller uy tín (rating cao, nhiều review)
- [ ] Kiểm tra thông số kỹ thuật trước khi mua
- [ ] Mua thêm một số linh kiện dự phòng (resistor, capacitor)
- [ ] Lưu hóa đơn để bảo hành

#### Sau Khi Nhận Hàng

- [ ] Kiểm tra số lượng và chất lượng
- [ ] Test từng module trước khi lắp ráp
- [ ] Lưu trữ cẩn thận (tránh ẩm, tĩnh điện)

### Tài Liệu Tham Khảo

- **Datasheet**: Xem trong từng file component
- **Application Note**: Xem trong từng file component
- **Shopping Guide**: Shopee, Lazada search tips

### Kết Luận

**Tổng chi phí ước tính: 870,000–1,630,000 VNĐ**

**Khuyến nghị:**
- Bắt đầu với module để test nhanh
- Sau đó có thể thiết kế PCB riêng nếu cần
- Mua từ nhiều nguồn để so sánh giá

**Lưu ý:** Chi phí có thể giảm nếu:
- Tái sử dụng linh kiện từ project cũ
- Mua combo/package
- Không cần vỏ bảo vệ (prototype)
