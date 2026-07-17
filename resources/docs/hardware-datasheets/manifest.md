# Hardware Datasheet Manifest

Mục tiêu baseline kiểm chứng trong repo này:
- Modem runtime: **SIMCom SIM7600CE-T**
- Buck converter: **MP2482** (12/24V → 5V @ 5A, cấp 5V bus cho ESP32, modem, TP4056)
- Boost converter: **SX1308** (tăng nguồn 1S backup lên 5V khi xe cắt điện)
- Charger: **TP4056** cho pin Li-ion **18650 1S**
- Backup battery: **18650 Li-ion 1S** (có protection board đơn cell)
- Power routing: **Diode OR** đôi giữa output MP2482 và SX1308
- LVD: **LM393 family comparator** + firmware `power_is_low_voltage()` (GPIO19 HIGH = low-voltage)
- Firmware pinMap: GPIO16/17 UART, GPIO25 PWRKEY, GPIO19 LVD status, GPIO4 ADC U_BATT, GPIO5 CHARGER_EN, GPIO18 POWER_MUX_SEL

---

## 1) Inventory + Verification Status
| Part | Category | Baseline status | Verification status | Notes |
| --- | --- | --- | --- | --- |
| ESP32-S3 | MCU | Target | Verified (vendor PDF) | Pin map trong `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h` + các driver power/modem |
| LIS3DH | IMU | Target | Partially verified (trusted-mirror HTML) | Có mapping I2C/INT trong firmware; chưa có official ST PDF mirror trong repo |
| SIM7600CE-T | LTE/GNSS modem | Target | Verified (trusted-mirror PDF + schematic nets) | Firmware chỉ dùng SIM7600CE-T; UART1 = GPIO16/17, PWRKEY = GPIO25 |
| MP2482 | Buck converter | Target | Partially verified (artifact mirror 1-page) | 12/24V → 5V @ 5A, cung cấp bus 5V chính; cần full datasheet PDF nhiều trang để hoàn tất đối chiếu |
| SX1308 | Boost converter | Target | Verified (trusted-mirror PDF) | Boost 1S (≈3.0–4.2V) → 5V khi ắc quy bị ngắt |
| TP4056 | Charger | Target | Verified (vendor PDF) | Sạc pin dự phòng 18650 1S, bật khi `CHARGER_EN=1` và xe ở profile IGN ON |
| 18650 Li-ion 1S | Backup battery | Target | Verified (cell datasheet) | Single cell, protection board, phù hợp với profile LVD và diode OR |
| Dual Schottky (power OR) | Power routing | Target | Verified (schematic + block diagram) | 2 diode OR giữa output MP2482 và SX1308 để tránh tắt chéo MOSFET/relay |
| LM393 comparator | Comparator (LVD) | Target interface | Verified (vendor PDF) | Comparator output vào GPIO19; firmware `power_is_low_voltage()` coi HIGH = low-voltage |

> **Ghi chú lịch sử:** LM2596, MT3608, IP2312, relay/MOSFET power mux và pin 21700/2S chỉ còn xuất hiện ở phần tham khảo legacy. Baseline runtime hiện tại là MP2482, SX1308, TP4056, diode OR và pin 18650 1S.

---

## 2) Datasheet Artifact Registry (file, source, trust, hash)
| Part | Local file | Source URL used in session | Trust | Size (bytes) | SHA256 |
| --- | --- | --- | --- | ---:| --- |
| ESP32-S3 | `vendor/esp32-s3-datasheet-en.pdf` | https://documentation.espressif.com/api/resource/doc/file/rz94aWY3/FILE/esp32-s3_datasheet_en.pdf | official vendor | 1,108,481 | 7904070a6a95ddbdfcf2a39d63ccadbc9e2945ea354f9d949340571553ed3ecb |
| SIM7600CE-T | `trusted-mirror/sim7600ce-hardware-design-v1.04.pdf` | https://cdn.tdlogy.com/public/Datasheet/4G-5G/SIMCOM/SIM7600CE_Hardware%20Design_V1.04.pdf | trusted mirror | 2,707,670 | 8991e05907bb29ad9af06aa10ea418b0ffa4caee27b64835dc83be8504e88edb |
| MP2482 | `vendor/mp2482-datasheet.pdf` | https://www.alldatasheet.com/datasheet-pdf/view/552121/MPS/MP2482/+_4324_VKxSaxSBYDY+/datasheet.pdf | mirror (PDF 1-page preview) | 25,307 | 91f6c7bc0c519b22fbeb61924ca3bd9cfbf52f923100d5d5f5351f6e57924e64 |
| SX1308 | `trusted-mirror/sx1308-datasheet-suosemi-jlc.pdf` | https://www.suosemi.com/download/SX1308_datasheet.pdf | trusted mirror | 864,144 | 0a0d971df83cdc8cf72b94fee98b5b0d016415978c41f21f429102ae96372fd3 |
| TP4056 | `vendor/tp4056-datasheet-top-power.pdf` | https://www.top-power.com/wp-content/uploads/TP4056.pdf | vendor | 738,034 | de2a2f802eb7e0e5070273c79dfd33f67ac028c49cb74971d566b70e753a4858 |
| 18650 Li-ion 1S | `vendor/18650-samsung-inr18650-30q-datasheet.pdf` | https://www.samsung.com/semiconductor/dram/consumer-battery/inr18650-30q/ | official vendor | 756,041 | 652b3b98380428a112f147b830490e0da2aeec5b62eba04f1b6583ee963a61e1 |
| LM393 family | `vendor/lm393-datasheet.pdf` | https://www.ti.com/lit/ds/symlink/lm393.pdf | official vendor | 3,289,456 | cb43d9043fe35c88eba9bdebb60b2b9059514987a1c2c62900f826eebb9ee059 |
| LIS3DH (mirror page) | `trusted-mirror/lis3dh-alldatasheet.html` | https://www.alldatasheet.com/datasheet-pdf/pdf/435280/STMICROELECTRONICS/LIS3DH.html | trusted mirror (HTML snapshot) | 53,507 | d67f6af6e6e994f724ab3728662a6ab1cd564636f8fa3ad33cace41c5eb03d15 |

