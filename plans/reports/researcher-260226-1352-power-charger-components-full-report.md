# Báo Cáo Tổng Hợp: Linh Kiện Phần Nguồn & IC Sạc cho GPS Tracker Ô Tô IoT

**Date:** 2026-02-26 | **Project:** IoT Vehicle Tracking System
**Scope:** So sánh linh kiện, đánh giá kiến trúc nguồn, độ dễ mua tại VN

---

## 1. Kiến trúc nguồn hiện tại của dự án

```
Ắc quy xe 12V/24V
       │
       ├──[LM2596 Buck]──→ 5V ──┬──[IP2312 Charger]──→ Pin 21700 Li-ion 4.2V
       │                        │
       │                        └──[AMS1117-3.3]──→ 3.3V (ESP32-S3, sensors)
       │
       └──[LM393 + ADC]──→ LVD bảo vệ ắc quy
                                │
Pin 21700 ──[MT3608 Boost]──→ 5V (backup khi mất nguồn xe)
```

**Hiệu suất tổng:** LM2596 (~80%) × IP2312 linear (~85%) ≈ **68%** từ 12V → pin

---

## 2. So sánh linh kiện theo nhóm

### 2.1. Buck Converter 12V/24V → 5V

| Linh kiện | Topology | Vin max | Iout | Hiệu suất | Iq | Giá USD | Dễ mua VN | Giá VN | Nguồn mua VN |
|---|---|---|---|---|---|---|---|---|---|
| **LM2596** ⚠️ | Non-sync | 40V | 3A | ~75% | 5–10mA | $0.20–0.50 | ★★★★★ | 8–15k đ | Shopee, Lazada |
| **MP1584** | Sync | 28V | 3A | ~92% | 0.5mA | $0.15–0.40 | ★★★★★ | 6.5–10k đ | Shopee, Lazada |
| **XL4015** | Non-sync | 36V | 5A | ~85% | 3mA | $0.30–0.60 | ★★★★★ | 15–55k đ | Shopee |
| **TPS5430** | Non-sync | 36V | 3A | ~90% | 1mA | $1.50–2.50 | ★★★★ | ~20k đ/IC | icdayroi.com |
| **MP2315** | Sync | 24V | 3A | ~93% | 55µA | $0.50–0.80 | ★★★ | LCSC | Cần order |
| **LMR16006** | Non-sync | **60V** | 0.6A | ~88% | **22µA** | $0.60–1.00 | ★★★ | LCSC | AEC-Q100, chỉ 0.6A |

**Phân tích:**
- **LM2596** (đang dùng): legacy, hiệu suất kém 75%, Iq cao. Hay bị hàng giả.
- **MP1584**: hiệu suất tốt nhất hobbyist (92%), nhưng Vin max 28V — nguy hiểm cho automotive load dump (spike 40–80V). Cần TVS P6KE33A.
- **XL4015**: dòng cao nhất 5A, phù hợp modem 4G burst 2–3A. Giá rẻ.
- **TPS5430**: chuẩn automotive TI, 36V, không lo hàng giả. IC rời cần PCB.

**Khuyến nghị:**

| Scenario | Chọn |
|---|---|
| DIY/đồ án | **XL4015** (5A, rẻ, module sẵn) hoặc **MP1584 + TVS** (nhỏ gọn) |
| Automotive chuẩn | **TPS5430** (36V, TI) |

---

### 2.2. Boost Converter 3.7V → 5V (Pin backup)

| Linh kiện | Hiệu suất peak | Hiệu suất nhẹ tải | Light-load | Giá USD | Dễ mua VN | Giá VN | Nguồn |
|---|---|---|---|---|---|---|---|
| **MT3608** ✅ | ~91% | ~45% (kém) | PWM only | $0.05–0.15 | ★★★★★ | 6–15k đ | Shopee |
| **SX1308** | ~92% | ~50% | PWM only | $0.05–0.20 | ★★★★ | 6–12k đ | Shopee |
| **TPS61023** | ~95% | **~82%** | **PFM** | $0.80–1.50 | ★★★ | 12–25k đ | LCSC, icdayroi |

