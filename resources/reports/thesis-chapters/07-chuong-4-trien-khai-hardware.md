# CHƯƠNG 4. TRIỂN KHAI GIẢI PHÁP VÀ KẾT QUẢ – IMPLEMENTATION AND RESULTS

Chương này trình bày chi tiết quá trình hiện thực phần cứng của hệ thống theo dõi phương tiện IoT, từ thiết kế đến lắp đặt thực địa. Nội dung bao gồm sơ đồ nguyên lý mạch điện, bảng phân bổ chân GPIO, thiết kế mạch quản lý nguồn, thiết kế vỏ bảo vệ, cùng quy trình lắp ráp và lắp đặt thiết bị trên xe.

---

## 4.1. Thiết kế chi tiết giải pháp – Detailed design solution

### 4.1.1. Thiết kế chi tiết phần cứng

#### a) Kiến trúc tổng thể

Hệ thống tracker lấy ESP32-S3 làm bộ xử lý trung tâm. Vi điều khiển này giao tiếp UART với modem 4G/GNSS, BLE với OBD2, I2C với cảm biến gia tốc và ADC để giám sát điện áp ắc quy. Toàn bộ hệ thống được cấp nguồn từ mạch quản lý nguồn thông minh, có khả năng tự động chuyển đổi giữa ắc quy xe và pin dự phòng.

```text
+-----------------------------------------------------------+
|                    HỆ THỐNG TRACKER                       |
+-----------------------------------------------------------+
|                                                           |
|  +--------------------------------------+                 |
|  |  ESP32-S3 (Vi Điều Khiển Trung Tâm)  |                 |
|  |  - CPU: Dual-core Xtensa LX7 240MHz  |                 |
|  |  - RAM: 512 KB SRAM                   |                 |
|  |  - Flash: 4–16 MB                     |                 |
|  |  - BLE 5.0 tích hợp                   |                 |
|  |  - ADC 12-bit, 20 kênh               |                 |
|  +--------------------------------------+                 |
|     |       |         |          |          |              |
|    I2C     BLE      UART       GPIO       ADC             |
|     |       |         |          |          |              |
|  +-----+ +-----+ +----------+ +--------+ +--------+      |
|  |LIS3DH| |OBD2 | |SIM7600CE-T | |Power   | |U_batt  |     |
|  |(IMU) | |BLE  | |(4G+GNSS) | |MUX Ctrl| |Monitor |     |
|  +------+ |vgate| +----------+ +--------+ +--------+      |
|            |iCar |                                         |
|            |Pro  |                                         |
|            +-----+                                         |
|                                                           |
|  +---------------------------------------------+          |
|  |    Hệ thống quản lý nguồn                    |          |
|  |    - Buck LM2596 (7–40V -> 5V, tương thích 12V/24V) |          |
|  |    - Boost MT3608 (3.7V -> 5V)              |          |
|  |    - Power MUX (MOSFET/Relay)               |          |
|  |    - Charger IP2312 (sạc pin 21700)         |          |
|  +---------------------------------------------+          |
|          |                        |                        |
|     Ắc quy xe 12V/24V      Pin 21700 3.7V 5Ah             |
+-----------------------------------------------------------+
```

![Hình 4.1 - Sơ đồ khối tổng thể hệ thống tracker IoT](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–1.jpg)

*Hình 4.1: Sơ đồ khối tổng thể hệ thống tracker IoT*

> Nguồn: Hình vẽ của tác giả

#### b) Khối vi điều khiển và giao tiếp

Vi điều khiển ESP32-S3-WROOM-1 được lựa chọn làm nhân xử lý trung tâm của hệ thống với các thông số kỹ thuật nổi bật:

| Thông số     | Giá trị                                 |
| ------------ | --------------------------------------- |
| CPU          | Dual-core Xtensa LX7 @ 240 MHz (32-bit) |
| RAM          | 512 KB SRAM                             |
| Flash        | 4–16 MB (tùy variant)                   |
| Bluetooth    | BLE 5.0 (tương thích ngược BLE 4.0)     |
| GPIO         | 45 chân                                 |
| UART         | 3 cổng                                  |
| I2C          | 2 cổng                                  |
| ADC          | 12-bit, 20 kênh                         |
| Deep Sleep   | ~10–15 µA (với external wakeup)         |
| Active (BLE) | ~20–40 mA                               |

**Giao tiếp UART với modem SIMCom SIM7600CE-T:** ESP32-S3 sử dụng UART1 (GPIO16 TX, GPIO17 RX) để giao tiếp với module SIM7600CE-T, gửi AT commands (CEREG trước CGACT) và đọc GNSS/NMEA qua `AT+CGNSTST`. Baud mặc định 115200 bps, 8-bit, 1 stop, no parity. GNSS ON/OFF được điều khiển qua `AT+CGNSPWR`.
**Giao tiếp BLE với OBD2 adapter:** ESP32-S3 sử dụng BLE 5.0 tích hợp để kết nối với adapter vgate iCar Pro (BLE 4.0). Kết nối này cho phép đọc dữ liệu chẩn đoán xe theo chuẩn OBD-II bao gồm trạng thái khóa điện (IGN), tốc độ động cơ (RPM), vận tốc xe, mức nhiên liệu và mã lỗi chẩn đoán (DTC).

**Giao tiếp I2C với cảm biến LIS3DH:** Cảm biến gia tốc 3 trục LIS3DH được kết nối qua bus I2C (GPIO22 SDA, GPIO23 SCL). Cảm biến này đảm nhiệm chức năng phát hiện chuyển động (motion detection) khi xe đang đỗ, cho phép đánh thức ESP32-S3 từ chế độ deep sleep thông qua ngắt ngoài (interrupt) khi phát hiện rung động bất thường.

