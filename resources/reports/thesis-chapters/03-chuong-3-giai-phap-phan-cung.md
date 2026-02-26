# CHƯƠNG 3. CÁC GIẢI PHÁP THIẾT KẾ – DESIGN SOLUTIONS

Chương này trình bày quá trình phân tích, đề xuất và lựa chọn các giải pháp thiết kế cho hệ thống IoT giám sát phương tiện. Nội dung được tổ chức theo bốn tầng chính: (1) phần cứng thiết bị tracker, (2) firmware nhúng trên vi điều khiển, (3) hệ thống backend và cloud, và (4) giao diện người dùng frontend. Ở mỗi tầng, các phương án thay thế được so sánh bằng ma trận trọng số để đánh giá ưu nhược điểm, từ đó lựa chọn phương án tối ưu theo tiêu chí hiệu năng, chi phí và khả năng mở rộng.

## 3.1. Phân tích tổng hợp – General analysis

### 3.1.1. Phân tích và lựa chọn phần cứng

Phần này trình bày quá trình phân tích, lựa chọn và thiết kế các thành phần phần cứng cho thiết bị theo dõi xe IoT. Mục tiêu thiết kế là xây dựng thiết bị tracker nhỏ gọn, tiêu thụ năng lượng thấp, có khả năng thu thập dữ liệu qua OBD2, định vị GNSS và truyền dữ liệu về máy chủ qua mạng 4G/LTE. Các quyết định kỹ thuật được xem xét theo các tiêu chí: độ tin cậy, khả năng vận hành liên tục với nguồn dự phòng, mức độ tích hợp và mức độ phù hợp ngân sách.

#### 3.1.1.1. Sơ đồ khối hệ thống

Hệ thống tracker được tổ chức theo kiến trúc module với năm khối chức năng chính, trong đó ESP32-S3 đóng vai trò điều phối trung tâm. Sơ đồ khối tổng thể được trình bày như sau:

![Hình 3.1 - Sơ đồ khối tổng thể hệ thống tracker](./assets/figures/03-chuong-3-giai-phap-phan-cung-hinh-3–1.jpg)

*Hình 3.1: Sơ đồ khối tổng thể hệ thống tracker*

> Nguồn: Hình vẽ của tác giả

```
+-----------------------------------------------------------+
| HỆ THỐNG TRACKER                              |
| --------------------------------------------- |
|                                               |
| +------------------------------------+        |
|                                               | ESP32-S3 (Vi Điều Khiển Trung Tâm) |                                |
|                                               | - Xử lý logic điều khiển           |                                |
|                                               | - Quản lý deep sleep               |                                |
|                                               | - ADC đo điện áp ắc quy            |                                |
|                                               | - BLE 5.0 kết nối OBD2             |                                |
| +------------------------------------+        |
|                                               |                                    |                                |          |  |         |
| I2C     BLE     UART      GPIO      ADC       |
|                                               |                                    |                                |          |  |         |
| +-----+ +----+ +--------+ +------+ +--------+ |
|                                               | LIS3D                              |                                | OBD2     |  | A7600CE |  | Power |  | Voltage |  |
|                                               | H IMU                              |                                | BLE      |  | -T 4G+  |  | MUX   |  | Divider |  |
|                                               |                                    |                                | vgat     |  | GNSS    |  |       |  |         |  |
| +-----+                                       | e                                  | +--------+ +------+ +--------+ |
| +----+                                        |
|                                               |
| +------------------------------------+        |
|                                               | Hệ thống quản lý nguồn             |                                |
|                                               | - Buck LM2596 (7–40V -> 5V, tương thích 12V/24V) |                                |
|                                               | - Boost MT3608 (3.7V -> 5V)        |                                |
|                                               | - Power MUX (Relay/MOSFET)         |                                |
|                                               | - Charger IP2312 (sạc pin)         |                                |
| +------------------+-----------------+        |
|                                               |                                    |
| +-----------+-----------+                     |
|                                               |                                    |                                |
| +------+-------+       +------+------+        |
|                                               | BMS + Pin                          |                                | LDO 3.3V |  |
|                                               | 1x21700 5Ah                        |                                | (Logic)  |  |
| +---------------+       +------------+        |
|                                               |
+-----------------------------------------------------------+
          |                              |
   +------+------+               +------+------+
   |   Ắc quy    |               |  Pin backup |
   |   xe 12V/24V|               |  21700      |
   +-------------+               +-------------+
```

Hệ thống vận hành theo ba chế độ chính: (1) chế độ lái xe — khi động cơ bật (IGN ON), các module cần thiết được kích hoạt; (2) chế độ đỗ xe — khi động cơ tắt (IGN OFF), ESP32 chuyển sang deep sleep và chỉ IMU LIS3DH duy trì giám sát chuyển động; (3) chế độ cảnh báo — khi IMU ghi nhận chuyển động bất thường, hệ thống tự đánh thức và gửi cảnh báo qua 4G.

Luồng dữ liệu được tổ chức theo ba nhánh: OBD2 (RPM, tốc độ, nhiên liệu) đọc qua BLE từ adapter vgate iCar Pro; vị trí lấy từ GNSS tích hợp trong modem A7600CE-T; và dữ liệu chuyển động thu từ IMU LIS3DH qua I2C. ESP32-S3 tổng hợp, đóng gói và truyền toàn bộ dữ liệu lên máy chủ qua MQTT trên kết nối 4G/LTE.

#### 3.1.1.2. Phân tích và lựa chọn vi điều khiển (MCU)

Việc lựa chọn vi điều khiển (MCU) là quyết định thiết kế quan trọng nhất, ảnh hưởng trực tiếp đến khả năng tích hợp các module ngoại vi, mức tiêu thụ năng lượng, và độ phức tạp phát triển firmware. Ba ứng viên được đưa vào quá trình đánh giá là ESP32-S3 của Espressif, STM32L4 của STMicroelectronics, và nRF52840 của Nordic Semiconductor.