**Phân tích:**
- **MT3608** (đang dùng): OK nếu tracker active liên tục; kém ở nhẹ tải (45% ở 1mA) → lãng phí pin khi deep sleep.
- **TPS61023**: PFM mode → hiệu suất 82% ở 1mA, tăng battery life backup gần gấp đôi. Đáng upgrade nếu deep sleep nhiều.

---

### 2.3. Charger IC Li-ion (từ 5V)

| Linh kiện | Topology | Imax | Power Path | I²C | Giá USD | Dễ mua VN | Giá VN | Nguồn |
|---|---|---|---|---|---|---|---|---|
| **TP4056** | Linear | 1A | ❌ | ❌ | $0.05–0.15 | ★★★★★ | 3.5–8k đ | Shopee |
| **IP2312** ✅ | Linear+PP | **2A** | **✅ Basic** | ❌ | $0.15–0.30 | ★★★★★ | 3–5k đ | Shopee |
| **BQ24072** | Linear+PP | 1.5A | **✅ DPM** | ❌ | $1.20–2.00 | ★★★ | 15–40k đ | LCSC |
| **BQ25895** | Switching | 5A | **✅ NVDC** | **✅** | $2.50–4.00 | ★★ | 80–140k đ | Mouser |

**Phân tích:**
- **IP2312** (đang dùng): hợp lý — có power path basic, 2A, rẻ, dễ mua VN. Vin max 6.5V nên bắt buộc cần buck trước.
- **TP4056**: phổ biến nhất VN nhưng **không có power path** → pin charge-discharge liên tục khi load lớn → giảm tuổi thọ.
- **BQ24072**: upgrade đáng giá nếu cần DPM (Dynamic Power Management), ship 7–15 ngày LCSC.

---

### 2.4. IC Sạc Xả Chung Tích Hợp Buck (Vin cao 12–40V)

| IC | Hãng | Vin Max | Icharge | Power Path | I²C | Iq | Giá USD | Dễ mua VN | Giá VN |
|---|---|---|---|---|---|---|---|---|---|
| **CN3791** | Consonance | 28V | 2A | ❌ | ❌ | 1–3mA | $0.50 | ★★★★ | 2–10k đ |
| **SC8886** | Southchip | 30V | 6A | **✅** | **✅** | 75µA | $1.20 | ★★ | 200–350k đ |
| **MP2639A** | MPS | 26V | 3A | **✅** | **✅** | 65µA | $2.50 | ★★★ | 40–75k đ |
| **BQ25798** | TI | 24V | 5A | **✅** | **✅** | 60µA | $3.80 | ★★ | 100–190k đ |
| **LT3652** | ADI | 32V | 2A | ❌ | ❌ | thấp | $6.50 | ★★ | 240–315k đ |
| **BQ25756** | TI | **65V** | ext | **✅** | **✅** | 55µA | $4+ | ★★ | Mouser |

**Tại sao không dùng IC sạc xả chung luôn?**

Ba lý do kỹ thuật cốt lõi:

1. **Automotive load dump (ISO 7637)**: spike 40–80V khi ngắt tải. IC tích hợp thường Vin ≤30V → cháy nếu không có TVS. Buck chuyên dụng (LM2596HV, TPS54360-Q1) rated 60–80V.
2. **Phân tán nhiệt**: 2 chip = 2 vùng tỏa nhiệt trên PCB. 1 chip = nhiệt tập trung → thermal shutdown trong hộp kín.
3. **Sleep current & linh hoạt**: buck riêng (Iq ~60nA) + charger riêng (shutdown) cho tổng Iq thấp hơn PMIC tích hợp. 2 chip độc lập dễ optimize cho từng chế độ.

**Lý do thực tế:**

