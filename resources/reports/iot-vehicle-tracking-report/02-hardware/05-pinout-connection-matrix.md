## III.3 Pinout Connection Matrix (Final Baseline)

> Matrix này tổng hợp mapping kết nối cuối cùng cho baseline runtime hiện tại: **ESP32-S3 + SIM7600CE-T + LIS3DH + power path 18650 1S**.
>
> Nguồn đối soát:
> - Firmware source-of-truth: `iot-vehicle-tracking-firmware/main/inc/pin_map.h`, `main/src/modem_at.c`, `main/src/power_mgr.c`, `main/src/adc_reader.c`
> - Schematic assets: `resources/reports/thesis-chapters/assets/schematic/esp32.png`, `simcom.png`, `block-diagram.png`
> - Datasheet: ESP32-S3 v2.1, SIM7600CE Hardware Design v1.04, LM393 datasheet, TP4056 datasheet

### III.3.1 Matrix

| Signal / Net | ESP32 pin | Peripheral pin | Direction | Voltage domain | Pull-up / pull-down | Timing / behavior | Datasheet reference | Verification status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SIMCOM-TX` (modem -> MCU) | GPIO17 (`PIN_MODEM_RX`) | SIM7600CE `TXD` (pin 71) | Input to ESP32 | ESP32 3.3V IO / modem UART 1.8V (cần level-shift theo HW) | Theo thiết kế UART level shift | Runtime UART1 115200 bps (`MODEM_UART_BAUD`) | ESP32-S3 DS v2.1 p.27, p.79 (`U1TXD/U1RXD` mapping); SIM7600CE HD v1.04 p.15-16, p.28 | **Verified (code + docs + schematic net)** |
| `SIMCOM-RX` (MCU -> modem) | GPIO16 (`PIN_MODEM_TX`) | SIM7600CE `RXD` (pin 68) | Output from ESP32 | ESP32 3.3V IO / modem UART 1.8V | Theo thiết kế UART level shift | Runtime UART1 115200 bps (`MODEM_UART_BAUD`) | ESP32-S3 DS v2.1 p.27, p.79; SIM7600CE HD v1.04 p.15, p.28 | **Verified (code + docs + schematic net)** |
| `SIMCOM-PWKEY` | GPIO25 (`PIN_MODEM_PWRKEY`) | SIM7600CE `PWRKEY` (pin 3) | Output from ESP32 | Logic control (modem side 1.8V domain theo module) | SIM7600 có pull-up nội bộ cho PWRKEY | Firmware tạo pulse HIGH ~1000 ms rồi kéo LOW (`modem_power_key_pulse`) | SIM7600CE HD v1.04 p.15, p.17, p.25-26 (power on/off); firmware `power_mgr.c` | **Verified (code + datasheet + schematic net)** |
| `SIMCOM-RESET` | *(chưa có macro firmware riêng)* | SIM7600CE `RESET` (pin 4) | Output (nếu dùng) | 1.8V logic phía module | SIM7600 RESET có pull-up nội bộ | Active low, min pulse theo module | SIM7600CE HD v1.04 p.17, p.27-28 | **Net exists / Not used in runtime code** |
| `SIMCOM-RTS` | *(chưa có macro firmware riêng)* | SIM7600CE `RTS` (pin 66) | Output (HW flow control) | UART control domain | Theo mạch UART | Chỉ cần nếu bật HW flow control | SIM7600CE HD v1.04 p.15, p.28-29 | **Net exists / Not used in runtime code** |
| `SIMCOM-CTS` | *(chưa có macro firmware riêng)* | SIM7600CE `CTS` (pin 67) | Input (HW flow control) | UART control domain | Theo mạch UART | Chỉ cần nếu bật HW flow control | SIM7600CE HD v1.04 p.15, p.28-29 | **Net exists / Not used in runtime code** |
| `SIMCOM-RI/STATUS` | *(chưa có macro firmware riêng)* | SIM7600CE `RI` (pin 69) / `STATUS` (pin 49) | Input (nếu dùng wake/status) | Module IO domain | Theo module pin behavior | Có thể dùng cho wake indication | SIM7600CE HD v1.04 p.15-16, p.29 | **Net exists / Not used in runtime code** |
| `VBAT-EN` (modem rail enable) | *(firmware hiện dùng `PIN_POWER_MUX_SEL` cho chọn nguồn tổng)* | SIM7600CE VBAT rail control path | Output control (board-level) | Power path control domain | Theo mạch nguồn | Bật/tắt rail theo logic nguồn tổng | SIM7600CE HD v1.04 p.16 (VBAT pins), block-diagram/power schematic | **Partially verified (board-level net, chưa có macro EN riêng)** |
| `LVD_STATUS` | GPIO19 (`PIN_LVD_STATUS`) | Comparator output (LM393 family) | Input to ESP32 | 3.3V digital read | Theo mạch comparator + hysteresis | Firmware coi HIGH là low-voltage (`power_is_low_voltage()==true`) | ESP32-S3 DS v2.1 p.27, p.79; LM393 DS (open-collector output, ref p.17); firmware `power_mgr.c` | **Verified (code + electrical semantics)** |
| `U_BATT_ADC` | GPIO4 (`PIN_U_BATT_ADC`, ADC) | Divider node R1/R2 từ ắc quy | Analog input | ADC domain 0–3.3V (qua chia áp) | Chia áp `R1=100k`, `R2=10k` | Công thức firmware: `u_batt = v_adc * 11.0f` | ESP32-S3 DS v2.1 p.27 (ADC1_CH3), p.79; firmware `adc_reader.c` | **Verified (code + docs)** |
| `POWER_MUX_SEL` | GPIO18 (`PIN_POWER_MUX_SEL`) | Kiểm soát EN của MP2482 để ưu tiên nguồn xe qua diode OR | Output | 3.3V control | GPIO18 bật/tắt MP2482 EN; diode OR (2 x Schottky) tự động chọn nguồn giữa MP2482 và SX1308 | LOW: MP2482 bật (dùng xe), HIGH: MP2482 tắt để SX1308 (pin backup) cấp qua diode | ESP32-S3 DS v2.1 p.27, p.79; `power_mgr.c`; MP2482 datasheet (EN pin) | **Verified (code + docs)** |
| `CHARGER_EN` | GPIO5 (`PIN_CHARGER_EN`) | Điều khiển charger TP4056 cho pin 18650 1S | Output | 3.3V control | Theo mạch enable TP4056 | HIGH bật sạc pin 1S (TP4056), LOW tắt | ESP32-S3 DS v2.1 p.27, p.79; TP4056 datasheet (EN, PROG, STAT pins p.1); firmware `power_mgr.c` | **Verified (code + docs)** |
| `LIS3DH_INT` | GPIO21 (`PIN_LIS3DH_INT`) | LIS3DH INT | Input interrupt | 3.3V IO | Theo config INT của LIS3DH | Wake từ deep sleep khi motion | ESP32-S3 DS v2.1 p.27, p.79; LIS3DH datasheet (pending official ST PDF in repo) | **Verified in code + schematic, datasheet source pending official PDF** |
| `LIS3DH_SDA` | GPIO22 (`PIN_LIS3DH_SDA`) | LIS3DH SDA | Bidirectional (I2C) | 3.3V I2C | External pull-up theo bus I2C | I2C data | ESP32-S3 DS v2.1 (GPIO matrix/I2C capable pins); LIS3DH datasheet | **Verified in code + schematic** |
| `LIS3DH_SCL` | GPIO23 (`PIN_LIS3DH_SCL`) | LIS3DH SCL | Output (I2C clock) | 3.3V I2C | External pull-up theo bus I2C | I2C clock | ESP32-S3 DS v2.1; LIS3DH datasheet | **Verified in code + schematic** |

### III.3.2 Notes

1. **Runtime modem target cố định:** SIM7600CE-T.
2. `simcom.png` có nhãn A7678/reference cho một số net; chỉ dùng để tham chiếu wiring pattern, không thay đổi target runtime.
3. Các net `RESET/CTS/RTS/RI/VBAT-EN` tồn tại ở mức schematic nhưng firmware hiện chưa khai báo macro riêng; điều này được ghi nhận rõ để tránh khẳng định sai.
4. LVD polarity được chốt theo firmware hiện tại: **HIGH = low-voltage**.
5. Baseline pin backup: **Li-ion 18650 (1S)**.

### III.3.3 Unresolved questions

1. LIS3DH official PDF từ ST chưa tải ổn định trong môi trường hiện tại; repo đang dùng nguồn mirror cho bước đối chiếu.
2. Cần quyết định có đưa `SIMCOM-RESET/CTS/RTS/RI` vào firmware pin map chính thức hay giữ ở trạng thái net dự phòng theo hardware.