```text
Sơ đồ kết nối UART giữa ESP32-S3 và SIMCom SIM7600CE-T:

SIM7600CE-T Module       ESP32-S3
+------------------+    +----------+
| VCC  ------------+----+ 3.3V/5V  |
| GND  ------------+----+ GND      |
| UART_TX ---------+----+ GPIO17   | (UART RX)
| UART_RX ---------+----+ GPIO16   | (UART TX)
| PWRKEY ----------+----+ GPIO25   | (Power Control)
+------------------+    +----------+
```

![Hình 4.2 - Sơ đồ kết nối giữa ESP32-S3 và SIMCom SIM7600CE-T qua UART](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–2.png)

*Hình 4.2: Sơ đồ kết nối giữa ESP32-S3 và modem SIMCom SIM7600CE-T qua UART*

> Nguồn: Hình vẽ của tác giả

#### c) Khối đo điện áp ắc quy

Để giám sát điện áp ắc quy xe (12V hoặc 24V danh định), hệ thống sử dụng mạch chia áp (voltage divider) kết nối với kênh ADC của ESP32-S3. Bộ chia áp được chuẩn hóa cho cả hai hệ điện với R1 = 100 kΩ và R2 = 10 kΩ, tạo tỷ lệ chia áp ~0.0909 để đưa điện áp về dải đo ADC (0–3.3V).

Công thức tính toán:

```
V_adc = U_batt x R2 / (R1 + R2)
      = U_batt x 10k / (100k + 10k)
      = U_batt x 0.0909

ADC_value = (V_adc / 3.3V) x 4095

Ví dụ profile 12V:
U_batt = 12.0V -> V_adc = 1.09V -> ADC_value ~ 1355

Ví dụ profile 24V:
U_batt = 24.0V -> V_adc = 2.18V -> ADC_value ~ 2711
```

Giá trị ADC đọc được sẽ được chuyển đổi ngược thành điện áp ắc quy trong firmware. Logic chuyển nguồn/hysteresis và nhận diện IGN sử dụng profile cấu hình:
- Profile 12V: Switch_OFF=12.0V, Switch_ON=12.2V, IGN_ON>=13.0V, IGN_OFF<=12.0V
- Profile 24V: Switch_OFF=24.0V, Switch_ON=24.4V, IGN_ON>=26.0V, IGN_OFF<=24.0V

![Hình 4.3 - Sơ đồ mạch đo điện áp ắc quy bằng voltage divider và ADC ESP32-S3](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–3.png)

*Hình 4.3: Sơ đồ mạch đo điện áp ắc quy bằng voltage divider và ADC ESP32-S3*

> Nguồn: Hình vẽ của tác giả

#### d) Sơ đồ nguyên lý tổng hợp

Sơ đồ nguyên lý tổng hợp của hệ thống bao gồm tất cả các khối chức năng được kết nối với nhau thông qua vi điều khiển ESP32-S3. Các kết nối chính bao gồm:

- **UART1** (2 dây tín hiệu TX/RX): Kết nối với SIMCom SIM7600CE-T để truyền nhận dữ liệu 4G và GNSS tích hợp qua AT/NMEA
- **I2C** (2 dây tín hiệu SDA/SCL): Kết nối với cảm biến gia tốc LIS3DH
- **BLE** (không dây): Kết nối với adapter OBD2 vgate iCar Pro
- **ADC** (1 kênh): Đọc điện áp ắc quy qua voltage divider
- **GPIO** (3 chân output): Điều khiển Power MUX, Charger EN, Modem PWRKEY
- **GPIO** (2 chân input): Đọc trạng thái LVD, ngắt từ IMU

![Hình 4.4 - Sơ đồ nguyên lý mạch điện tổng hợp của hệ thống tracker](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–4.png)

*Hình 4.4: Sơ đồ nguyên lý mạch điện tổng hợp của hệ thống tracker*

> Nguồn: Hình vẽ của tác giả

---

#### e) Sơ đồ đấu nối và GPIO mapping (Wiring & GPIO Pinout)

#### a) Bảng phân công chân GPIO

Việc phân công chân GPIO của ESP32-S3 được thiết kế đảm bảo không xung đột giữa các chức năng, đồng thời tối ưu hóa cho khả năng deep sleep và external wakeup. Bảng 4.1 trình bày chi tiết phân công chân GPIO cho toàn bộ hệ thống.

**Bảng 4.1: Phân công chân GPIO của ESP32-S3**

| Chân GPIO | Chức năng     | Hướng             | Mô tả chi tiết                                                               |
| --------- | ------------- | ----------------- | ---------------------------------------------------------------------------- |
| GPIO 2    | IGN_IN        | Input             | Đọc trạng thái khóa điện (IGN) từ xe hoặc qua OBD2                           |
| GPIO 4    | U_BATT_ADC    | Input (ADC)       | Đọc điện áp ắc quy xe qua voltage divider (R1=100k, R2=10k)                   |
| GPIO 5    | CHARGER_EN    | Output            | Điều khiển bật/tắt IC sạc IP2312 (HIGH = sạc, LOW = không sạc)               |
| GPIO 16   | MODEM_UART_TX | Output            | Truyền dữ liệu UART đến module SIM7600CE-T                                    |
| GPIO 17   | MODEM_UART_RX | Input             | Nhận dữ liệu UART từ module SIM7600CE-T                                      |
| GPIO 18   | POWER_MUX_SEL | Output            | Chọn nguồn cấp: LOW = ắc quy (Q1 ON), HIGH = pin backup (Q2 ON)              |
| GPIO 19   | LVD_STATUS    | Input             | Đọc trạng thái Low Voltage Disconnect (HIGH = bình thường, LOW = ắc quy yếu) |
| GPIO 21   | LIS3DH_INT    | Input (Interrupt) | Nhận tín hiệu ngắt từ cảm biến gia tốc LIS3DH khi phát hiện chuyển động      |
| GPIO 22   | LIS3DH_SDA    | I/O (I2C)         | Đường dữ liệu I2C kết nối với cảm biến LIS3DH                                |
| GPIO 23   | LIS3DH_SCL    | I/O (I2C)         | Đường xung nhịp I2C kết nối với cảm biến LIS3DH                              |
| GPIO 25   | MODEM_PWRKEY  | Output            | Điều khiển bật/tắt nguồn modem SIMCom SIM7600CE-T (LTE + GNSS tích hợp)      |

