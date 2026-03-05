## PHẦN VI: TÍNH TOÁN NĂNG LƯỢNG

### VI.1 Thông Số Pin và Sạc

**Pin 21700:**

- Dung lượng: **5,000 mAh @ 3.7 V** (≈ 18.5 Wh)
- Điện áp: 3.0–4.2 V (nominal 3.7 V)

**Sạc Pin (Module IP2312):**

- Dòng sạc: **3 A** (3000 mA)
- Hiệu suất sạc: ~85–90% (tổn hao nhiệt, mạch sạc)
- Thời gian sạc lý thuyết: T = 5,000 mAh / 3,000 mA ≈ **1.67 giờ**
- Thời gian sạc thực tế (với hiệu suất 85%): T = 1.67 / 0.85 ≈ 1.96 giờ ≈ **2 giờ**

**Lưu ý:**

- Thời gian sạc có thể thay đổi tùy trạng thái pin (pin cạn sẽ sạc nhanh hơn ở giai đoạn đầu, chậm lại khi gần đầy)
- Với dòng sạc 3A, pin sẽ được sạc đầy nhanh hơn ~3 lần so với sạc 1A
- Phù hợp khi xe chạy ngắn (1–2 giờ) vẫn có thể sạc đầy pin

### VI.2 Tiêu Thụ Năng Lượng Theo Chế Độ

#### Chế Độ 1: Lái Xe (IGN ON)

**Thành phần tiêu thụ:**

- ESP32-WROOM-32 (active): ~80–120 mA
- Bluetooth Classic (OBD2): ~30–50 mA
- SIM7600CE-T (LTE + GNSS tích hợp hoạt động cùng lúc): ~80–150 mA (mức hệ thống tham chiếu)
- LIS3DH (IMU): ~0.1 mA
- Mạch phụ trợ: ~10–20 mA
- **Sạc pin 3A**: 3000 mA (từ ắc quy, qua module IP2312)

**Tổng tiêu thụ từ ắc quy:**

- Tracker: ~200–320 mA
- Sạc pin: 3000 mA
- **Tổng: ~3,200–3,320 mA**

**Gửi vị trí mỗi 5–30 giây:**

- Dòng trung bình tracker: ~250 mA
- Dòng sạc: 3000 mA
- **Tổng: ~3,250 mA**

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

### VI.3 Thời Gian Hoạt Động từ Pin 21700 (Backup Mode)

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
- Sạc pin: 3,000 mA × 4h = **12,000 mAh** (vào pin, nhưng pin chỉ 5,000 mAh → sạc đầy sau ~2h)
- **Tổng tiêu thụ từ ắc quy: ~13,000 mAh/ngày** (nếu sạc liên tục 4h)

**Lưu ý:** Với dòng sạc 3A, pin 5,000 mAh sẽ đầy sau ~2 giờ. Nếu xe chạy 4h, pin sẽ đầy trong 2h đầu, sau đó module IP2312 tự ngắt → tiêu thụ thực tế thấp hơn.

**Khi Xe Đỗ (IGN OFF):**

Giả sử đỗ **20 giờ/ngày**:

- Tiêu thụ (heartbeat 15 phút): 7 mA × 20h = **140 mAh**
- **Không sạc pin** (bảo vệ ắc quy)

**Tổng tiêu thụ từ ắc quy/ngày:**

- Chạy: 5,000 mAh
- Đỗ: 140 mAh
- **Tổng: ~5,140 mAh/ngày**

**Cân Bằng Pin:**

- **Sạc vào pin khi chạy:** Pin đầy sau ~2 giờ (với dòng 3A)
- **Nếu xe chạy 4h/ngày:** Pin đầy trong 2h đầu, sau đó tự ngắt → không tiêu thụ thêm
- **Tiêu thụ từ pin khi đỗ:** 140 mAh/ngày (nếu dùng pin)
- **Dư thừa:** Pin luôn được sạc đầy sau mỗi lần chạy xe

→ Với dòng sạc 3A, pin sẽ được sạc đầy nhanh chóng (2 giờ) → đảm bảo pin luôn đầy khi cần backup.

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

- Khi chạy: ~3,250 mA (250 mA tracker + 3,000 mA sạc pin)
  - Nếu sạc liên tục 4h: 3,250 mA × 4h = 13,000 mAh
  - Thực tế: Pin đầy sau 2h → tiêu thụ = 250 × 4h + 3,000 × 2h = **7,000 mAh/ngày**
- Khi đỗ: ~140 mAh/ngày
- **Trung bình: ~7,140 mAh/ngày** (nếu xe chạy 4h/ngày)

**Thời gian hoạt động:**

- 45 Ah: 22,000 / 7,140 ≈ **3.1 ngày** (nếu chỉ chạy)
- 60 Ah: 30,000 / 7,140 ≈ **4.2 ngày** (nếu chỉ chạy)

**Thực tế:**

- Nếu xe chạy 4h/ngày, đỗ 20h/ngày → tiêu thụ thực tế từ ắc quy thấp hơn nhiều
- Ắc quy có thể cung cấp cho tracker **vài tuần đến vài tháng** tùy tần suất sử dụng xe
- Khi ắc quy < 12V, tracker tự động chuyển sang pin backup

### VI.6 Tóm Tắt

| Thông Số                                           | Giá Trị                                |
| -------------------------------------------------- | -------------------------------------- |
| **Dung lượng pin**                                 | 5,000 mAh                              |
| **Thời gian sạc (3A)**                             | ~2 giờ (thực tế)                       |
| **Thời gian hoạt động từ pin (heartbeat 15 phút)** | ~20–25 ngày                            |
| **Thời gian hoạt động từ pin (heartbeat 30 phút)** | ~30–35 ngày                            |
| **Thời gian hoạt động từ pin (track liên tục)**    | ~15–18 giờ                             |
| **Tiêu thụ khi chạy (có sạc pin 3A)**              | ~7,000 mAh/ngày từ ắc quy (xe chạy 4h) |
| **Tiêu thụ khi đỗ (heartbeat)**                    | ~140 mAh/ngày từ ắc quy                |
| **Cân bằng sạc/tiêu thụ**                          | Dư thừa ~3,860 mAh/ngày khi chạy 4h    |