##### a) Các ứng viên

**ESP32-S3** là vi điều khiển dual-core Xtensa LX7 hoạt động ở tần số 240 MHz, tích hợp sẵn WiFi 802.11 b/g/n và Bluetooth Low Energy (BLE) 5.0. Module này có 512 KB SRAM, 4–16 MB Flash, 3 cổng UART, 2 cổng I2C, ADC 12-bit với 20 kênh, và hỗ trợ external wakeup từ deep sleep với dòng tiêu thụ 10–15 µA [1].

**STM32L4** là dòng vi điều khiển siêu tiết kiệm năng lượng của STMicroelectronics, sử dụng nhân ARM Cortex-M4 hoạt động ở 80 MHz. Dòng này nổi tiếng với mức tiêu thụ cực thấp ở chế độ STOP2 (1–3 µA), tuy nhiên không tích hợp sẵn module truyền thông không dây [2].

**nRF52840** là vi điều khiển của Nordic Semiconductor với nhân ARM Cortex-M4 ở 64 MHz, tích hợp BLE 5.0 và 802.15.4. Module này có dòng deep sleep 1.5 µA nhưng bị hạn chế về số lượng UART (chỉ 2 cổng) và tài nguyên tính toán [3].

##### b) Bảng đánh giá đa tiêu chí

Để lựa chọn MCU phù hợp, nhóm áp dụng phương pháp đánh giá đa tiêu chí có trọng số (weighted scoring matrix). Các tiêu chí và trọng số được xác lập trên cơ sở yêu cầu kỹ thuật cụ thể của hệ thống tracker.

[Bảng 3.1: Ma trận đánh giá lựa chọn vi điều khiển]

| STT           | Tiêu chí             | Trọng số | ESP32-S3 | STM32L4  | nRF52840 |
| ------------- | -------------------- | -------- | -------- | -------- | -------- |
| 1             | BLE tích hợp         | 0.20     | 10       | 3        | 10       |
| 2             | Số lượng UART (>= 3) | 0.15     | 10       | 10       | 5        |
| 3             | Tiêu thụ deep sleep  | 0.15     | 7        | 10       | 9        |
| 4             | Độ dễ phát triển     | 0.15     | 10       | 5        | 7        |
| 5             | Chi phí              | 0.10     | 9        | 6        | 7        |
| 6             | Cộng đồng hỗ trợ     | 0.10     | 10       | 8        | 7        |
| 7             | RAM và Flash         | 0.10     | 9        | 7        | 8        |
| 8             | ADC 12-bit           | 0.05     | 9        | 9        | 8        |
| **Tổng điểm** | **1.00**             | **9.20** | **6.75** | **7.65** |

Ghi chú: Điểm đánh giá theo thang 1–10, trong đó 10 là tốt nhất.

##### c) Phân tích chi tiết các tiêu chí

**BLE tích hợp (trọng số 0.20):** Đây là tiêu chí quan trọng nhất vì hệ thống cần kết nối BLE với adapter OBD2 vgate iCar Pro (BLE 4.0). ESP32-S3 tích hợp sẵn BLE 5.0, tương thích ngược với BLE 4.0, cho phép kết nối trực tiếp không cần module ngoài. STM32L4 không có BLE tích hợp, cần thêm module ngoài như STM32WB hoặc HM-10, làm tăng chi phí và độ phức tạp. nRF52840 có BLE 5.0 nhưng bị hạn chế về UART.

**Số lượng UART (trọng số 0.15):** Hệ thống cần ít nhất 3 cổng UART — một cho modem A7600CE-T, một cho debug/log, và một dự phòng. ESP32-S3 và STM32L4 đều có 3 cổng UART trở lên, trong khi nRF52840 chỉ có 2 cổng, không đủ cho yêu cầu hệ thống.

**Tiêu thụ deep sleep (trọng số 0.15):** STM32L4 dẫn đầu với 1–3 µA ở chế độ STOP2, thấp hơn ESP32-S3 (10–15 µA) khoảng 3–5 lần. Tuy nhiên, sự chênh lệch này không ảnh hưởng đáng kể đến thời gian hoạt động tổng thể khi sử dụng pin 5000 mAh. Với dòng trung bình 7 mA ở chế độ heartbeat, sự khác biệt về dòng deep sleep chỉ tạo ra chênh lệch khoảng 2–3 ngày trong tổng thời gian hoạt động 20–35 ngày.

**Độ dễ phát triển (trọng số 0.15):** ESP32-S3 hỗ trợ cả Arduino IDE và ESP-IDF framework, có cộng đồng phát triển lớn với hàng nghìn ví dụ code sẵn có. STM32L4 yêu cầu kiến thức sâu về HAL và CubeMX, thời gian phát triển lâu hơn đáng kể. nRF52840 sử dụng nRF Connect SDK, ít tài liệu tiếng Việt và cộng đồng nhỏ hơn.

##### d) Kết luận lựa chọn

Trên cơ sở kết quả đánh giá đa tiêu chí, **ESP32-S3** được chọn làm vi điều khiển chính cho hệ thống tracker với tổng điểm 9.20/10. Quyết định này dựa trên các lý do sau:

- BLE 5.0 tích hợp cho phép kết nối trực tiếp với OBD2 adapter mà không cần module ngoài.
- Đủ tài nguyên xử lý (dual-core 240 MHz, 512 KB SRAM) để vận hành đồng thời các tác vụ OBD2, modem, và IMU.
- Thời gian phát triển ngắn nhờ vào hệ sinh thái phát triển phong phú.
- Chi phí thấp hơn STM32L4 khoảng 30–50% (100.000–200.000 VND so với 150.000–300.000 VND).
- Tiêu thụ deep sleep 10–15 µA là chấp nhận được cho ứng dụng tracker với pin backup 5000 mAh.