| Yếu tố | 2 IC riêng (buck + charger) | 1 IC tích hợp |
|---|---|---|
| Sourcing | Dễ, nhiều nguồn cung | Ít nhà cung cấp |
| Lead time | Ngắn (commodity) | Có thể 50+ tuần |
| Chi phí | LM2596 + IP2312 ≈ $0.70 | CN3791 $0.50 / SC8886 $1.20 / BQ25798 $3.80 |
| PCB area | Lớn hơn | Nhỏ hơn |
| Thiết kế | Đơn giản, tài liệu nhiều | Phức tạp, ít reference |
| Debug | Dễ (isolate từng tầng) | Khó (1 chip nhiều việc) |
| Mua tại VN | ★★★★★ | ★★–★★★★ |

---

### 2.5. LDO 5V → 3.3V

| Linh kiện | Imax | Dropout | Iq | EN pin | Giá USD | Dễ mua VN | Giá VN | Nguồn |
|---|---|---|---|---|---|---|---|---|
| **AMS1117** ⚠️ | 1A | 1.2V | **5–10mA** | ❌ | $0.05–0.15 | ★★★★★ | ~590đ | Shopee |
| **AP2112K** ✅ | 600mA | 300mV | 55µA | **✅** | $0.20–0.40 | ★★★★★ | ~850đ | Shopee |
| **HT7333** | 250mA | 100mV | **4µA** | ❌ | $0.10–0.25 | ★★★★★ | ~620đ | Shopee |
| **ME6211C33** | 300mA | 100mV | 30µA | Một số | $0.05–0.15 | ★★★★ | ~500đ | Shopee |

**Phân tích quan trọng:**
- **AMS1117** (đang dùng): **tệ nhất cho battery IoT** — Iq 5–10mA tiêu hết pin 5Ah trong 20–40 ngày idle. MCU deep sleep 10µA trở nên vô nghĩa.
- **AP2112K**: cân bằng tốt nhất — EN pin tắt peripheral qua GPIO, Iq 55µA, 600mA đủ ESP32.
- **HT7333**: Iq 4µA tốt nhất nhưng dòng thấp (250mA), không EN pin.

---

### 2.6. Power Path & LVD

| Linh kiện | Chức năng | Iq | Giá USD | Dễ mua VN | Giá VN | Nguồn |
|---|---|---|---|---|---|---|
| **LM393** ✅ | Comparator LVD | 1–5mA | <$0.10 | ★★★★★ | 1–5k đ | Shopee, mọi shop |
| **AO3401** (P-FET) | Power switch | — | <$0.10 | ★★★★★ | 500–2k đ | Shopee |
| **SI2301** (P-FET) | Power switch | — | <$0.05 | ★★★★★ | 500–1.5k đ | Shopee |
| **LTC4412** | Ideal diode ctrl | 15µA | $1.50 | ★★★ | 55–115k đ | LCSC, Mouser |
| **TVS P6KE36A** | Bảo vệ quá áp | — | $0.20 | ★★★★ | 2–5k đ | icdayroi |

**Nhận xét:**
- **LVD (ADC + LM393)**: pattern chuẩn commercial tracker (Teltonika, Queclink). Giữ nguyên.
- **Power path relay**: tốn ~100mA coil → nên thay bằng **AO3401 + LM393** (ideal diode tự xây, <3k đ).
- **LTC4412**: đắt, **AO3401 + LM393 thay thế được** cho đồ án.

---

## 3. Đánh giá tổng thể kiến trúc hiện tại

| Component | Hiện tại | Đánh giá | Đề xuất |
|---|---|---|---|
| Buck 12V→5V | **LM2596** | ⚠️ Hiệu suất 75%, Iq cao | **XL4015** hoặc **MP1584+TVS** |
| Boost 3.7V→5V | **MT3608** | ⚠️ Nhẹ tải kém nếu deep sleep nhiều | **TPS61023** (nếu cần) |
| Charger | **IP2312** | ✅ Hợp lý — power path, 2A, rẻ | Giữ nguyên |
| LDO 5V→3.3V | **AMS1117** | 🔴 Iq 5–10mA — tệ nhất cho battery | **AP2112K** (850đ, EN pin) |
| Power path | **Relay** | ⚠️ 100mA coil current | **AO3401 + LM393** |
| LVD | **ADC + LM393** | ✅ Pattern chuẩn | Giữ nguyên |