#### b) Các lưu ý về phân công chân

Việc phân công chân GPIO cần tuân thủ một số ràng buộc kỹ thuật của ESP32-S3:

- **GPIO 34–39** chỉ hỗ trợ chế độ input, không có điện trở pull-up/pull-down nội. Do đó, các chân này không được sử dụng cho các tín hiệu output trong thiết kế này.
- **Các chân ADC** nằm trong dải GPIO 0–15 và GPIO 25–27, hỗ trợ độ phân giải 12-bit. Chân GPIO 4 được chọn làm kênh ADC đo điện áp vì nằm trong vùng ADC1, cho phép đọc đồng thời với WiFi/BLE.
- **Deep Sleep Wakeup** hỗ trợ qua hai cơ chế: EXT0 (GPIO 0–31) và EXT1 (GPIO 32–39). Chân GPIO 21 (LIS3DH_INT) nằm trong vùng EXT0, cho phép đánh thức ESP32-S3 khi cảm biến gia tốc phát hiện rung động.

#### c) Sơ đồ đấu nối tổng thể

Sơ đồ đấu nối mô tả cách kết nối vật lý giữa ESP32-S3 DevKitC và các module ngoại vi trên breadboard hoặc PCB:

```text
                    ESP32-S3 DevKitC-1
                   +------------------+
              3.3V |*                *| GND
           GPIO  2 |* IGN_IN         *| GPIO 23 (I2C SCL -> LIS3DH)
           GPIO  4 |* U_BATT_ADC     *| GPIO 22 (I2C SDA -> LIS3DH)
           GPIO  5 |* CHARGER_EN     *| GPIO 21 (LIS3DH_INT)
                   |*                *|
           GPIO 16 |* MODEM_TX       *| GPIO 19 (LVD_STATUS)
           GPIO 17 |* MODEM_RX       *| GPIO 18 (POWER_MUX_SEL)
                   |*                *|
           GPIO 25 |* MODEM_PWRKEY   *|
                   |*                *|
               5V  |*                *| GND
                   +------------------+

Kết nối ngoại vi:
  GPIO 16/17 ---[UART1]--> SIMCom SIM7600CE-T (LTE + GNSS)
  GPIO 22/23 ---[I2C]----> LIS3DH (IMU)
  GPIO 21    ---[INT]----> LIS3DH INT1
  BLE (nội)  ---[BLE]----> vgate iCar Pro (OBD2)
  GPIO 4     ---[ADC]----> Voltage Divider (R1=100k, R2=10k) <--- U_batt
  GPIO 5     ---[GPIO]---> IP2312 EN (Charger)
  GPIO 18    ---[GPIO]---> Power MUX (Relay/MOSFET)
  GPIO 19    <--[GPIO]---- LVD Status
  GPIO 25    ---[GPIO]---> SIM7600CE-T PWRKEY
```

![Hình 4.5 - Sơ đồ đấu nối tổng thể giữa ESP32-S3 và các module ngoại vi](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–5.png)

*Hình 4.5: Sơ đồ đấu nối tổng thể giữa ESP32-S3 và các module ngoại vi*

> Nguồn: Hình vẽ của tác giả

---

#### f) Thiết kế mạch quản lý nguồn (Power Management Circuit)

#### a) Tổng quan kiến trúc nguồn

Mạch quản lý nguồn là thành phần thiết yếu của hệ thống tracker, bảo đảm thiết bị hoạt động liên tục ngay cả khi ắc quy xe yếu hoặc mất điện. Kiến trúc nguồn gồm năm khối chức năng chính:

1. **Mạch giảm áp Buck (LM2596):** Chuyển đổi điện áp ắc quy xe (12V hoặc 24V) xuống 5V
2. **Mạch tăng áp Boost (MT3608):** Chuyển đổi 3.7V từ pin dự phòng lên 5V
3. **Bộ chuyển mạch nguồn Power MUX:** Tự động chuyển đổi giữa hai nguồn cấp
4. **Mạch sạc pin IP2312:** Sạc pin Li-ion 21700 khi xe hoạt động
5. **Mạch giám sát điện áp LVD:** Giám sát điện áp ắc quy để quyết định chuyển nguồn

```text
+-----------------------------------------------------------+
|                  KIẾN TRÚC NGUỒN                          |
+-----------------------------------------------------------+
|                                                           |
|  Ắc Quy Xe (12V/24V)        Pin 21700 (3.7V, 5Ah)        |
|       |                           |                       |
|  +----v----+                +----v----+                   |
|  | LM2596  |                | MT3608  |                   |
|  | Buck    |                | Boost   |                   |
|  | 7–40V->5V|               | 3.7V->5V|                   |
|  +----+----+                +----+----+                   |
|       |                          |                        |
|       +----------+---------------+                        |
|                  |                                        |
|         +--------v--------+                               |
|         |   Power MUX     |                               |
|         | (Relay/MOSFET)  |                               |
|         +--------+--------+                               |
|                  |                                        |
|         +--------v--------+                               |
|         |    5V Rail       |                               |
|         +---+------+------+---+                           |
|             |      |      |   |                           |
|          +--v-+ +--v--+ +--v-+                            |
|          |LDO | |LTE/ | |IP2312                           |
|          |3.3V| |GNSS | |Charger                          |
|          |    | |SIM7600CE-T                              |
|          +-+--+ +-----+ +--+--+                           |
|            |                |                             |
|         +--v--+          +--v--+                           |
|         |ESP32|          | Pin |                           |
|         +-----+          |21700|                           |
|                          +-----+                          |
+-----------------------------------------------------------+
```