[Bảng 3.2: Thông số kỹ thuật ESP32-S3 được chọn]

| Thông số         | Giá trị                                    |
| ---------------- | ------------------------------------------ |
| CPU              | Dual-core Xtensa LX7 @ 240 MHz             |
| RAM              | 512 KB SRAM                                |
| Flash            | 4–16 MB (tùy variant)                      |
| Bluetooth        | BLE 5.0 (tương thích BLE 4.0)              |
| WiFi             | 802.11 b/g/n (không sử dụng trong tracker) |
| UART             | 3 cổng                                     |
| I2C              | 2 cổng                                     |
| ADC              | 12-bit, 20 kênh                            |
| GPIO             | 45 chân                                    |
| Deep sleep       | 10–15 µA (với external wakeup)             |
| Active (BLE)     | 20–40 mA                                   |
| Module cụ thể    | ESP32-S3-WROOM-1                           |
| Board phát triển | ESP32-S3-DevKitC-1                         |

#### 3.1.1.3. Phân tích và lựa chọn modem truyền thông

Modem truyền thông đóng vai trò then chốt trong hệ thống, đảm nhận hai chức năng: (1) kết nối mạng di động 4G/LTE để truyền dữ liệu về máy chủ, và (2) định vị GNSS để xác định vị trí xe. Việc tích hợp cả hai chức năng trong một module giúp giảm chi phí, diện tích bo mạch và độ phức tạp thiết kế.

##### a) Các ứng viên

Ba module được đưa vào đánh giá là SIMCom A7600CE-T, Quectel EC200U-CN, và SIMCom SIM7600CE-T.

**SIMCom A7600CE-T** là module LTE Cat-4 với GNSS tích hợp, hỗ trợ đa băng tần LTE FDD (B1, B3, B5, B7, B8, B20), LTE TDD (B38, B40, B41), WCDMA và GSM. Module hỗ trợ giao tiếp UART, có MQTT/HTTP client tích hợp, và có thể điều khiển bằng lệnh AT chuẩn 3GPP TS 27.007 [4].

**Quectel EC200U-CN** là module LTE Cat-1 của Quectel, hỗ trợ tốc độ dữ liệu thấp hơn (uplink 5 Mbps, downlink 10 Mbps) nhưng tiêu thụ năng lượng thấp hơn. Module cũng có GNSS tích hợp nhưng giá thành tương đương A7600CE-T [5].

**SIMCom SIM7600CE-T** là module LTE Cat-4 cao cấp hơn, hỗ trợ đa băng tần rộng hơn và có giao tiếp USB bên cạnh UART. Tuy nhiên giá thành cao hơn đáng kể và tiêu thụ nhiều năng lượng hơn [6].

##### b) Bảng đánh giá đa tiêu chí

[Bảng 3.3: Ma trận đánh giá lựa chọn modem truyền thông]

| STT           | Tiêu chí            | Trọng số | A7600CE-T | EC200U-CN | SIM7600CE-T |
| ------------- | ------------------- | -------- | --------- | --------- | ----------- |
| 1             | GNSS tích hợp       | 0.20     | 10        | 9         | 10          |
| 2             | Hỗ trợ MQTT/HTTP    | 0.15     | 10        | 9         | 10          |
| 3             | Tiêu thụ năng lượng | 0.15     | 8         | 9         | 6           |
| 4             | Giao tiếp UART      | 0.15     | 10        | 10        | 10          |
| 5             | Chi phí             | 0.15     | 9         | 8         | 5           |
| 6             | Tài liệu và hỗ trợ  | 0.10     | 9         | 8         | 9           |
| 7             | Khả dụng tại VN     | 0.10     | 9         | 7         | 8           |
| **Tổng điểm** | **1.00**            | **9.35** | **8.65**  | **8.15**  |

##### c) Kết luận lựa chọn

**SIMCom A7600CE-T** được lựa chọn làm modem truyền thông chính với tổng điểm 9.35/10. Các ưu điểm nổi bật bao gồm:

- GNSS tích hợp hỗ trợ GPS, GLONASS, BeiDou và Galileo với độ chính xác 3–5 m, không cần module GPS riêng.
- Giao tiếp qua UART với lệnh AT đơn giản, dễ tích hợp với ESP32-S3 chỉ với 3 chân kết nối (TX, RX, PWRKEY).
- MQTT client tích hợp sẵn, cho phép gửi dữ liệu trực tiếp lên broker EMQX mà không cần thư viện MQTT riêng trên ESP32.
- Tiêu thụ hợp lý: 50–100 mA khi active (4G + GNSS), dưới 1 mA khi sleep.
- Có thể bật/tắt bằng GPIO (PWRKEY) để tiết kiệm năng lượng khi không cần sử dụng.
- Giá thành hợp lý (300.000–500.000 VND kèm antenna), phù hợp với ngân sách đồ án.

[Bảng 3.4: Thông số kỹ thuật SIMCom A7600CE-T]

| Thông số          | Giá trị                                          |
| ----------------- | ------------------------------------------------ |
| Loại              | LTE Cat-4 Module                                 |
| Băng tần LTE      | FDD: B1, B3, B5, B7, B8, B20; TDD: B38, B40, B41 |
| GNSS              | GPS, GLONASS, BeiDou, Galileo                    |
| Giao tiếp         | UART (115200–921600 baud)                        |
| Hỗ trợ giao thức  | MQTT, HTTP, TCP/UDP                              |
| Tiêu thụ active   | 50–100 mA                                        |
| Tiêu thụ sleep    | < 1 mA                                           |
| Điện áp hoạt động | 3.3V hoặc 5V                                     |
| GNSS cold start   | 30–60 giây                                       |
| GNSS hot start    | 5–10 giây                                        |

## 3.2. Đề xuất các giải pháp – Proposed multiple solutions

