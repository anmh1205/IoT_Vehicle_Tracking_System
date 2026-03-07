# Hardware Datasheet Manifest

Mục tiêu baseline kiểm chứng trong repo này:
- Modem runtime: **SIM7600CE-T**
- IMU: **LIS3DH**
- Backup battery: **18650 1S**

## 1) Inventory + Verification Status

| Part | Category | Baseline status | Verification status | Notes |
| --- | --- | --- | --- | --- |
| ESP32-S3 | MCU | Target | Verified (file + hash) | Firmware pin map có trong `iot-vehicle-tracking-firmware/main/inc/pin_map.h` |
| SIM7600CE-T | LTE/GNSS modem | Target | Verified (trusted-mirror PDF + schematic net evidence) | Runtime target cố định là SIM7600CE-T |
| LIS3DH | IMU | Target | **Pending official PDF** (mirror HTML available) | Đang ưu tiên link ST chính thức |
| TP5100 | Charger IC | Legacy (2S path) | Verified (vendor PDF) | Sơ đồ power.png thể hiện 2S charger path, không khớp baseline 1S final |
| TPS54231 | Buck converter | Target (theo block-diagram) | Verified (vendor PDF) | Dùng cho rail hạ áp theo block-diagram |
| XL4015 | Buck converter | Legacy/Reference (power.png) | Verified (vendor PDF) | Xuất hiện trong sơ đồ power tham chiếu |
| IP2312 | 1S charger | Target (1S backup path) | Verified (trusted-mirror PDF) | Khớp baseline 18650 1S |
| LM393 / LM393B family | Comparator (LVD) | Target interface | Verified (vendor PDF) | Cần giữ semantics thống nhất với firmware |
| 21700 cell | Battery cell | Legacy | N/A | Docs runtime đang dùng nhiều chỗ 21700, cần chuẩn hóa về 18650 1S |
| 2S Li-ion pack | Battery config | Legacy | N/A | Có trong power.png/simcom reference, không phải baseline cuối |

---

## 2) Datasheet Artifact Registry (file, source, trust, hash)

| Part | Local file | Source URL used in session | Trust | Size (bytes) | SHA256 |
| --- | --- | --- | --- | ---:| --- |
| ESP32-S3 | `vendor/esp32-s3-datasheet-en.pdf` | `https://documentation.espressif.com/api/resource/doc/file/rz94aWY3/FILE/esp32-s3_datasheet_en.pdf` | official vendor | 1,108,481 | `7904070a6a95ddbdfcf2a39d63ccadbc9e2945ea354f9d949340571553ed3ecb` |
| SIM7600CE-T | `trusted-mirror/sim7600ce-hardware-design-v1.04.pdf` | `https://cdn.tdlogy.com/public/Datasheet/4G-5G/SIMCOM/SIM7600CE_Hardware%20Design_V1.04.pdf` | trusted mirror | 2,707,670 | `8991e05907bb29ad9af06aa10ea418b0ffa4caee27b64835dc83be8504e88edb` |
| TPS54231 | `vendor/tps54231-datasheet.pdf` | `https://www.ti.com/lit/ds/symlink/tps54231.pdf` | official vendor | 1,035,367 | `352abd5a57c15364dded8ce1ac29f573642cc1c4e8246b04298703be482b73d3` |
| XL4015 | `vendor/xl4015-datasheet-en.pdf` | `https://www.xlsemi.com/datasheet/XL4015-EN.pdf` | vendor (manufacturer site) | 345,005 | `3c15d21803d947670d6e39e58462d2cd368d52a54e782f8c9f84c6a8d66174d7` |
| TP5100 | `vendor/tp5100-datasheet-rev2.4.pdf` | `https://www.toppwr.com/uploadfile/file/20240913/66e3a293b3c42.pdf` | vendor (manufacturer site) | 695,585 | `ef772af59ab538d0e62dbee98e6bb332bc36031d740a06dfefea8a2f0e5bbeed` |
| IP2312 | `trusted-mirror/ip2312-datasheet-lcsc.pdf` | `https://datasheet.lcsc.com/lcsc/2101081834_INJOINIC-IP2312-4V35_C605433.pdf` | trusted mirror | 1,250,390 | `37609e8a8c4601a04f8ef6011bfc5af4185d40a34103dfcd132f6c264bfba9db` |
| LM393 family | `vendor/lm393-datasheet.pdf` | `https://www.ti.com/lit/ds/symlink/lm393.pdf` | official vendor | 3,281,140 | `8bbc0aee9339192f3d89d77cd2f95b6b51be86db5866d9fd9e56abf5fd2c4828` |
| LIS3DH (mirror HTML) | `trusted-mirror/lis3dh-alldatasheet.html` | `https://www.alldatasheet.com/datasheet-pdf/pdf/435280/STMICROELECTRONICS/LIS3DH.html` | trusted mirror | 53,507 | `d67f6af6e6e994f724ab3728662a6ab1cd564636f8fa3ad33cace41c5eb03d15` |

> Ghi chú LIS3DH official PDF:
> - Các URL ST official đã thử trong session (`https://www.st.com/resource/en/datasheet/lis3dh.pdf` và biến thể content CDN) chưa ổn định trong môi trường chạy.
> - Tạm dùng mirror để tiếp tục đối soát pin/interface; vẫn ưu tiên thay bằng bản official ngay khi tải ổn định.