![Hình 4.6 - Kiến trúc tổng thể mạch quản lý nguồn](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–6.jpg)

*Hình 4.6: Kiến trúc tổng thể mạch quản lý nguồn*

> Nguồn: Hình vẽ của tác giả

#### b) Mạch giảm áp Buck Converter (12V/24V -> 5V)

Mạch buck converter sử dụng IC LM2596–5.0 (phiên bản cố định 5V) để chuyển đổi điện áp từ ắc quy xe 12V hoặc 24V xuống 5V cấp cho toàn bộ hệ thống. Các thông số thiết kế:

**Bảng 4.2: Thông số thiết kế mạch Buck Converter**

| Thông số        | Giá trị                        | Ghi chú                  |
| --------------- | ------------------------------ | ------------------------ |
| IC chính        | LM2596–5.0 (Texas Instruments) | Fixed output 5V          |
| Điện áp vào     | 7–40 V DC                      | Từ ắc quy xe 12V hoặc 24V |
| Điện áp ra      | 5V                             | Cấp cho 5V Rail          |
| Dòng tối đa     | 3A                             | Đủ cho tracker + sạc pin |
| Hiệu suất       | ~85%                           | Tiêu biểu tại dải 12V/24V -> 5V  |
| Tần số dao động | 150 kHz                        |                          |
| Inductor L1     | 100 uH, 3–5A                   | Loại shielded            |
| Tụ vào C1       | 100 uF, 50V                    | Electrolytic             |
| Tụ ra C2        | 220 uF, 16V                    | Electrolytic             |
| Diode D1        | 1N5822 (Schottky, 3A, 40V)     | Freewheeling diode       |

Sơ đồ mạch:

```text
Vin (12V/24V) --+-- C1 (100uF/50V) --+-- LM2596 --+-- L1 (100uH) --+-- 5V Output
            |                     |             |                 |
            +-- GND               +-- GND       +-- D1 (1N5822)--+
                                                     |
                                                     +-- C2 (220uF/16V) — GND
```

**Tính toán chu kỳ nhiệm vụ (Duty Cycle):**

```
D_12V = Vout / Vin = 5V / 12V = 0.417 (41.7%)
D_24V = Vout / Vin = 5V / 24V = 0.208 (20.8%)
```

**Tính toán tổn hao nhiệt:**

```
P_loss = (1 - hiệu_suất) x P_out
       = (1–0.85) x (5V x 3A)
       = 0.15 x 15W = 2.25W
```

Với tổn hao nhiệt 2.25W ở công suất tối đa, IC LM2596 cần được gắn tản nhiệt (heatsink) để đảm bảo nhiệt độ hoạt động trong giới hạn cho phép.

![Hình 4.7 - Sơ đồ nguyên lý mạch Buck Converter LM2596](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–7.png)

*Hình 4.7: Sơ đồ nguyên lý mạch Buck Converter LM2596*

> Nguồn: Hình vẽ của tác giả

#### c) Mạch tăng áp Boost Converter (3.7V -> 5V)

Mạch boost converter sử dụng IC MT3608 để tăng điện áp từ pin Li-ion 21700 (3.0–4.2V, danh định 3.7V) lên 5V, cung cấp nguồn dự phòng khi ắc quy xe yếu.

**Bảng 4.3: Thông số thiết kế mạch Boost Converter**

| Thông số          | Giá trị                     | Ghi chú                     |
| ----------------- | --------------------------- | --------------------------- |
| IC chính          | MT3608 (Step-Up Converter)  | Adjustable output           |
| Điện áp vào       | 2–24V (thực tế 3.0–4.2V)    | Từ pin 21700                |
| Điện áp ra        | 5V (điều chỉnh bằng R1, R2) | Cấp cho 5V Rail             |
| Dòng tối đa       | 2A                          | Đủ cho tracker khi dùng pin |
| Hiệu suất         | ~85%                        |                             |
| Inductor L1       | 22 uH, 2–3A                 | Shielded                    |
| Tụ vào C1         | 100 uF, 16V                 | Electrolytic                |
| Tụ ra C2          | 220 uF, 16V                 | Electrolytic                |
| Điện trở hồi tiếp | R1 = R2 = 10 kΩ           | Vout = 0.6V x (1 + R1/R2)   |

**Tính toán dòng vào khi tải 2A:**

```
I_in = I_out x (V_out / V_in) / hiệu_suất
     = 2A x (5V / 3.7V) / 0.85
     = 3.18A
```

Kết quả cho thấy pin 21700 cần cung cấp dòng tối đa 3.18A khi đầu ra tải 2A. Với dung lượng 5000 mAh và khả năng xả dòng cao, mức dòng này vẫn nằm trong phạm vi hoạt động an toàn.

![Hình 4.8 - Sơ đồ nguyên lý mạch Boost Converter MT3608](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–8.jpg)

*Hình 4.8: Sơ đồ nguyên lý mạch Boost Converter MT3608*

> Nguồn: Hình vẽ của tác giả

#### d) Mạch chuyển mạch nguồn Power MUX

Bộ chuyển mạch nguồn (Power MUX) có nhiệm vụ tự động chuyển đổi giữa nguồn ắc quy và nguồn pin dự phòng dựa trên điện áp ắc quy. Hệ thống hỗ trợ hai phương án thiết kế:

**Phương án 1 - Relay Module (khuyến nghị cho đồ án):**

```text
Buck Output (5V từ ắc quy) --+-- Relay NO --+-- 5V Rail
                              |              |
                              +-- Relay COM--+
                                             |
Boost Output (5V từ pin)  ------- Relay NC --+
```

- GPIO HIGH -> Relay ON -> sử dụng nguồn từ ắc quy (qua Buck)
- GPIO LOW -> Relay OFF -> sử dụng nguồn từ pin dự phòng (qua Boost)
- Ưu điểm: Đơn giản, dễ mua, giá rẻ (~5,000 VND), không cần gate driver