### 3.2.1. Giải pháp phần cứng

#### 3.2.1.1. Thiết kế mô-đun thu thập dữ liệu OBD2

##### a) Lựa chọn phương pháp kết nối OBD2

Thu thập dữ liệu từ ECU xe qua cổng OBD2 (On-Board Diagnostics II) là một yêu cầu cốt lõi của thiết kế tracker. Có hai hướng tiếp cận chính: sử dụng adapter OBD2 có dây (wired ELM327 qua UART) hoặc adapter OBD2 không dây (BLE ELM327). Nhóm lựa chọn kết nối không dây qua BLE dựa trên các lý do sau:

[Bảng 3.5: So sánh phương pháp kết nối OBD2]

| Tiêu chí             | OBD2 có dây (UART)                    | OBD2 không dây (BLE)                        |
| -------------------- | ------------------------------------- | ------------------------------------------- |
| Lắp đặt              | Cần chạy dây từ OBD2 port đến tracker | Không cần dây, linh hoạt vị trí đặt tracker |
| Bảo mật              | Tracker dễ bị phát hiện theo dây      | Tracker có thể giấu ở vị trí khác           |
| Bảo trì              | Khó bảo trì (dây nối cố định)         | Dễ bảo trì (chỉ rút adapter)                |
| Tiêu thụ             | ~10–30 mA (UART luôn bật)             | ~5–15 mA (BLE chỉ bật khi cần)              |
| Độ phức tạp firmware | Cần thêm UART driver                  | Cần BLE GATT client                         |
| Khả năng mở rộng     | Hạn chế bởi dây nối                   | Có thể di chuyển adapter sang xe khác       |

**Kết luận:** Phương pháp kết nối BLE được lựa chọn vì cho phép tách rời vật lý giữa tracker và adapter OBD2, tăng tính linh hoạt trong lắp đặt và bảo mật chống trộm.

##### b) Lựa chọn adapter OBD2 BLE: vgate iCar Pro

**vgate iCar Pro** là adapter OBD2 sử dụng Bluetooth Low Energy (BLE) 4.0, tương thích với BLE 5.0 của ESP32-S3. Adapter này được chọn dựa trên các tiêu chí sau:

- **Tương thích giao thức:** Hỗ trợ tập lệnh ELM327 qua BLE GATT characteristics, cho phép đọc đa dạng dữ liệu từ ECU bao gồm trạng thái động cơ (IGN), số vòng quay (RPM), tốc độ xe, mức nhiên liệu, nhiệt độ động cơ, và mã lỗi chẩn đoán (DTC) [7].
- **Khả năng kết nối:** BLE 4.0 tương thích ngược với BLE 5.0 của ESP32-S3. Thời gian kết nối lại sau deep sleep chỉ mất 1–3 giây nếu đã paired trước đó. Khoảng cách kết nối 10–30 m đủ cho mọi bố trí trong xe.
- **Tiêu thụ năng lượng:** 5–15 mA khi active, thấp hơn đáng kể so với Bluetooth Classic (10–30 mA).
- **Phổ biến và giá hợp lý:** Dễ mua trên thị trường Việt Nam với giá 150.000–300.000 VND.

![Hình 3.2 - Sơ đồ kết nối BLE giữa ESP32-S3 và vgate iCar Pro](./assets/figures/03-chuong-3-giai-phap-phan-cung-hinh-3–2.png)

*Hình 3.2: Sơ đồ kết nối BLE giữa ESP32-S3 và vgate iCar Pro*

> Nguồn: Hình vẽ của tác giả

##### c) Chiến lược kết nối theo chế độ hoạt động

Một ràng buộc thiết kế quan trọng là ESP32-S3 không thể duy trì kết nối BLE trong trạng thái deep sleep. Do đó, chiến lược kết nối OBD2 được xây dựng theo từng chế độ hoạt động:

[Bảng 3.6: Chiến lược kết nối BLE OBD2 theo chế độ hoạt động]

| Chế độ          | Cần BLE OBD2? | Lý do                                                     |
| --------------- | ------------- | --------------------------------------------------------- |
| Lái xe (IGN ON) | Có            | Đọc dữ liệu xe (RPM, tốc độ, nhiên liệu) liên tục         |
| Đỗ xe (IGN OFF) | Không         | Không cần dữ liệu OBD2, chỉ cần IMU phát hiện chuyển động |
| Cảnh báo        | Tùy chọn      | Có thể kết nối để xác nhận IGN, hoặc chỉ dùng IMU + GPS   |

Khi xe chạy (IGN ON), ESP32-S3 duy trì kết nối BLE liên tục với adapter, đọc dữ liệu OBD2 định kỳ mỗi 5–30 giây. Khi xe đỗ (IGN OFF), kết nối BLE được ngắt trước khi ESP32 vào deep sleep, vì IMU LIS3DH đủ khả năng phát hiện chuyển động bất thường (rung, kéo, cẩu xe) mà không cần dữ liệu từ OBD2. Việc này giúp tiết kiệm năng lượng đáng kể — khoảng 7.000 lần so với việc duy trì kết nối BLE [8].

Trong trường hợp adapter OBD2 không kết nối được (timeout 10 giây, retry 2–3 lần), hệ thống tự động chuyển sang phương pháp dự phòng (fallback) là đo điện áp ắc quy qua ADC để phát hiện trạng thái IGN. Phương pháp này kém chính xác hơn nhưng đảm bảo hệ thống vẫn hoạt động bình thường.

#### 3.2.1.2. Thiết kế mô-đun cảm biến chuyển động IMU

##### a) Vai trò của IMU trong hệ thống