---

## 3) Pinout / Interface Verification (firmware vs docs vs schematic extraction)

Nguồn firmware chính:
- `iot-vehicle-tracking-firmware/main/inc/pin_map.h`
- `iot-vehicle-tracking-firmware/main/src/modem_at.c`
- `iot-vehicle-tracking-firmware/main/src/power_mgr.c`
- `iot-vehicle-tracking-firmware/main/src/adc_reader.c`

### 3.1 Verified firmware mapping

| Signal | Firmware mapping | Evidence |
| --- | --- | --- |
| MODEM UART TX (ESP32->modem RX) | GPIO16 (`PIN_MODEM_TX`) | `pin_map.h`, `modem_at.c` (`uart_set_pin`) |
| MODEM UART RX (modem TX->ESP32) | GPIO17 (`PIN_MODEM_RX`) | `pin_map.h`, `modem_at.c` |
| MODEM PWRKEY | GPIO25 (`PIN_MODEM_PWRKEY`) | `pin_map.h`, `power_mgr.c` pulse logic |
| POWER MUX select | GPIO18 (`PIN_POWER_MUX_SEL`) | `pin_map.h`, `power_mgr.c` |
| CHARGER_EN | GPIO5 (`PIN_CHARGER_EN`) | `pin_map.h`, `power_mgr.c` |
| LVD status input | GPIO19 (`PIN_LVD_STATUS`) | `pin_map.h`, `power_mgr.c` (`power_is_low_voltage`) |
| ADC battery sense | GPIO4 (`PIN_U_BATT_ADC`) + divider ratio 11.0 | `pin_map.h`, `adc_reader.c` |
| LIS3DH INT | GPIO21 | `pin_map.h` |
| LIS3DH I2C SDA/SCL | GPIO22 / GPIO23 | `pin_map.h` |

### 3.2 Mismatch findings (proved)

| Area | Current state before fix | Verified state | Classification |
| --- | --- | --- | --- |
| Modem doc UART pins | Một số docs ghi UART1 là GPIO17/18 | Firmware dùng GPIO16/17 | Mismatch - doc only |
| Modem doc PWRKEY | Một số docs ghi GPIO4 | Firmware dùng GPIO25 | Mismatch - doc only |
| LVD polarity text | Doc ghi HIGH = không low-voltage | Firmware `power_is_low_voltage()` coi HIGH là low-voltage | Mismatch - doc only |
| Backup battery wording | Nhiều docs ghi 21700 | Baseline yêu cầu 18650 1S | Mismatch - doc set (pending broader sweep) |

### 3.3 Schematic net evidence used

Từ ảnh schematic đã phân tích trong session:
- `block-diagram.png`: xác nhận kiến trúc backup **1S** và path nguồn chính.
- `esp32.png`: có net `SIMCOM-TX`, `SIMCOM-RX`, `SIMCOM-PWKEY`, `SIMCOM-RESET`, `SIMCOM-RTS`, `SIMCOM-CTS`, `ADC-CELL1`, `ADC-CELL2`, `VBAT-EN`.
- `simcom.png`: là schematic A7678 reference; dùng để tham chiếu nguyên tắc interface, không dùng làm runtime modem target.
- `power.png`: chứa nhiều phần 2S legacy (TP5100/ETA3000), dùng phân loại legacy.

---

## 4) Changes applied in this pass (Phase 4 partial)

Đã chỉnh doc theo bằng chứng firmware:

1. `resources/reports/iot-vehicle-tracking-report/03-firmware/part-03-modem-simcom.md`
   - Cập nhật UART mapping thành `GPIO16 (TX) / GPIO17 (RX)`.
   - Cập nhật PWRKEY pulse thành `GPIO25`.

2. `resources/reports/iot-vehicle-tracking-report/02-hardware/part-01-components/05-lte-modem-a7670c.md`
   - Cập nhật bảng kết nối vật lý:
     - UART_RX từ ESP32: GPIO16.
     - PWRKEY: GPIO25.
   - Các chân RESET/RI/EN chuyển sang trạng thái “theo net schematic, chưa có macro firmware riêng” để tránh khẳng định sai.

3. `resources/reports/iot-vehicle-tracking-report/03-firmware/part-04-power-management-gpio.md`
   - Đồng bộ mô tả LVD: HIGH được firmware xem là low-voltage.
   - Đồng bộ snippet `read_lvd_status()` với semantics hiện tại.

---

## 5) Remaining actions after this manifest

1. Tiếp tục sweep report tree để chuẩn hóa hoàn toàn wording **18650 1S** (đã xử lý phần chính, còn cần soát vòng cuối).
2. Pinout connection matrix đã thêm tại `resources/reports/iot-vehicle-tracking-report/02-hardware/05-pinout-connection-matrix.md`.
3. Nếu có thay code firmware, chạy `idf.py build` trong `iot-vehicle-tracking-firmware/`.
4. Delegated testing/review/finalization theo task #7/#8.

---

## 6) Unresolved questions

1. LIS3DH official PDF từ ST chưa tải ổn định trong môi trường hiện tại; cần xác nhận lại lần cuối để nâng trust từ mirror -> official.
2. Một số net modem control (RESET/RI/EN) thấy trong schematic extraction nhưng chưa có macro firmware tương ứng; cần xác nhận đây là chủ đích (không dùng) hay còn thiếu wiring/doc step.