**Phương án 2 - MOSFET P-channel (chuyên nghiệp hơn):**

```text
Buck Output --+-- Q1 (P-MOS IRF9540N) --+-- 5V Rail
              |                          |
              +-- Gate Control (GPIO18)  |
                                         |
Boost Output --+-- Q2 (P-MOS IRF9540N) --+
               |
               +-- Gate Control (GPIO18 đảo)

Điện trở bảo vệ:
D1 (Schottky 1N5822) tu Buck  --+-- 5V Rail (Diode OR backup)
D2 (Schottky 1N5822) tu Boost --+
```

**Bảng 4.4: Logic chuyển nguồn tự động**

| Trạng thái          | IGN | U_batt  | Nguồn Tracker | Sạc Pin | Cảnh báo |
| ------------------- | --- | ------- | ------------- | ------- | -------- |
| Xe chạy bình thường | ON  | Profile 12V: U_batt >= 13.0V; Profile 24V: U_batt >= 26.0V | Ắc quy        | Có      | Không    |
| Xe đỗ bình thường   | OFF | Profile 12V: U_batt > 12.0V; Profile 24V: U_batt > 24.0V   | Ắc quy        | Không   | Không    |
| Ắc quy yếu          | OFF | Profile 12V: U_batt <= 12.0V; Profile 24V: U_batt <= 24.0V | Pin 21700     | Không   | Có       |
| Ắc quy phục hồi     | OFF | Profile 12V: U_batt >= 12.2V; Profile 24V: U_batt >= 24.4V | Ắc quy        | Không   | Có       |

*Ghi chú: Ngưỡng LVD cắt sâu để bảo vệ ắc quy: 11.5V (profile 12V) và 23.0V (profile 24V).*

Cơ chế hysteresis theo profile (12V: 12.0V OFF, 12.2V ON; 24V: 24.0V OFF, 24.4V ON) được áp dụng để tránh hiện tượng dao động liên tục khi điện áp ắc quy nằm gần ngưỡng chuyển đổi.

![Hình 4.9 - Sơ đồ mạch Power MUX và logic chuyển nguồn tự động](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–9.png)

*Hình 4.9: Sơ đồ mạch Power MUX và logic chuyển nguồn tự động*

> Nguồn: Hình vẽ của tác giả

#### e) Mạch sạc pin IP2312

IC sạc IP2312 (Injoinic) được sử dụng để sạc pin Li-ion 21700 khi xe đang hoạt động. Module sạc nhận nguồn 5V từ bus nguồn chính (qua Buck converter) và sạc pin với dòng tối đa 3A.

**Bảng 4.5: Thông số mạch sạc IP2312**

| Thông số          | Giá trị                                         |
| ----------------- | ----------------------------------------------- |
| IC sạc            | IP2312 (Injoinic)                               |
| Điện áp vào       | 4.5–5.5V (từ 5V Rail)                           |
| Điện áp sạc       | 4.2V (chuẩn Li-ion)                             |
| Dòng sạc tối đa   | 3A (có thể điều chỉnh)                          |
| Hiệu suất         | ~85–90%                                         |
| Bảo vệ            | Quá dòng, quá nhiệt, ngược cực, tự ngắt khi đầy |
| Thời gian sạc đầy | ~2–2.5 giờ (pin 5000 mAh)                       |

Sơ đồ kết nối:

```text
5V Rail --+-- IP2312 Module --+-- BMS/Protection Board --+-- Pin 21700
          |                   |                           |
          +-- GND             +-- GND                     +-- GND

ESP32 GPIO5 — R (10k) — IP2312 EN Pin
```

**Điều kiện sạc được điều khiển bởi firmware:**

- IGN ON và U_batt vượt ngưỡng profile (ví dụ > 12V cho hệ 12V): Bật sạc (GPIO5 = HIGH)
- IGN OFF: Tắt sạc (GPIO5 = LOW) để bảo vệ ắc quy
- U_batt dưới ngưỡng Switch_OFF của profile (12V: <=12.0V, 24V: <=24.0V): Tắt sạc (GPIO5 = LOW) để bảo vệ ắc quy

**Bảo vệ pin:** Board bảo vệ BMS 1S 3A được sử dụng kèm với pin 21700, cung cấp các chức năng bảo vệ quá xả (< 2.5V), quá sạc (> 4.25V), ngắn mạch và giới hạn dòng xả tối đa 3A.

![Hình 4.10 - Sơ đồ mạch sạc IP2312 và bảo vệ pin 21700](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–10.jpg)

*Hình 4.10: Sơ đồ mạch sạc IP2312 và bảo vệ pin 21700*

> Nguồn: Hình vẽ của tác giả

#### f) Mạch giám sát điện áp Low Voltage Disconnect (LVD)

Hệ thống sử dụng phương pháp giám sát điện áp bằng phần mềm (Software-based) thông qua ADC của ESP32-S3, kết hợp với mạch chia áp (voltage divider) R1 = 100 kΩ, R2 = 10 kΩ.

Phương pháp này được lựa chọn vì các ưu điểm:
- Không cần linh kiện ngoài bổ sung (sử dụng ADC có sẵn của ESP32)
- Linh hoạt trong việc điều chỉnh ngưỡng trong firmware
- Dễ triển khai hysteresis bằng phần mềm
- Đủ độ chính xác cho ứng dụng này (ADC 12-bit)

Ngoài ra, hệ thống cũng hỗ trợ tùy chọn bổ sung một comparator LM393 (hardware-based) kết nối với GPIO19 để cung cấp kiểm tra nhanh trạng thái nguồn như một lớp dự phòng (backup) cho ADC.

---

#### g) Thiết kế vỏ hộp bảo vệ (Enclosure Design)