Cảm biến đo quán tính (IMU - Inertial Measurement Unit) đóng vai trò then chốt trong việc phát hiện chuyển động của xe khi đang đỗ, cho phép hệ thống phát hiện các tình huống bất thường như rung xe (cố gắng mở cửa), kéo xe, hoặc cẩu xe. Đặc biệt, IMU cho phép ESP32-S3 ở trạng thái deep sleep liên tục và chỉ thức dậy khi có chuyển động thực sự, giúp tiết kiệm năng lượng đáng kể.

##### b) Lựa chọn cảm biến: LIS3DH

**LIS3DH** của STMicroelectronics là cảm biến gia tốc 3 trục (3-axis accelerometer) low-power được lựa chọn cho hệ thống. Các đặc tính kỹ thuật chính được tóm tắt trong bảng sau:

[Bảng 3.7: Thông số kỹ thuật cảm biến LIS3DH]

| Thông số             | Giá trị                                         |
| -------------------- | ----------------------------------------------- |
| Loại                 | 3-axis Digital Accelerometer                    |
| Điện áp hoạt động    | 1.8–3.6 V                                     |
| Giao tiếp            | I2C (400 kHz) hoặc SPI (10 MHz)                 |
| Phạm vi đo           | +/-2g, +/-4g, +/-8g, +/-16g (có thể điều chỉnh) |
| Độ phân giải         | 16-bit                                          |
| Tiêu thụ (Active)    | 10–50 µA                                        |
| Tiêu thụ (Low-power) | 2–5 µA                                          |
| Wake-up interrupt    | Có (ngưỡng có thể cấu hình)                     |
| Package              | LGA-16 (3x3x1 mm)                               |

##### c) Nguyên lý hoạt động trong hệ thống

LIS3DH được cấu hình ở chế độ low-power với tần suất lấy mẫu 1 Hz (ODR = 1 Hz) và chỉ bật chức năng motion detection. Khi phát hiện gia tốc vượt ngưỡng 0.2g trên bất kỳ trục nào (X, Y, Z), cảm biến tự động phát tín hiệu interrupt đến chân GPIO của ESP32-S3 thông qua chân INT1, đánh thức vi điều khiển từ trạng thái deep sleep [9].

Ngưỡng gia tốc 0.2g được chọn để cân bằng giữa độ nhạy và khả năng chống báo giả. Giá trị này đủ lớn để loại bỏ rung nhẹ từ môi trường (gió, xe cộ đi ngang) nhưng đủ nhỏ để phát hiện các chuyển động thực sự như rung của xe hoặc di chuyển.

![Hình 3.3 - Sơ đồ kết nối LIS3DH với ESP32-S3 qua I2C](./assets/figures/03-chuong-3-giai-phap-phan-cung-hinh-3–3.png)

*Hình 3.3: Sơ đồ kết nối LIS3DH với ESP32-S3 qua I2C*

> Nguồn: Hình vẽ của tác giả

```
LIS3DH Breakout Board          ESP32-S3
+------------------+           +----------+
| VCC  ------------+-----------| 3.3V     |
| GND  ------------+-----------| GND      |
| SDA  ------------+-----------| GPIO22   | (I2C Data)
| SCL  ------------+-----------| GPIO23   | (I2C Clock)
| INT1 ------------+-----------| GPIO21   | (Interrupt -> Wakeup)
+------------------+           +----------+
```

Cấu hình I2C sử dụng địa chỉ 0x18 (khi SDO = LOW), tốc độ 400 kHz (Fast Mode), với điện trở kéo lên (pull-up) 4.7 kΩ đã có sẵn trên breakout board.

##### d) Ưu điểm của giải pháp

- **Tiết kiệm năng lượng tốt nhất:** Dòng tiêu thụ chỉ 2–5 µA ở chế độ low-power, trong khi vẫn duy trì khả năng phát hiện chuyển động. ESP32-S3 không cần chạy liên tục để kiểm tra cảm biến.
- **Phát hiện chuyển động độc lập:** LIS3DH tự xử lý việc phát hiện chuyển động bằng phần cứng, chỉ gửi interrupt khi có sự kiện — không phụ thuộc vào CPU của ESP32.
- **Hệ sinh thái phát triển phong phú:** Nhiều thư viện sẵn có cho Arduino và ESP-IDF, breakout board dễ mua với giá 20.000–50.000 VND.

#### 3.2.1.3. Thiết kế hệ thống quản lý nguồn

Hệ thống quản lý nguồn là khối phức tạp nhất trong thiết kế phần cứng, phụ trách chuyển đổi điện áp, điều phối đường nguồn (power path), sạc pin dự phòng và bảo vệ ắc quy xe khỏi rút cạn quá mức. Cấu trúc được tổ chức thành năm khối chức năng chính.

![Hình 3.4 - Sơ đồ khối hệ thống quản lý nguồn](./assets/figures/03-chuong-3-giai-phap-phan-cung-hinh-3–4.jpg)

*Hình 3.4: Sơ đồ khối hệ thống quản lý nguồn*

> Nguồn: Hình vẽ của tác giả

```
+-----------------------------------------------------------+
| NGUỒN ĐẦU VÀO                             |
| ----------------------------------------- |
| Ắc Quy Xe (12V/24V)      Pin 21700 (3.7V) |
|                                           |                |  |
| +----v----+              +----v----+      |
|                                           | LM2596         |  | MT3608   |  |
|                                           | Buck           |  | Boost    |  |
|                                           | 7–40V->5V      |  | 3.7V->5V |  |
| +----+----+              +----+----+      |
|                                           |                |  |
| +--------+---------------+                |
|                                           |                |
| +--------v--------+                       |
|                                           | Power MUX      |  |
|                                           | (Relay/MOSFET) |  |
| +--------+--------+                       |
|                                           |                |
| +--------v--------+                       |
|                                           | 5V Rail        |  |
| +--------+--------+                       |
|                                           |                |
| +------------+------------+               |
|                                           |                |  |          |
| +--v--+   +----v-----+  +---v---+         |
|                                           | LDO            |  | Modem    |  | IP2312  |  |
|                                           | 5->3.3         |  | A7600    |  | Charger |  |
| +--+--+   +----------+  +---+---+         |
|                                           |                |  |
| +--v--+                  +--v--+          |
|                                           | ESP32          |  | Pin      |  |
| +-----+                  +-----+          |
+-----------------------------------------------------------+
```