### Mức độ ưu tiên thay đổi

| Ưu tiên | Thay đổi | Tác động |
|---|---|---|
| 🔴 **Cao** | AMS1117 → **AP2112K** | Giảm Iq từ 5–10mA → 55µA, quyết định battery life |
| 🔴 **Cao** | Relay → **AO3401 + LM393** | Loại bỏ 100mA coil, tổng <3k đ |
| 🟡 **Trung bình** | LM2596 → **XL4015** | Hiệu suất 75%→85%, dòng 5A cho modem LTE |
| 🟡 **Trung bình** | MT3608 → **TPS61023** | Chỉ nếu deep sleep nhiều (>50% thời gian) |
| ✅ **Giữ nguyên** | **IP2312** | Power path, 2A, rẻ |
| ✅ **Giữ nguyên** | **ADC + LM393** | Pattern chuẩn commercial |

---

## 4. Phương án kiến trúc nguồn

### Phương án A: Giữ nguyên + cải thiện nhỏ (prototype)

```
12V/24V ──[TVS P6KE36A]──[LM2596]──→ 5V ──┬──[IP2312]──→ Pin 21700
                                            └──[AP2112K]──→ 3.3V ESP32
Pin 21700 ──[MT3608]──→ 5V backup
```

- Thêm TVS ($0.20) bảo vệ load dump
- Thay AMS1117 → AP2112K (850đ)
- Ưu: ít thay đổi BOM, dễ debug

### Phương án B: Tối ưu budget (đồ án)

```
12V/24V ──[TVS]──[XL4015 → 5V/5A]──┬──[IP2312 charger]──→ Pin 21700
                                     ├──[AP2112K → 3.3V]──→ ESP32 + sensors
                                     └──[AO3401 ideal diode]──→ 5V system bus
Pin 21700 ──[MT3608]──→ 5V backup
```

- XL4015 thay LM2596 (hiệu suất 85%, 5A)
- AP2112K thay AMS1117
- AO3401+LM393 thay relay
- Tổng BOM nguồn: **~52k đ**

### Phương án C: IC sạc tích hợp (redesign PCB)

```
12V/24V ──[TVS P6KE36A]──[SC8886]──→ Pin 21700
                              ↓ VSYS
                         ESP32 + 4G modem
```

- 1 IC thay cả buck + charger, power path tích hợp
- Nhược: khó mua VN (★★, LCSC 200–350k đ), QFN khó hàn, ít tài liệu

### Phương án D: Premium thương mại

```
12V/24V ──[TVS]──[BQ25798]──→ Pin 21700
                    ↓ VSYS (I²C controlled)
               ESP32 + 4G modem
```

- TI support, supplement mode, OTG, telemetry I²C
- Nhược: 100–190k đ, WQFN-30, cần PCB 4-layer

### Bảng quyết định nhanh

| Tiêu chí | A: Giữ + TVS | B: Tối ưu budget | C: SC8886 | D: BQ25798 |
|---|---|---|---|---|
| Hiệu suất tổng | ~68% | ~80% | ~92% | ~90% |
| Power path | Không | AO3401 | ✅ tích hợp | ✅ tích hợp |
| Giá BOM nguồn | ~35k đ | ~52k đ | ~350k đ | ~200k đ |
| Mua tại VN | ★★★★★ | ★★★★★ | ★★ | ★★ |
| Độ phức tạp | Thấp | Thấp | Trung bình | Cao |
| **Phù hợp** | Prototype nhanh | **Đồ án tốt nghiệp** | Sản phẩm | Premium |

---

## 5. Bộ linh kiện đề xuất cho đồ án tại VN