#### a) Yêu cầu thiết kế

Vỏ hộp bảo vệ cần đáp ứng các yêu cầu sau:

- **Kích thước nhỏ gọn:** Phù hợp lắp đặt dưới táp-lô hoặc gần cổng OBD2, kích thước tối đa khoảng 100 x 70 x 35 mm
- **Tản nhiệt:** Đảm bảo thông gió cho các IC công suất (LM2596, MT3608) với tổn hao nhiệt tổng cộng có thể lên đến 3–4W
- **Bảo vệ:** Chống bụi, chống nước cơ bản (IP54 hoặc tương đương) cho môi trường bên trong xe
- **Tiếp cận anten:** Bố trí vị trí phù hợp cho anten 4G/LTE, anten GNSS và anten BLE để đảm bảo chất lượng thu phát tín hiệu

#### b) Bố cục bên trong

Bố cục bên trong vỏ hộp được thiết kế theo nguyên tắc phân vùng chức năng:

```text
+--------------------------------------------------+
|                  VỎ HỘP BẢO VỆ                   |
|  +----------+  +----------+  +----------+        |
|  |  ESP32   |  | SIM7600CE-T |  |  IP2312  |        |
|  |  S3      |  | LTE/GNSS    |  |  Charger |        |
|  |  DevKit  |  | tích hợp     |  |  + BMS   |        |
|  +----------+  +----------+  +----------+        |
|                                                  |
|  +----------+  +----------+  +----------+        |
|  |  LM2596  |  |  MT3608  |  |  Relay   |        |
|  |  Buck    |  |  Boost   |  |  Module  |        |
|  +----------+  +----------+  +----------+        |
|                                                  |
|  +----------------------------------------------+|
|  |  Pin 21700 + Giá đỡ pin                      ||
|  +----------------------------------------------+|
|                                                  |
|  [Anten 4G/LTE]  [Anten GNSS]  [Cổng OBD2]     |
+--------------------------------------------------+
```

![Hình 4.11 - Sơ đồ bố cục bên trong vỏ hộp bảo vệ](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–11.png)

*Hình 4.11: Sơ đồ bố cục bên trong vỏ hộp bảo vệ*

> Nguồn: Hình vẽ của tác giả

#### c) Các lưu ý thiết kế

**Tản nhiệt:** Các module công suất (LM2596, MT3608) được bố trí tại vị trí thông thoáng, tách khỏi cảm biến nhiệt độ; khe thông gió đặt ở mặt bên và mặt dưới vỏ hộp. IC LM2596 được gắn heatsink khi vận hành công suất cao.

**Anten:** Anten 4G/LTE và GNSS đặt ở mặt trên vỏ hộp, hướng lên trên để tối ưu thu sóng. Anten BLE (tích hợp trong ESP32-S3) hướng về cổng OBD2 để rút ngắn khoảng cách kết nối với adapter vgate iCar Pro. Các anten cách nhau tối thiểu 30 mm nhằm giảm nhiễu tương hỗ.

**Chống nhiễu điện từ (EMI):** Mạch công suất (Buck, Boost) được bố trí tách xa mạch tín hiệu (UART, I2C, ADC); dây nguồn và dây tín hiệu đi riêng, không chạy song song.

**Kết nối:** Cổng kết nối OBD2, cổng SIM card và cổng USB (cho nạp firmware/debug) được bố trí ở mặt bên vỏ hộp, dễ tiếp cận khi lắp đặt và bảo trì.

---

### 4.1.2. Triển khai firmware, cloud và giao diện điều khiển

Các nội dung triển khai chi tiết ở tầng phần mềm được trình bày tại các mục 4.2.3 đến 4.2.7 để đồng bộ với luồng chế tạo, lắp ráp và vận hành hệ thống.

---

## 4.2. Chế tạo và lắp ráp hệ thống – Manufacture and Assembly

### 4.2.1. Lắp ráp mạch điện tử (Electronics Assembly)

#### a) Danh sách vật liệu (Bill of Materials)

**Bảng 4.6: Danh sách vật liệu đầy đủ cho hệ thống tracker**

| STT | Thành phần                     | Đơn vị | SL  | Giá ước tính (VND) | Ghi chú                                    |
| --- | ------------------------------ | ------ | --- | ------------------ | ------------------------------------------ |
| 1   | ESP32-S3 DevKitC-1             | Cái    | 1   | 100,000–200,000    | Module ESP32-S3-WROOM-1, 4MB Flash trở lên |
| 2   | LIS3DH Breakout Board          | Cái    | 1   | 20,000–50,000      | Cảm biến gia tốc 3 trục, giao tiếp I2C     |
| 3   | vgate iCar Pro (OBD2 BLE)      | Cái    | 1   | 150,000–300,000    | Adapter OBD2 BLE 4.0, tương thích ESP32-S3 |
| 4   | SIMCom SIM7600CE-T | Cái    | 1   | 330,000–500,000    | Modem LTE Cat-4 + GNSS tích hợp, anten và khe SIM |
| 5   | Pin 21700 Li-ion 5000mAh       | Cái    | 1   | 100,000–200,000    | Loại có protection board                   |
| 6   | Module sạc IP2312 (3A)         | Cái    | 1   | 20,000–40,000      | Module sạc Type-C, dòng sạc 3A             |
| 7   | BMS/Protection Board 1S        | Cái    | 1   | 10,000–20,000      | BMS 1S 3A hoặc DW01+MOSFET                 |
| 8   | Module Buck LM2596 (7–40V->5V) | Cái    | 1   | 15,000–25,000      | Dòng ra 3A, tương thích hệ 12V/24V         |
| 9   | Module Boost MT3608 (3.7V->5V) | Cái    | 1   | 10,000–15,000      | Dòng ra 2A, điều chỉnh điện áp             |
| 10  | Relay Module 5V 1 kênh         | Cái    | 1   | 5,000–10,000       | Điều khiển chuyển nguồn Power MUX          |
| 11  | Điện trở (10k, 2.2k, v.v.)     | Gói    | 1   | 5,000–10,000       | Voltage divider, pull-up/pull-down         |
| 12  | Tụ điện (100uF, 220uF, v.v.)   | Gói    | 1   | 5,000–10,000       | Lọc nhiễu, decoupling                      |
| 13  | Diode Schottky 1N5822          | Cái    | 2   | 2,000–5,000        | Diode OR dự phòng                          |
| 14  | Connector, Header Pin          | Gói    | 1   | 10,000–20,000      | Kết nối dây, header pin                    |
| 15  | PCB (nếu tự thiết kế)          | Cái    | 1   | 50,000–100,000     | PCB 2 lớp, kích thước ~50x50 mm            |
| 16  | Vỏ bảo vệ                      | Cái    | 1   | 50,000–100,000     | Vỏ nhựa hoặc kim loại                      |
| 17  | Dây nối, cáp điện              | Mét    | —  | 20,000–30,000      | Dây điện, cáp USB                          |
| 18  | Linh kiện phụ trợ khác         | —     | —  | 20,000–30,000      | Cầu chì, công tắc, LED chỉ thị             |