##### a) Mạch buck converter (đầu vào 12V/24V sang 5V)

Mạch buck converter có nhiệm vụ giảm điện áp từ ắc quy xe (12V hoặc 24V) xuống 5V để cấp nguồn cho toàn hệ thống. IC LM2596–5.0 của Texas Instruments được lựa chọn vì các lý do sau:

[Bảng 3.8: Thông số kỹ thuật buck converter LM2596]

| Thông số           | Giá trị               |
| ------------------ | --------------------- |
| IC                 | LM2596–5.0 (Fixed 5V) |
| Điện áp vào        | 7–40 V                |
| Điện áp ra         | 5V @ 3A               |
| Hiệu suất          | ~85%                  |
| Tần số chuyển mạch | 150 kHz               |
| Package            | TO-220–5              |

Điện áp 5V được chọn làm bus nguồn chung vì phù hợp với đầu vào LDO 3.3V (cấp cho ESP32), mức hoạt động của modem A7600CE-T và đầu vào của mạch sạc IP2312. Dùng chung một bus 5V giúp đơn giản thiết kế và giảm số lượng converter cần triển khai.

Dòng ra 3A của LM2596 đáp ứng tải toàn hệ thống, gồm ESP32-S3 (80–120 mA), modem A7600CE-T (50–150 mA) và mạch phụ trợ (10–20 mA). Dòng sạc 3A qua IP2312 chỉ xuất hiện khi xe chạy nên không đồng thời với toàn bộ tải trong mọi thời điểm.

Duty cycle của mạch được tính: D = Vout/Vin = 5/12 = 0.417 (41.7%). Tổn hao công suất: P_loss = (1–0.85) x 5V x 3A = 2.25W, cần xem xét tản nhiệt khi hoạt động ở công suất cao.

Đối với đồ án, nhóm khuyến nghị sử dụng module LM2596 sẵn có (giá 15.000–25.000 VND) đã tích hợp đầy đủ linh kiện phụ trợ (cuộn cảm 100 uH, tụ điện đầu vào 100 uF/50V, tụ điện đầu ra 220 uF/16V, diode Schottky 1N5822) [10].

##### b) Mạch boost converter (3.7V sang 5V)

Khi ắc quy xe yếu và hệ thống chuyển sang nguồn pin backup 21700 (3.7V), mạch boost converter có nhiệm vụ tăng điện áp từ 3.7V lên 5V. IC MT3608 được lựa chọn:

[Bảng 3.9: Thông số kỹ thuật boost converter MT3608]

| Thông số       | Giá trị                                    |
| -------------- | ------------------------------------------ |
| IC             | MT3608 (Step-Up Converter)                 |
| Điện áp vào    | 2–24 V                                     |
| Điện áp ra     | 5–28 V (điều chỉnh bằng điện trở feedback) |
| Dòng ra tối đa | 2A                                         |
| Hiệu suất      | ~85%                                       |
| Package        | SOT23–6                                    |

Dòng ra 2A là đủ cho hệ thống tracker khi chạy từ pin backup (không sạc pin trong chế độ này). Duty cycle: D = 1 - (Vin/Vout) = 1 - (3.7/5) = 0.26 (26%). Dòng đầu vào từ pin: Iin = Iout x (Vout/Vin)/n = 2 x (5/3.7)/0.85 = 3.18A, nằm trong giới hạn dòng xả của pin 21700 (3–5A) [11].

Module MT3608 sẵn có (giá 10.000–15.000 VND) được khuyến nghị sử dụng, đã tích hợp cuộn cảm 22 uH, điện trở feedback, và tụ điện lọc.

##### c) Quản lý đường nguồn (Power Path Management)

Hệ thống cần tự động chuyển đổi giữa hai nguồn cấp: ắc quy xe (qua buck converter) và pin backup (qua boost converter). Ba phương án được đánh giá:

[Bảng 3.10: So sánh các phương án Power Path Management]

| Tiêu chí        | MOSFET (P-MOS)               | IC chuyên dụng (TPS2115A) | Relay Module                |
| --------------- | ---------------------------- | ------------------------- | --------------------------- |
| Độ phức tạp     | Trung bình (cần gate driver) | Thấp (tự động)            | Thấp (đơn giản)             |
| Chi phí         | 10.000–15.000 VND            | 50.000–80.000 VND         | 5.000–10.000 VND            |
| Tổn hao         | Thấp (Rds ~0.2 Ohm)          | Rất thấp (~100 mV)        | Không đáng kể (tiếp xúc cơ) |
| Tiêu thụ        | Không đáng kể                | Không đáng kể             | ~70 mA (cuộn hút)           |
| Khả dụng tại VN | Tốt                          | Khó mua                   | Rất tốt                     |
| Điều khiển      | Firmware (GPIO)              | Tự động                   | Firmware (GPIO)             |

**Giải pháp được chọn: Relay Module 5V.** Trong phạm vi đồ án, tiêu chí đơn giản và dễ triển khai được ưu tiên. Relay module 1 kênh 5V (giá 5.000–10.000 VND) được điều khiển trực tiếp từ GPIO của ESP32-S3: GPIO HIGH bật relay (dùng ắc quy), GPIO LOW tắt relay (dùng pin backup). Relay có tiếp kết nối NO (Normally Open) cho ngõ ra buck và NC (Normally Closed) cho ngõ ra boost, bảo đảm rằng khi mất điều khiển, hệ thống tự động chuyển sang pin backup [12].

