## PHẦN VI: TÍNH TOÁN NĂNG LƯỢNG

### VI.1 Thông Số Pin và Sạc

**Pin 18650 1S:**

- Dung lượng: **5,000 mAh @ 3.7 V** (≈ 18.5 Wh)
- Điện áp: 3.0–4.2 V (nominal 3.7 V)

**Sạc Pin (Module TP4056):**

- Dòng sạc: theo cấu hình điện trở PROG của module
- Sạc theo chu trình CC/CV, tự giảm dòng khi tiến gần ngưỡng đầy
- Thời gian sạc: phụ thuộc dòng cấu hình, dung lượng pin và điều kiện nhiệt

**Lưu ý:**

- Thời gian sạc có thể thay đổi tùy trạng thái pin (pin cạn sẽ sạc nhanh hơn ở giai đoạn đầu, chậm lại khi gần đầy)
- Dòng sạc phụ thuộc cấu hình PROG và điều kiện nhiệt của module TP4056
- Cần chọn dòng sạc phù hợp để cân bằng thời gian sạc và nhiệt độ mạch

### VI.2 Tiêu Thụ Năng Lượng Theo Chế Độ

#### Chế Độ 1: Lái Xe (IGN ON)

**Thành phần tiêu thụ:**

- ESP32-S3 (active): ~80–120 mA
- Bluetooth Classic (OBD2): ~30–50 mA
- SIM7600CE-T (LTE + GNSS tích hợp hoạt động cùng lúc): ~80–150 mA (mức hệ thống tham chiếu)
- LIS3DH (IMU): ~0.1 mA
- Mạch phụ trợ: ~10–20 mA
- **Sạc pin**: theo dòng cấu hình TP4056 (từ ắc quy qua bus 5V)

**Tổng tiêu thụ từ ắc quy:**

- Tracker: ~200–320 mA
- Sạc pin: theo cấu hình TP4056
- **Tổng**: phụ thuộc dòng sạc cấu hình + tải tracker

**Gửi vị trí mỗi 5–30 giây:**

- Dòng trung bình tracker: ~250 mA
- Dòng sạc: theo cấu hình TP4056
- **Tổng**: phụ thuộc dòng sạc cấu hình tại thời điểm gửi dữ liệu

#### Chế Độ 2: Đỗ Xe (IGN OFF, Heartbeat)

**Thành phần tiêu thụ:**

- ESP32 deep sleep: ~10–15 μA (0.01–0.015 mA)
- Modem sleep: <1 mA
- LIS3DH (low-power): ~0.01 mA
- Mạch phụ trợ: ~1–2 mA

**Thức dậy mỗi 10–30 phút:**

- Thời gian active: ~10–20 giây (bật modem, lấy GPS, gửi heartbeat)
- Dòng khi active: ~200–250 mA
- Dòng khi sleep: ~2–3 mA

**Dòng trung bình (heartbeat 15 phút):**

- Active 15s/15phút: I_avg = (250 × 15 + 3 × 885) / 900 ≈ **7.2 mA**
- **Ước tính: ~5–10 mA trung bình**

#### Chế Độ 3: Cảnh Báo (Security/Tow Alarm)

- Tương tự chế độ 1 nhưng không sạc pin
- Dòng tiêu thụ: ~200–320 mA
- Hoạt động liên tục 2–4 giờ

### VI.3 Thời Gian Hoạt Động từ Pin 18650 1S (Backup Mode)

**Khi ắc quy thấp hơn ngưỡng `Switch_OFF` theo profile, tracker chuyển sang pin:**

#### Trường Hợp 1: Heartbeat 15 Phút (Chế Độ Đỗ Xe)

- Dòng trung bình: ~7 mA
- Dung lượng pin: 5,000 mAh (hiệu quả ~4,500 mAh sau tổn hao)

**Tính toán:**

- T = 4,500 mAh / 7 mA ≈ 643 giờ ≈ **26.8 ngày**

**Thực tế: ~20–25 ngày** (tính tổn hao, nhiệt độ, aging pin).

#### Trường Hợp 2: Heartbeat 30 Phút

- Dòng trung bình: ~5 mA

**Tính toán:**

- T = 4,500 mAh / 5 mA = 900 giờ ≈ **37.5 ngày**

**Thực tế: ~30–35 ngày**.

#### Trường Hợp 3: Track Liên Tục (Cảnh Báo)

- Dòng tiêu thụ: ~250 mA

**Tính toán:**

- T = 4,500 mAh / 250 mA = **18 giờ**

**Thực tế: ~15–18 giờ** (đủ cho cảnh báo và xử lý).

### VI.4 Cân Bằng Năng Lượng (Sạc vs Tiêu Thụ)

**Khi Xe Chạy (IGN ON):**

Giả sử xe chạy **4 giờ/ngày**:

- Tiêu thụ tracker: 250 mA × 4h = **1,000 mAh**
- Sạc pin: phụ thuộc cấu hình TP4056 và thời gian xe chạy
- **Tổng tiêu thụ từ ắc quy**: phụ thuộc dòng sạc cấu hình + tải tracker

**Lưu ý:** Với TP4056, dòng sạc thực tế bị chi phối bởi cấu hình PROG và nhiệt độ module. Khi pin đầy, mạch sẽ giảm dòng và kết thúc sạc.

**Khi Xe Đỗ (IGN OFF):**

Giả sử đỗ **20 giờ/ngày**:

- Tiêu thụ (heartbeat 15 phút): 7 mA × 20h = **140 mAh**
- **Không sạc pin** (bảo vệ ắc quy)

**Tổng tiêu thụ từ ắc quy/ngày:**

- Chạy: 5,000 mAh
- Đỗ: 140 mAh
- **Tổng: ~5,140 mAh/ngày**

**Cân Bằng Pin:**

- **Sạc vào pin khi chạy:** phụ thuộc dòng cấu hình TP4056 (PROG) và điều kiện nhiệt
- **Nếu xe chạy 4h/ngày:** khả năng pin đầy phụ thuộc dòng sạc cấu hình và trạng thái pin ban đầu
- **Tiêu thụ từ pin khi đỗ:** 140 mAh/ngày (nếu dùng pin)
- **Cân bằng thực tế:** cần đo dòng sạc thực tế theo module TP4056 đang dùng để xác nhận mức dư/thiếu

→ Với TP4056, không giả định một dòng cố định; cần hiệu chuẩn theo PROG + nhiệt độ để kết luận thời gian sạc chính xác.

**Khi Ắc Quy Yếu (`U_batt <= Switch_OFF` theo profile):**

- Tracker chuyển sang pin
- Pin đã được sạc đầy từ các lần chạy trước
- Pin có thể hoạt động **20–35 ngày** ở chế độ heartbeat
- Đủ thời gian để người dùng sửa chữa/sạc ắc quy

### VI.5 Thời Gian Hoạt Động từ Ắc Quy Xe

Giả sử ắc quy 45–60 Ah, chỉ dành **50% dung lượng an toàn** cho tracker.

- Với 45 Ah → 22 Ah an toàn
- Với 60 Ah → 30 Ah an toàn

**Tiêu thụ từ ắc quy:**

- Khi chạy: tổng dòng từ ắc quy = dòng tracker (~250 mA trung bình tham chiếu) + dòng sạc TP4056 theo cấu hình thực tế
- Nếu sạc hoạt động liên tục trong 4h: tiêu thụ/ngày = (I_tracker + I_charge_cfg) × 4h
- Nếu pin gần đầy trong khi chạy: dòng sạc sẽ giảm dần (CC/CV) nên tiêu thụ thực tế thấp hơn công thức dòng hằng
- Khi đỗ: ~140 mAh/ngày
- **Trung bình/ngày:** phụ thuộc mạnh vào `I_charge_cfg` và thời gian pin ở pha CV

**Thời gian hoạt động:**

- 45 Ah và 60 Ah chỉ tính chính xác khi đã đo `I_charge_cfg` thực tế của module TP4056
- Công thức tổng quát: `T (ngày) = Dung_lượng_an_toàn (mAh) / Tiêu_thụ_trung_bình_mỗi_ngày (mAh/ngày)`

**Thực tế:**

- Nếu xe chạy 4h/ngày, đỗ 20h/ngày → tiêu thụ thực tế từ ắc quy thấp hơn nhiều
- Ắc quy có thể cung cấp cho tracker **vài tuần đến vài tháng** tùy tần suất sử dụng xe
- Khi ắc quy < 12V, tracker tự động chuyển sang pin backup

### VI.6 Tóm Tắt

| Thông Số                                           | Giá Trị                                |
| -------------------------------------------------- | -------------------------------------- |
| **Dung lượng pin**                                 | 5,000 mAh                              |
| **Thời gian sạc (TP4056)**                         | Phụ thuộc PROG + nhiệt + trạng thái pin |
| **Thời gian hoạt động từ pin (heartbeat 15 phút)** | ~20–25 ngày (ước tính)                  |
| **Thời gian hoạt động từ pin (heartbeat 30 phút)** | ~30–35 ngày (ước tính)                  |
| **Thời gian hoạt động từ pin (track liên tục)**    | ~15–18 giờ (ước tính)                   |
| **Tiêu thụ khi chạy (có sạc pin)**                 | = (I_tracker + I_charge_cfg) × thời gian chạy |
| **Tiêu thụ khi đỗ (heartbeat)**                    | ~140 mAh/ngày từ ắc quy                 |
| **Cân bằng sạc/tiêu thụ**                          | Cần đo `I_charge_cfg` thực tế để kết luận |