> **Legacy registry:** `vendor/lm2596`, `vendor/mt3608`, `vendor/ip2312`, `vendor/xl4015`, `vendor/tps54231` vẫn lưu để theo dõi khác biệt, nhưng không phải đường chạy runtime hiện tại.

---

## 3) Pinout / Interface Verification (firmware vs docs vs schematic extraction)
Nguồn firmware: `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`, `main/src/modem_at.c`, `main/src/power_mgr.c`, `main/src/adc_reader.c`.

### 3.1 Verified firmware mapping
| Signal | Firmware mapping | Evidence |
| --- | --- | --- |
| MODEM UART TX | GPIO16 (`PIN_MODEM_TX`) | `pin_map.h`, `modem_at.c` |
| MODEM UART RX | GPIO17 (`PIN_MODEM_RX`) | `pin_map.h`, `modem_at.c` |
| MODEM PWRKEY | GPIO25 (`PIN_MODEM_PWRKEY`) | `power_mgr.c`, firmware pulse |
| POWER MUX select | GPIO18 (`PIN_POWER_MUX_SEL`) | `power_mgr.c` |
| CHARGER_EN | GPIO5 (`PIN_CHARGER_EN`) | `power_mgr.c` |
| LVD status | GPIO19 (`PIN_LVD_STATUS`) | `power_mgr.c` (HIGH = low-voltage) |
| ADC U_batt | GPIO4 (`PIN_U_BATT_ADC`) | `adc_reader.c` |
| LIS3DH INT/I2C | GPIO21, GPIO22, GPIO23 | `pin_map.h` |

### 3.2 Power routing & LVD alignment
- Power path thiết kế theo diode OR: MP2482 5V bus và SX1308 (boost từ 1S) đấu chung qua hai diode Schottky để tránh cắt khi một đường mất nguồn.
- Khi comparator LM393 (GPIO19) trả về HIGH, firmware gọi `power_is_low_voltage()` và **ngắt chân EN cho đường 12/24V (MP2482)**, đường 5V chính bị tắt để kéo xe không bị rút cạn Ắc quy, đồng thời sạc TP4056 bị tắt.
- GPIO18 chỉ còn nhiệm vụ báo UX/logic, diode OR đảm nhiệm chuyển mạch vật lý, giúp loại bỏ relay/MOSFET.

### 3.3 Mismatch findings
| Area | Current state before fix | Verified state | Classification |
| --- | --- | --- | --- |
| Modem UART pin docs | Một số docs ghi UART1 là GPIO17/18 | Firmware GPIO16/17 | Doc-only mismatch |
| Modem PWRKEY docs | Một số tài liệu ghi GPIO4 | Firmware GPIO25 | Doc-only mismatch |
| LVD polarity | Hầu hết ghi HIGH nghĩa ổn định | Firmware `HIGH` = low-voltage | Doc-only mismatch |
| Backup battery wording | File cũ nhắc 21700/2S | Baseline là 18650 1S | Doc set mismatch |

---

## 4) Changes applied in this pass (Phase 4 partial)
- Vendorsdoc cập nhật toàn bộ phần power management để phản ánh chuỗi `MP2482 → diode OR → SX1308` và `TP4056 + 18650 1S`.
- Thêm mô tả LVD mới: `GPIO19 HIGH = low-voltage`, firmware ngắt chân EN 12/24V để bảo vệ năng lượng Ắc quy.
- Ghi chú legacy file `06-backup-battery-21700.md` và `06-charger-ip2312.md` là tên cũ (còn để đối chiếu). Không đề cập LM2596/MT3608/IP2312 trong phần runtime.

---

## 5) Remaining actions after this manifest
1. Kiểm tra lại sơ đồ `block-diagram.png` và `power.png` để đảm bảo MP2482/SX1308/TP4056/diode OR được thể hiện đúng.
2. Cập nhật `docs/codebase-summary.md` và `resources/reports/...` để phản ánh kiến trúc hiện tại.
3. Thay file `vendor/mp2482-datasheet.pdf` bằng **full** PDF datasheet MP2482 từ nguồn vendor/mirror đáng tin cậy (artifact hiện tại chỉ là preview 1 trang, chưa đủ đối chiếu chi tiết).

---

## 6) Unresolved questions
1. Cần xác định mã diode cụ thể cho diode OR (1N5822 hay tương đương) để cập nhật BOM và LVD path.
2. SX1308 cần tính toán nhiệt khi cấp 2A liên tục từ pin backup; cần kiểm tra therm hoặc mua biến biến version (nếu có) để cập nhật tài liệu.