Ngoài relay, hai diode Schottky 1N5822 được mắc theo cấu hình Diode-OR làm mạch dự phòng: nếu relay bị lỗi, diode vẫn đảm bảo hệ thống có nguồn cấp (với tổn hao thêm ~0.4V).

##### d) Giám sát điện áp và ngắt điện áp thấp (LVD)

Chức năng Low Voltage Disconnect (LVD) bảo vệ ắc quy xe khỏi tình trạng rút cạn quá mức bằng cách tự động chuyển sang pin backup khi điện áp ắc quy giảm xuống dưới ngưỡng an toàn.

**Phương pháp được chọn: Software-based (ADC ESP32-S3).** Điện áp ắc quy 12V hoặc 24V được đo gián tiếp qua mạch chia áp (voltage divider) với R1 = 100 kΩ và R2 = 10 kΩ, đưa điện áp xuống mức an toàn cho ADC 12-bit của ESP32 (0–3.3V). Tỷ lệ chia áp mới: R2/(R1+R2)=10k/110k~0.0909.

```
V_adc = U_batt x R2 / (R1 + R2) = U_batt x 10k / 110k = U_batt x 0.0909
ADC_value = (V_adc / 3.3) x 4095

Ví dụ profile 12V:
U_batt = 12.0V -> V_adc = 12.0 x 0.0909 = 1.09V
ADC_value = (1.09 / 3.3) x 4095 ~ 1355

Ví dụ profile 24V:
U_batt = 24.0V -> V_adc = 24.0 x 0.0909 = 2.18V
ADC_value = (2.18 / 3.3) x 4095 ~ 2711
```

Logic chuyển nguồn sử dụng cơ chế hysteresis theo profile cấu hình để tránh dao động khi điện áp gần ngưỡng:

- **Profile 12V:** LVD_cut=11.5V, Switch_OFF=12.0V, Switch_ON=12.2V
- **Profile 24V:** LVD_cut=23.0V, Switch_OFF=24.0V, Switch_ON=24.4V

[Bảng 3.11: Bảng trạng thái chuyển nguồn và cảnh báo]

| Trạng thái          | IGN | U_batt  | Nguồn tracker | Sạc pin | Cảnh báo              |
| ------------------- | --- | ------- | ------------- | ------- | --------------------- |
| Xe chạy bình thường | ON  | Profile 12V: U_batt >= 13.0V; Profile 24V: U_batt >= 26.0V | Ắc quy        | Có      | Không                 |
| Xe đỗ bình thường   | OFF | Profile 12V: U_batt > 12.0V; Profile 24V: U_batt > 24.0V   | Ắc quy        | Không   | Không                 |
| Ắc quy yếu          | OFF | Profile 12V: U_batt <= 12.0V; Profile 24V: U_batt <= 24.0V | Pin 21700     | Không   | Cảnh báo chuyển nguồn |
| Ắc quy phục hồi     | OFF | Profile 12V: U_batt >= 12.2V; Profile 24V: U_batt >= 24.4V | Ắc quy        | Không   | Cảnh báo phục hồi     |

*Ghi chú: Ngưỡng LVD cắt sâu để bảo vệ ắc quy: 11.5V (profile 12V) và 23.0V (profile 24V).*

Phương pháp software-based được chọn thay cho hardware-based (LM393 comparator) vì không cần thêm linh kiện ngoài (chi phí = 0), cho phép điều chỉnh ngưỡng linh hoạt trong firmware, và độ chính xác của ADC 12-bit (độ phân giải ~3 mV) đã đáp ứng yêu cầu ứng dụng.

##### e) Mạch sạc pin và bảo vệ: IP2312

Module sạc IP2312 của Injoinic chịu trách nhiệm sạc pin 21700 khi xe chạy. Đây là IC sạc Li-ion với dòng sạc cao 3A, cho phép sạc đầy pin 5000 mAh trong khoảng 2 giờ thực tế.

[Bảng 3.12: Thông số kỹ thuật mạch sạc IP2312]

| Thông số    | Giá trị                                         |
| ----------- | ----------------------------------------------- |
| IC          | IP2312 (Injoinic)                               |
| Dòng sạc    | 3A (có thể điều chỉnh)                          |
| Điện áp vào | 4.5–5.5 V                                       |
| Điện áp sạc | 4.2V (Li-ion standard)                          |
| Hiệu suất   | 85–90%                                          |
| Bảo vệ      | Quá dòng, quá nhiệt, ngược cực, tự ngắt khi đầy |

Mạch sạc chỉ được kích hoạt khi đồng thời thỏa mãn hai điều kiện: IGN ON và U_batt vượt ngưỡng Switch_ON của profile cấu hình (12.2V với profile 12V, 24.4V với profile 24V). ESP32-S3 điều khiển chân EN của IP2312 qua GPIO với điện trở hạn dòng 10 kΩ. Khi xe đỗ (IGN OFF), mạch sạc bị vô hiệu hóa để bảo vệ ắc quy khỏi bị rút năng lượng không cần thiết [13].

Thời gian sạc lý thuyết: T = 5000 mAh / 3000 mA = 1.67 giờ. Với hiệu suất 85%, thời gian sạc thực tế khoảng 2–2.5 giờ. Điều này có nghĩa là chỉ cần xe chạy 2–3 giờ là pin backup đã được sạc đầy, sẵn sàng cho nhiều ngày hoạt động ở chế độ heartbeat.

Pin 21700 được bảo vệ bởi BMS 1S 3A module (giá 10.000–20.000 VND) với các chức năng: bảo vệ quá dòng xả (< 2.5V), bảo vệ quá áp (> 4.25V), bảo vệ ngắn mạch, và giới hạn dòng xả tối đa 3A.

##### f) Pin dự phòng 21700 Li-ion

Pin 21700 Li-ion 5000 mAh được chọn làm nguồn dự phòng với cấu hình 1 cell đơn giản.