### Bộ tối ưu (Phương án B)

| Chức năng | Linh kiện | Số lượng | Đơn giá VN | Thành tiền | Nguồn |
|---|---|---|---|---|---|
| Buck 12V→5V | MP1584 module | 2 | 7.000đ | 14.000đ | Shopee |
| LDO 5V→3.3V (MCU) | AP2112K-3.3 | 5 con | 850đ | 4.250đ | Shopee |
| LDO noise-free (RF) | HT7333 | 5 con | 620đ | 3.100đ | Shopee |
| Charger Li-ion | IP2312 (IC rời) | 2 | 3.000đ | 6.000đ | Shopee |
| Boost pin→5V | MT3608 module | 1 | 8.000đ | 8.000đ | Shopee |
| Power path | AO3401 P-MOSFET | 10 | 800đ | 8.000đ | Shopee |
| LVD comparator | LM393 | 5 | 2.000đ | 10.000đ | Shopee |
| Bảo vệ quá áp | TVS P6KE36A | 2 | 2.500đ | 5.000đ | icdayroi |
| **TỔNG** | | | | **~58.000đ** | |

### Kênh mua nhanh nhất

1. **Shopee VN**: giao 1–3 ngày, phù hợp module/IC phổ thông (★★★★★)
2. **icdayroi.com + thegioiic.com**: IC rời chất lượng, ship nội địa (★★★★)
3. **LCSC**: lô lớn >5 con, ship 7–15 ngày, giá tốt (★★★)
4. **Mouser/DigiKey**: IC cao cấp TI/ADI, ship 15–30 ngày (★★)

### Không nên dùng cho đồ án sinh viên

- **SC8886**: QFN phức tạp, ít tài liệu, Vin ≤20V thực tế
- **BQ25895**: WQFN-24 cần PCB 4-layer, I²C firmware phức tạp
- **LT3652**: đắt ($6.5–8.5), dành cho solar chuyên dụng
- **LTC4412**: AO3401+LM393 thay thế được, tiết kiệm 50–100k đ

---

## 6. Câu hỏi chưa giải quyết

1. **Dòng peak modem 4G LTE** (A7600CE-T) ở burst TX? → quyết định XL4015 (5A) vs MP1584 (3A)
2. **Duty cycle deep sleep** của tracker? → quyết định MT3608 đủ hay cần TPS61023
3. **Relay hiện tại** latching hay momentary? → latching không tốn Iq khi giữ trạng thái
4. **Yêu cầu EMC/AEC-Q100**? → bắt buộc TPS5430/LMR16006 thay XL4015
5. **Khả năng hàn QFN/WQFN** của nhóm? → quyết định có dùng BQ25798/MP2639A không
6. **EMI từ switching** ảnh hưởng GPS L1 (1575MHz)? → cần đánh giá PCB layout
7. **SC8886 tồn kho LCSC** tại thời điểm order? → verify trước khi đặt

---

## Nguồn tham khảo

- [Hackaday: GPS tracker power supply teardown](https://hackaday.com/2024/10/28/tears-down-a-gps-tracker-then-designs-his-own-power-supply-for-it/)
- [Maarten Sneep: Designing a power supply for a GPS tracker](https://maarten.sneep.net/posts/2024/gps-tracker-power-supply/)
- [GitHub: GPS power supply design (msneep)](https://github.com/msneep/gps-power-supply)
- [TI BQ25798 product page](https://www.ti.com/product/BQ25798)
- [Analog Devices LTC4162-S](https://www.analog.com/en/products/ltc4162-s.html)
- [MPS MP2639A](https://www.monolithicpower.com/en/mp2639a.html)
- [LCSC Electronics](https://www.lcsc.com)
- TI Application Note SLVA920
- EEVblog forums, RandomNerdTutorials, GPS World
- Manufacturer datasheets: MPS, TI, ADI, Holtek, Diodes Inc.
- Shopee VN, icdayroi.com, thegioiic.com (survey Feb 2026)