**Bảng 4.7: Tổng chi phí ước tính**

| Hạng mục                                      | Chi phí (VND)         |
| --------------------------------------------- | --------------------- |
| Thành phần chính (MCU, cảm biến, modem, OBD2) | 670,000–1,250,000     |
| Hệ thống quản lý nguồn                        | 50,000–80,000         |
| Linh kiện phụ trợ                             | 50,000–100,000        |
| PCB (nếu tự thiết kế)                         | 50,000–100,000        |
| Vỏ bảo vệ                                     | 50,000–100,000        |
| **Tổng cộng**                                 | **870,000–1,630,000** |

#### b) Quy trình lắp ráp

Quy trình lắp ráp mạch điện tử được triển khai theo các bước sau:

**Bước 1 - Kiểm tra linh kiện:** Kiểm tra tất cả các module và linh kiện trước khi lắp ráp. Test riêng từng module (ESP32-S3, LM2596, MT3608, IP2312, SIM7600CE-T) để đảm bảo hoạt động đúng.

**Bước 2 - Lắp ráp mạch nguồn:** Kết nối module Buck LM2596 với nguồn ắc quy xe (12V hoặc 24V), điều chỉnh điện áp ra 5V. Kết nối module Boost MT3608 với pin 21700, điều chỉnh điện áp ra 5V. Lắp relay module làm Power MUX. Kết nối module sạc IP2312 với pin và BMS.

**Bước 3 - Kết nối vi điều khiển:** Gắn ESP32-S3 DevKitC lên breadboard hoặc PCB. Kết nối các chân GPIO theo bảng phân công (Bảng 4.1). Kết nối nguồn 5V từ Power MUX đến chân VIN của ESP32-S3 (qua LDO nội bộ xuống 3.3V).

**Bước 4 - Kết nối ngoại vi:** Kết nối modem SIM7600CE-T qua UART1 (GPIO16, GPIO17) và điều khiển PWRKEY qua GPIO25, kết nối cảm biến LIS3DH qua I2C (GPIO22, GPIO23), và kết nối mạch đo điện áp ắc quy (voltage divider) vào GPIO4 (ADC).

**Bước 5 - Kiểm tra tích hợp:** Nạp firmware cơ bản để kiểm tra từng chức năng: đọc ADC, điều khiển GPIO, giao tiếp UART với modem, quét BLE, đọc I2C từ LIS3DH. Kiểm tra chuyển nguồn tự động bằng cách thay đổi điện áp đầu vào.

**Bước 6 - Lắp ráp vào vỏ:** Định vị các module bên trong vỏ hộp theo bố cục đã thiết kế. Cố định bằng ốc vít hoặc keo nhiệt. Kết nối anten 4G/LTE và GNSS. Đóng nắp vỏ hộp và kiểm tra tổng thể.

![Hình 4.12 - Các bước lắp ráp mạch điện tử trên breadboard (prototype)](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–12.png)

*Hình 4.12: Các bước lắp ráp mạch điện tử trên breadboard (prototype)*

> Nguồn: Hình chụp từ hệ thống thực tế (thiết bị prototype)

![Hình 4.13 - Mạch điện tử hoàn chỉnh sau khi lắp ráp](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–13.png)

*Hình 4.13: Mạch điện tử hoàn chỉnh sau khi lắp ráp*

> Nguồn: Hình chụp từ hệ thống thực tế (thiết bị prototype)

#### c) Kiểm tra và hiệu chuẩn

Sau khi lắp ráp, hệ thống cần được kiểm tra và hiệu chuẩn:

- **Hiệu chuẩn ADC:** So sánh giá trị điện áp đọc từ ADC với giá trị đo từ đồng hồ vạn năng (multimeter). Điều chỉnh hệ số hiệu chỉnh trong firmware nếu cần.
- **Kiểm tra chuyển nguồn:** Mô phỏng tình huống ắc quy yếu theo profile cấu hình (ví dụ hệ 12V giảm từ 12V xuống dưới 12V), xác nhận hệ thống tự động chuyển sang pin dự phòng.
- **Kiểm tra sạc pin:** Xác nhận IC sạc IP2312 hoạt động đúng: sạc khi IGN ON, ngừng sạc khi IGN OFF hoặc U_batt thấp.
- **Kiểm tra giao tiếp:** Xác nhận modem phản hồi lệnh AT qua UART, cảm biến LIS3DH trả về dữ liệu qua I2C, kết nối BLE với OBD2 adapter thành công.

---

### 4.2.2. Lắp đặt trong xe (Vehicle Installation)

#### a) Vị trí lắp đặt

Thiết bị tracker được lắp đặt tại một trong các vị trí sau trong xe:

- **Dưới táp-lô (dashboard):** Vị trí khuyến nghị, gần cổng OBD2 (thường nằm dưới vô-lăng bên trái), dễ dàng kết nối nguồn và OBD2. Không gian đủ cho vỏ hộp và không can thiệp đến vùng hoạt động của tài xế.
- **Dưới ghế lái hoặc ghế phụ:** Vị trí thay thế khi không gian dưới táp-lô không đủ. Cần kéo dài cáp kết nối OBD2.
- **Trong hộp cầu chì (fuse box):** Vị trí kín đáo, phù hợp cho ứng dụng theo dõi không cần người dùng can thiệp.

#### b) Kết nối với cổng OBD2

Cổng OBD2 (16 chân) cung cấp cả nguồn điện và giao tiếp chẩn đoán:

```text
Cổng OBD2 (16 chân):

Chân 16: Nguồn Battery Power (+12V hoặc +24V tùy hệ xe) ---> Đầu vào mạch Buck LM2596
Chân 4:  GND (Chassis Ground)           ---> GND chung hệ thống
Chân 5:  GND (Signal Ground)            ---> GND chung hệ thống

(Kết nối OBD2 Data thông qua BLE với adapter vgate iCar Pro
 cắm trực tiếp vào cổng OBD2 của xe)
```

**Lưu ý:** Adapter vgate iCar Pro được cắm trực tiếp vào cổng OBD2 của xe. ESP32-S3 giao tiếp với adapter này qua BLE, không cần kết nối dây vật lý cho phần dữ liệu OBD2. Chỉ có nguồn điện từ ắc quy xe (12V hoặc 24V) và GND được lấy từ cổng OBD2 thông qua dây nối riêng.

![Hình 4.14 - Minh họa vị trí cổng OBD2 trên xe và cách kết nối](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–14.png)

*Hình 4.14: Minh họa vị trí cổng OBD2 trên xe và cách kết nối*

> Nguồn: Hình vẽ của tác giả

#### c) Đi dây và kết nối anten

**Dây nguồn:** Dây nguồn từ cổng OBD2 đến thiết bị tracker (12V hoặc 24V tùy hệ xe) sử dụng dây điện tiết diện tối thiểu 0.5 mm2 (AWG 22), có bọc cách điện tốt. Cầu chì (fuse) 5A được đặt tại đầu dây nguồn gần cổng OBD2 để bảo vệ mạch.

**Anten 4G/LTE và GNSS:** Anten được đặt hướng lên mặt trên táp-lô hoặc gần kính chắn gió phía trước để đảm bảo thu sóng tốt nhất. Dây anten (cáp đồng trục) được đi dọc theo khung xe, tránh chạy song song với dây điện nguồn.

**Anten BLE:** Do BLE sử dụng anten PCB tích hợp trên ESP32-S3, cần đảm bảo khoảng cách từ thiết bị tracker đến adapter vgate iCar Pro (cắm ở cổng OBD2) không quá 3 mét và không bị che chắn bởi vật liệu kim loại dày.

#### d) Quản lý cáp và chống nhiễu

- **Cố định cáp:** Tất cả các dây nối được cố định bằng dây rút nhựa (cable tie) và kẹp cáp, tránh các dây bị rung lắc gây tiếng ồn hoặc hư hỏng tiếp xúc.
- **Chống nhiễu EMI:** Dây tín hiệu UART (từ ESP32 đến modem) được sử dụng loại cáp xoắn đôi (twisted pair) hoặc cáp có bọc chống nhiễu. Dây nguồn và dây tín hiệu được đi riêng, không chạy song song để giảm nhiễu điện từ từ hệ thống điện của xe.
- **Chống ẩm:** Các mối nối điện được bọc bằng keo nhiệt hoặc ống co nhiệt (heat shrink tube) để chống ẩm và chống oxy hóa trong môi trường xe.

![Hình 4.15 - Minh họa lắp đặt thiết bị tracker trong xe và đi dây](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–15.jpg)

*Hình 4.15: Minh họa lắp đặt thiết bị tracker trong xe và đi dây*

> Nguồn: Hình chụp từ hệ thống thực tế (lắp đặt trong xe)

#### e) Kiểm tra sau lắp đặt

Sau khi lắp đặt xong, cần thực hiện các kiểm tra sau:

1. **Kiểm tra nguồn điện:** Đo điện áp tại đầu vào thiết bị, xác nhận điện áp ắc quy xe (12V hoặc 24V) được cấp đầy đủ
2. **Kiểm tra kết nối BLE:** Xác nhận ESP32-S3 kết nối được với adapter vgate iCar Pro và đọc dữ liệu OBD2 (IGN, RPM, tốc độ)
3. **Kiểm tra GNSS:** Xác nhận GNSS tích hợp trên SIM7600CE-T bắt được vệ tinh và trả về tọa độ GPS chính xác (sai số < 5 mét)
4. **Kiểm tra 4G/LTE:** Xác nhận modem đăng ký mạng thành công, gửi được dữ liệu lên server qua MQTT
5. **Kiểm tra chuyển nguồn:** Tắt máy xe (IGN OFF), xác nhận thiết bị chuyển sang chế độ tiết kiệm năng lượng và sử dụng pin dự phòng khi cần
6. **Kiểm tra deep sleep:** Xác nhận ESP32-S3 vào chế độ deep sleep khi xe đỗ, và đánh thức đúng khi phát hiện rung động (qua LIS3DH) hoặc đến chu kỳ heartbeat

![Hình 4.16 - Kết quả kiểm tra hệ thống sau khi lắp đặt trong xe](./assets/figures/07-chuong-4-trien-khai-hardware-hinh-4–16.png)

*Hình 4.16: Kết quả kiểm tra hệ thống sau khi lắp đặt trong xe*

> Nguồn: Hình chụp từ hệ thống thực tế (kết quả kiểm tra)

---