[Bảng 3.13: Thông số kỹ thuật pin dự phòng 21700]

| Thông số        | Giá trị                        |
| --------------- | ------------------------------ |
| Loại            | Li-ion 21700                   |
| Dung lượng      | 5000 mAh @ 3.7V                |
| Năng lượng      | ~18.5 Wh                       |
| Điện áp         | 3.0–4.2V (nominal 3.7V)        |
| Dòng xả tối đa  | 3–5A                           |
| Dòng sạc tối đa | 3A                             |
| Số chu kỳ       | 500–1000 chu kỳ (80% capacity) |

**Tính toán thời gian hoạt động từ pin backup:**

*Chế độ heartbeat (đỗ xe, chu kỳ 15 phút):*
- Dòng trung bình: I_avg = (250 mA x 15s + 3 mA x 885s) / 900s = 7.1 mA
- Dung lượng hiệu quả (sau tổn hao): 4500 mAh
- Thời gian hoạt động: T = 4500 / 7.1 = 634 giờ ~ **26 ngày**

*Chế độ heartbeat (đỗ xe, chu kỳ 30 phút):*
- Dòng trung bình: ~5 mA
- Thời gian hoạt động: T = 4500 / 5 = 900 giờ ~ **37 ngày**

*Chế độ cảnh báo (track liên tục):*
- Dòng trung bình: ~250 mA
- Thời gian hoạt động: T = 4500 / 250 = **18 giờ**

Kết quả tính toán cho thấy pin 5000 mAh đủ khả năng duy trì hoạt động tracker từ 20–35 ngày ở chế độ heartbeat, đủ thời gian để người dùng xử lý tình trạng ắc quy yếu [14].

#### 3.2.1.4. Bảng tổng hợp linh kiện (Bill of Materials)

[Bảng 3.14: Bảng tổng hợp linh kiện hệ thống tracker (BOM)]

| STT | Thành phần                     | Đơn vị | SL  | Giá ước tính (VND) | Ghi chú                              |
| --- | ------------------------------ | ------ | --- | ------------------ | ------------------------------------ |
| 1   | ESP32-S3 DevKit (DevKitC-1)    | Cái    | 1   | 100.000–200.000  | Module ESP32-S3-WROOM-1              |
| 2   | LIS3DH breakout board          | Cái    | 1   | 20.000–50.000    | Cảm biến gia tốc 3 trục              |
| 3   | vgate iCar Pro (OBD2 BLE)      | Cái    | 1   | 150.000–300.000  | BLE 4.0, ELM327 compatible           |
| 4   | SIMCom A7600CE-T module        | Cái    | 1   | 300.000–500.000  | Kèm LTE antenna + GNSS antenna + SIM |
| 5   | Pin 21700 Li-ion 5000mAh       | Cái    | 1   | 100.000–200.000  | Loại có protection board             |
| 6   | Module sạc IP2312 (3A)         | Cái    | 1   | 20.000–40.000    | Type-C, dòng sạc 3A                  |
| 7   | BMS/Protection Board 1S        | Cái    | 1   | 10.000–20.000    | BMS 1S 3A hoặc DW01+MOSFET           |
| 8   | Module Buck LM2596 (7–40V->5V) | Cái    | 1   | 15.000–25.000    | Dòng ra 3A, tương thích hệ 12V/24V  |
| 9   | Module Boost MT3608 (3.7V->5V) | Cái    | 1   | 10.000–15.000    | Dòng ra 2A                           |
| 10  | Relay Module 5V 1-kênh         | Cái    | 1   | 5.000–10.000     | Power MUX chuyển nguồn               |
| 11  | Điện trở (10kOhm, 2.2kOhm)     | Gói    | 1   | 5.000–10.000     | Voltage divider, pull-up             |
| 12  | Tụ điện (100uF, 220uF)         | Gói    | 1   | 5.000–10.000     | Lọc nhiễu, decoupling                |
| 13  | Diode Schottky 1N5822          | Cái    | 2   | 2.000–5.000      | Diode-OR backup                      |
| 14  | Connector, header pin          | Gói    | 1   | 10.000–20.000    | Kết nối dây, header                  |
| 15  | PCB 2 lớp (~50x50 mm)          | Cái    | 1   | 50.000–100.000   | Tự thiết kế hoặc đặt làm             |
| 16  | Vỏ bảo vệ (tùy chọn)           | Cái    | 1   | 50.000–100.000   | Nhựa hoặc kim loại                   |
| 17  | Dây nối, cáp, phụ kiện         | -      | -   | 20.000–30.000    | Dây điện, cáp USB                    |
| 18  | Linh kiện phụ trợ khác         | -      | -   | 20.000–30.000    | Fuse, switch, LED                    |

[Bảng 3.15: Tổng hợp chi phí theo nhóm]

| Nhóm | Hạng mục                                           | Chi phí (VND)           |
| ---- | -------------------------------------------------- | ----------------------- |
| A    | Thành phần chính (MCU, cảm biến, modem, OBD2, pin) | 670.000–1.250.000     |
| B    | Quản lý nguồn (buck, boost, charger, BMS, relay)   | 60.000–110.000        |
| C    | Linh kiện phụ trợ (điện trở, tụ, diode, connector) | 42.000–75.000         |
| D    | PCB và vỏ (tùy chọn)                               | 100.000–200.000       |
|      | **Tổng cộng**                                      | **872.000–1.635.000** |

Tổng chi phí ước tính cho toàn bộ phần cứng hệ thống tracker nằm trong khoảng **872.000–1.635.000 VND**, phù hợp với ngân sách đồ án tốt nghiệp. Nhóm khuyến nghị sử dụng các module sẵn có (thay vì IC rời) trong giai đoạn prototype nhằm rút ngắn thời gian phát triển và tạo điều kiện kiểm thử độc lập từng thành phần trước khi tích hợp.
