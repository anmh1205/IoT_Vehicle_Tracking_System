# CHƯƠNG 3. CÁC GIẢI PHÁP THIẾT KẾ – DESIGN SOLUTIONS

Chương này trình bày quá trình phân tích, đề xuất và lựa chọn các giải pháp thiết kế cho hệ thống IoT giám sát phương tiện. Nội dung được tổ chức theo bốn tầng chính: (1) phần cứng thiết bị tracker, (2) firmware nhúng trên vi điều khiển, (3) hệ thống backend và cloud, và (4) giao diện người dùng frontend. Ở mỗi tầng, các phương án thay thế được so sánh theo yêu cầu kỹ thuật, thông số chính và tác động tích hợp thực tế, từ đó lựa chọn phương án tối ưu theo tiêu chí hiệu năng, chi phí và khả năng mở rộng.

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
|                                               | LIS3D                              |                                | OBD2     |  | SIM7600CE-T |  | Power |  | Voltage |  |
|                                               | H IMU                              |                                | BLE      |  | LTE+GNSS |  | MUX   |  | Divider |  |
|                                               |                                    |                                | vgat     |  | Integrated |  |       |  |         |  |
| +-----+                                       | e                                  | +--------+ +------+ +--------+ |
| +----+                                        |
|                                               |
| +------------------------------------+        |
|                                               | Hệ thống quản lý nguồn             |                                |
|                                               | - Buck MP2482 (7–40V -> 5V, tương thích 12V/24V) |                                |
|                                               | - Boost SX1308 (3.7V -> 5V)        |                                |
|                                               | - Power Path (Diode-OR + EN)         |                                |
|                                               | - Charger TP4056 (sạc pin)         |                                |
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

Luồng dữ liệu được tổ chức theo ba nhánh: OBD2 (RPM, tốc độ, nhiên liệu) đọc qua BLE từ adapter vgate iCar Pro; dữ liệu GNSS được cung cấp bởi phần GNSS tích hợp bên trong SIMCom SIM7600CE-T trên cùng UART; và dữ liệu chuyển động thu từ IMU LIS3DH qua I2C. ESP32-S3 tổng hợp, đóng gói và truyền toàn bộ dữ liệu lên máy chủ qua MQTT thông qua kết nối 4G/LTE của SIM7600CE-T.
#### 3.1.1.2. Phân tích và lựa chọn vi điều khiển (MCU)

Việc lựa chọn vi điều khiển (MCU) là quyết định thiết kế quan trọng nhất, ảnh hưởng trực tiếp đến khả năng tích hợp các module ngoại vi, mức tiêu thụ năng lượng, và độ phức tạp phát triển firmware. Ba ứng viên được đưa vào quá trình đánh giá là ESP32-S3 của Espressif, STM32L4 của STMicroelectronics, và nRF52840 của Nordic Semiconductor.

##### a) Các ứng viên

**ESP32-S3** là vi điều khiển dual-core Xtensa LX7 hoạt động tới 240 MHz, tích hợp sẵn WiFi 802.11 b/g/n và Bluetooth LE 5.0 [19]. Thiết bị có 512 KB SRAM on-chip, dùng flash ngoài, hỗ trợ nhiều giao tiếp ngoại vi (UART/I2C/SPI/ADC) và dòng deep-sleep mức µA tùy cấu hình [19], [20].

**STM32L4** (đại diện bởi STM32L476 trong so sánh) là dòng MCU low-power của ST, dùng nhân ARM Cortex-M4 tới 80 MHz và không tích hợp BLE/Wi-Fi [53], [54]. Dòng này nổi bật với các mức dòng ngủ sâu rất thấp theo cấu hình nguồn (shutdown/standby/STOP2) [53].

**nRF52840** là MCU của Nordic với nhân ARM Cortex-M4F 64 MHz, hỗ trợ Bluetooth LE 5.x và 802.15.4 [55], [56]. Thiết bị có 1 MB Flash, 256 KB RAM, hỗ trợ UART/UARTE và dòng System OFF mức dưới µA tùy điều kiện cấu hình [55], [56].

##### b) Đối chiếu yêu cầu thiết kế với thông số phần cứng

Thay vì chấm điểm tổng quát, Bảng 3.1 đối chiếu trực tiếp các ràng buộc kỹ thuật của tracker với thông số và tác động tích hợp của từng MCU.

[Bảng 3.1: Đối chiếu yêu cầu kỹ thuật khi lựa chọn vi điều khiển]

| Yêu cầu của tracker | ESP32-S3 | STM32L4 | nRF52840 |
| ------------------- | -------- | ------- | -------- |
| Kết nối OBD2 BLE với vgate iCar Pro | BLE 5.0 tích hợp, tương thích ngược BLE 4.0 | Không tích hợp BLE, phải thêm module ngoài | BLE 5.0 tích hợp |
| Cấu hình UART của hệ thống | 3 UART controllers (đủ cho modem + debug, còn dư cho mở rộng) [19], [20] | Nhiều serial instance trong dòng STM32L476 (USART/UART/LPUART), đáp ứng yêu cầu số cổng [53], [54] | UARTE/UART thường dùng 2 instance, ít dư địa nếu cần giữ debug UART riêng [55], [56] |
| Tài nguyên xử lý cho OBD2 + modem + IMU | Dual-core 240 MHz, 512 KB SRAM [19] | Cortex-M4 tới 80 MHz, 128 KB SRAM trên STM32L476RE [54] | Cortex-M4F 64 MHz, 256 KB RAM [55], [56] |
| Dòng ngủ sâu/siêu thấp công suất | Deep-sleep mức µA tùy cấu hình RTC/IO [19], [20] | STOP2 cỡ 1.1 µA (theo điều kiện datasheet), standby/shutdown cỡ nA [53], [54] | System OFF mức dưới µA tùy RAM retention/GPIO [55] |
| Framework triển khai | Arduino IDE + ESP-IDF [47] | STM32Cube/HAL [53] | nRF Connect SDK [57] |
| Phần cứng bổ sung để đạt đủ chức năng | Không cần thêm radio BLE | Cần thêm BLE module nếu vẫn giữ OBD2 BLE (STM32L476 không tích hợp BLE) [53], [54] | Không cần BLE module, nhưng cần xử lý bài toán thiếu serial cho debug |
| Chi phí dev board/prototype | ~100.000–200.000 VND (mặt bằng BOM dự án) | ~150.000–300.000 VND (mặt bằng BOM dự án) | Thường cao hơn ESP32-S3 và ít phổ biến hơn trong bối cảnh dự án |
| Tác động tới sơ đồ hiện tại | Giữ nguyên sơ đồ BLE + modem UART, thuận lợi cho tích hợp GNSS trong modem | Tăng phần cứng BLE ngoài và công đoạn tích hợp ban đầu | Có thể phải chuyển debug sang USB/SWO để nhường UART cho chức năng chính |

##### c) Phân tích các yếu tố quan trọng

**BLE tích hợp:** Đây là ràng buộc cứng vì tracker dùng adapter OBD2 vgate iCar Pro theo chuẩn BLE 4.0. ESP32-S3 và nRF52840 đều đáp ứng trực tiếp bằng BLE 5.0 tích hợp, trong khi STM32L4 phải bổ sung thêm module BLE ngoài. Việc thêm module ngoài không chỉ tăng BOM mà còn phát sinh thêm miền nguồn và công đoạn tích hợp phần cứng.

**Ngân sách UART:** Kiến trúc mục tiêu cần tối thiểu các luồng UART riêng cho modem và kênh debug. ESP32-S3 đáp ứng tốt với 3 UART phần cứng, còn dư địa cho mở rộng. STM32L4 cũng có thể đáp ứng nếu chọn đúng biến thể, nhưng đổi lại phải thêm BLE ngoài. nRF52840 thường chỉ có 2 UART nên dư địa cho debug độc lập hạn chế hơn.

**Tiêu thụ deep sleep:** STM32L4 và nRF52840 có lợi thế rõ ràng về dòng ngủ sâu theo tài liệu hãng. Tuy nhiên chênh lệch giữa nhóm ESP32-S3 và STM32L4 không quyết định toàn bộ thời lượng pin, vì tracker vẫn chịu tải chính từ modem LTE, GNSS và các chu kỳ wake-up định kỳ. Trong bài toán heartbeat 20–35 ngày với pin 5000 mAh, chênh lệch này có ý nghĩa nhưng không đủ để bù cho việc tăng độ phức tạp tích hợp [19], [53], [54], [55].

**Độ phức tạp triển khai:** ESP32-S3 có lợi thế thực tế vì vừa có BLE sẵn, vừa có ESP-IDF/Arduino IDE, phù hợp cho firmware phải đồng thời xử lý BLE OBD2, AT command modem, I2C IMU và deep sleep. STM32L4 mạnh về low power nhưng kéo theo thêm công việc tích hợp BLE. nRF52840 phù hợp nếu hệ thống ưu tiên radio BLE là chính, nhưng dư địa UART cho kịch bản hiện tại hạn chế hơn.

##### d) Kết luận lựa chọn

Trên cơ sở đối chiếu trực tiếp các yêu cầu của hệ thống, **ESP32-S3** được chọn làm vi điều khiển chính cho tracker. Quyết định này dựa trên các điểm chốt sau:

- Đáp ứng trọn vẹn kiến trúc hiện tại: 1 kết nối BLE cho OBD2, UART cho modem và một đường debug riêng, đồng thời vẫn còn dư địa UART cho mở rộng.
- BLE 5.0 tích hợp giúp bỏ hẳn module BLE ngoài, giảm BOM và rút ngắn công đoạn tích hợp.
- Tài nguyên xử lý 240 MHz dual-core và 512 KB SRAM đủ để chạy đồng thời BLE, modem, IMU và state machine.
- Chi phí prototype thấp hơn STM32L4 khoảng 30–50% theo mặt bằng linh kiện đang dùng trong đồ án.
- Dòng deep-sleep của ESP32-S3 cao hơn STM32L4 theo tài liệu hãng, nhưng vẫn nằm trong giới hạn chấp nhận được của bài toán pin backup 5000 mAh khi xét toàn bộ duty-cycle của modem, GNSS và các chu kỳ wake-up [19], [53], [54].

[Bảng 3.2: Thông số kỹ thuật ESP32-S3 được chọn]

| Thông số | Giá trị |
| -------- | ------- |
| CPU | Dual-core Xtensa LX7, tối đa 240 MHz [19] |
| RAM on-chip | 512 KB SRAM [19] |
| Flash | Flash ngoài (module dev board thường 4–16 MB) [19], [20] |
| Bluetooth | Bluetooth LE 5.0, tương thích ngược BLE 4.0 cho OBD2 adapter [19] |
| WiFi | 802.11 b/g/n (không dùng trong luồng chính của tracker) [19] |
| UART | 3 UART controllers [19], [20] |
| I2C | 2 I2C controllers [19], [20] |
| ADC | SAR ADC 12-bit, tối đa 20 kênh (theo package) [19] |
| GPIO | Tối đa 45 GPIO (theo package) [19] |
| Dòng deep-sleep | Mức µA tùy cấu hình RTC domain và IO [19], [20] |
| Module cụ thể | ESP32-S3-WROOM-1 |
| Board phát triển | ESP32-S3-DevKitC-1 |

#### 3.1.1.3. Phân tích và lựa chọn modem truyền thông

Modem truyền thông đóng vai trò then chốt trong hệ thống, đảm nhận hai chức năng: (1) kết nối mạng di động 4G/LTE để truyền dữ liệu về máy chủ, và (2) định vị GNSS để xác định vị trí xe. Trong kiến trúc hiện tại, hệ thống sử dụng **SIM7600CE-T tích hợp LTE + GNSS** nhằm giảm số lượng phần cứng rời, đơn giản hóa đi dây và đồng bộ với firmware thực tế.

##### a) Các ứng viên

Ba phương án được đưa vào đánh giá gồm hai phương án tách rời (**SIMCom A7670C + u-blox NEO-M8N**, **Quectel EC200U-CN + NEO-M8N**) và một phương án tích hợp (**SIMCom SIM7600CE-T**).

**SIMCom A7670C + u-blox NEO-M8N** là phương án tách rời: A7670C phụ trách LTE/AT command, NEO-M8N phụ trách GNSS/NMEA. Theo trang sản phẩm chính thức của SIMCom, A7670C nằm trong nhóm LTE Cat-1 và dùng nguồn 3.4–4.2 V [58], [62].

**Quectel EC200U-CN + NEO-M8N** có cấu trúc gần giống phương án A7670C + NEO-M8N. Tuy nhiên dòng EC200U được hãng mô tả là Cat-1 bis, GNSS là tính năng tùy chọn theo biến thể/cấu hình và I/O logic có ràng buộc riêng, nên mức độ phù hợp với cấu hình đang triển khai thấp hơn [59], [61].

**SIMCom SIM7600CE-T** là phương án tích hợp GNSS trong modem, giúp đi dây gọn hơn và giảm số lượng phần cứng rời [60].

##### b) Đối chiếu kiến trúc LTE/GNSS theo ràng buộc tích hợp

Vấn đề cốt lõi của tracker không chỉ là modem có lên mạng được hay không, mà còn là phương án LTE/GNSS ảnh hưởng thế nào tới sơ đồ UART, hồ sơ tiêu thụ nguồn và mức độ thuận lợi khi phát triển firmware. Bảng 3.3 dưới đây đối chiếu trực tiếp các điểm khác biệt này.

[Bảng 3.3: Đối chiếu các phương án LTE/GNSS theo tác động tích hợp]

| Yêu cầu tích hợp | A7670C + NEO-M8N | EC200U-CN + NEO-M8N | SIM7600CE-T |
| ------------------------ | ---------------- | -------------------- | ----------- |
| Số module phần cứng | 2 module: A7670C (LTE) + NEO-M8N (GNSS) [58], [62] | 2 module: EC200U-CN (LTE) + NEO-M8N (GNSS) [59], [61] | 1 module tích hợp LTE + GNSS (SIM7600CE family) [60] |
| LTE category / tốc độ | Cat-1, tối đa 10 Mbps DL / 5 Mbps UL [58] | Cat-1, tối đa 10 Mbps DL / 5 Mbps UL [59], [61] | Cat-4, tối đa 150 Mbps DL / 50 Mbps UL [60] |
| GNSS tích hợp trong modem | Không tích hợp GNSS trên A7670C, cần GNSS ngoài [58], [62] | GNSS tùy chọn theo variant/cấu hình dòng EC200U [59], [61] | Có GNSS tích hợp trong module [60] |
| Điện áp cấp nguồn modem | 3.4–4.2 V (typ. 3.8 V) [58] | 3.3–4.3 V (typ. 3.8 V) [61] | 3.4–4.2 V (typ. 3.8 V) [60] |
| Đường dữ liệu vị trí trong kiến trúc đề tài | NMEA/UBX từ NEO-M8N qua UART riêng [62], [63] | NMEA/UBX từ NEO-M8N qua UART riêng [62], [63] | GNSS AT tích hợp trong cùng modem [60] |
| Bật/tắt LTE và GNSS độc lập | Có, do tách 2 module/2 rail nguồn | Có, nếu triển khai tách tương tự A7670C+NEO-M8N | Không tách hoàn toàn do GNSS đi cùng modem |

| Tác động khi reset modem LTE | Có thể reset modem và giữ logic GNSS riêng | Tương tự phương án tách nếu GNSS dùng module riêng | Reset modem thường kéo theo gián đoạn GNSS |
| Mức phụ thuộc giữa các chức năng firmware | Thấp, tách rõ `modem_lte` và `gnss` | Thấp, nhưng phải đổi tập lệnh modem | Cao hơn do LTE/GNSS chung module |
| Tác động tới BOM prototype | Bộ modem + GNSS đang chốt 330.000–500.000 VND (BOM dự án) | Chưa phải cấu hình BOM chính của repo | Giảm số module phần cứng rời, thuận lợi cho đi dây và lắp ráp |

##### c) Kết luận lựa chọn

**SIMCom SIM7600CE-T** được lựa chọn cho hệ thống tracker vì các lý do sau:

- Module tích hợp LTE Cat-4 và GNSS giúp giảm số lượng phần cứng rời, đồng thời giữ nguyên sơ đồ UART (GPIO16/17 cho UART1 và GPIO25 cho PWRKEY) để đồng bộ với mã nguồn hiện hữu.
- Trình tự attach tuân thủ quy ước `+CEREG?` phải báo `1` trước khi gọi `AT+CGACT=1,1`, song song với Auto mode (`AT+CNMP=2`) và cấu hình APN mặc định `internet` để đảm bảo modem luân phiên giữa LTE/UMTS/GSM mà không cần thay đổi thủ công.
- Dải nguồn 3.4–4.2 V phù hợp với SIM7600CE-T và cho phép điều khiển GNSS bằng `AT+CGNSPWR=1/0`, đọc dữ liệu qua `AT+CGNSINF` ngay trên một UART duy nhất.
- Việc duy trì CNMP=2 auto mode và APN `internet` giúp hệ thống xử lý tự động các biến thể mạng di động mà không cần cập nhật firmware trong giai đoạn triển khai hiện tại.


[Bảng 3.4: Thông số kỹ thuật phương án SIMCom SIM7600CE-T]

| Thông số | Giá trị |
| -------- | ------- |
| Kiến trúc | SIMCom SIM7600CE-T (LTE Cat-4 + GNSS tích hợp) |
| LTE category / tốc độ | Cat-4, tối đa 150 Mbps downlink / 50 Mbps uplink [60] |
| GNSS | GNSS tích hợp (GPS/GLONASS/BeiDou/Galileo) với điều khiển qua `AT+CGNSPWR` và `AT+CGNSINF` |
| GNSS tích hợp trong modem | Có |
| Giao tiếp với MCU | UART1 (GPIO16 TX, GPIO17 RX) cho toàn bộ AT LTE/GNSS + GPIO25 cho PWRKEY [60] |
| Luồng attach LTE | Kiểm tra `AT+CEREG?` trước khi `AT+CGACT=1,1`, giữ `AT+CNMP=2` (auto mode) và `AT+CGDCONT=1,"IP","internet"` để tái tạo kết nối ổn định |
| Điện áp modem | 3.4–4.2 V, điển hình 3.8 V [60] |
| Đồng bộ GNSS | Bật GNSS bằng `AT+CGNSPWR=1` và đọc dữ liệu bằng `AT+CGNSINF`; `AT+CGNSTST` chỉ dùng khi cần stream NMEA để debug |
| Ý nghĩa tích hợp | Giảm số module phần cứng, thống nhất luồng AT trên một UART và loại bỏ nhu cầu UART riêng cho GNSS |

## 3.2. Đề xuất các giải pháp – Proposed multiple solutions

### 3.2.1. Giải pháp phần cứng

#### 3.2.1.1. Thiết kế mô-đun thu thập dữ liệu OBD2

##### a) Lựa chọn phương pháp kết nối OBD2

Thu thập dữ liệu từ ECU xe qua cổng OBD2 (On-Board Diagnostics II) là một yêu cầu cốt lõi của thiết kế tracker. Có hai hướng tiếp cận chính: sử dụng adapter OBD2 có dây (wired ELM327 qua UART) hoặc adapter OBD2 không dây (BLE ELM327). Nhóm lựa chọn kết nối không dây qua BLE dựa trên các lý do sau:

[Bảng 3.5: So sánh phương pháp kết nối OBD2 theo thông số triển khai]

| Tiêu chí kỹ thuật | OBD2 có dây (ELM327 UART) | OBD2 không dây (BLE ELM327 / vgate iCar Pro) |
| ----------------- | ------------------------- | --------------------------------------------- |
| Kết nối vật lý tracker ↔ OBD2 | Cần dây kéo cố định từ cổng OBD2 đến tracker | Không cần dây giữa tracker và cổng OBD2 |
| Giao thức tới MCU | UART TTL | BLE 4.0 GATT; vgate iCar Pro là bản Bluetooth 4.0 BLE [29], [64] |
| Tài nguyên MCU tiêu tốn | Chiếm thêm 1 UART phần cứng trong lúc kết nối | Tận dụng BLE tích hợp của ESP32-S3, giữ UART cho modem/GNSS/debug |
| Giao thức OBD-II hỗ trợ | Phụ thuộc adapter ELM327 cụ thể | Vgate công bố hỗ trợ J1850 PWM/VPW, ISO9141-2, ISO14230-4, ISO15765-4 CAN, SAE J1939 CAN [64] |
| Hành vi sleep của adapter | Phụ thuộc adapter có dây cụ thể | Vendor công bố tự sleep sau khoảng 30 phút khi xe tắt máy [64] |
| Hành vi wake | Phụ thuộc adapter và đường cấp nguồn | Vendor quảng bá tự khởi động khi ignition ON; cần hiểu là hành vi phụ thuộc xe [64] |
| Dòng tiêu thụ adapter | Phụ thuộc adapter; không dùng 1 số cứng nếu không có datasheet đúng mẫu | Trang hãng được kiểm tra không công bố dòng active/standby, nên không chốt số mA trong luận văn [64] |
| Hành vi khi MCU deep sleep | UART không duy trì truyền dữ liệu khi MCU ngủ sâu | BLE link cũng không duy trì qua deep sleep; cần reconnect sau wake |
| Tác động lắp đặt thực địa | Tracker thường bị ràng buộc gần cổng OBD2 | Tracker có thể đặt lệch vị trí OBD2 trong cabin nếu vẫn trong vùng BLE |
| Bảo trì/thay adapter giữa các xe | Cần tháo dây liên quan đến tracker | Chỉ cần rút/cắm adapter và cấu hình lại kết nối nếu cần |

**Kết luận:** Phương pháp BLE được chọn vì phù hợp hơn với kiến trúc hiện tại của tracker: tận dụng BLE tích hợp của ESP32-S3, không chiếm thêm UART phần cứng, giảm ràng buộc đi dây, đồng thời vgate iCar Pro đã có công bố rõ về BLE 4.0, auto-sleep và danh sách giao thức OBD-II. Với các mục hãng không công bố (như dòng active/standby), luận văn nên ghi rõ là chưa có số liệu chính thức thay vì điền giá trị ước lượng.

##### b) Lựa chọn adapter OBD2 BLE: vgate iCar Pro

**vgate iCar Pro** là adapter OBD2 sử dụng Bluetooth Low Energy (BLE) 4.0, tương thích với BLE 5.0 của ESP32-S3. Adapter này được chọn dựa trên các tiêu chí sau:

- **Tương thích giao thức:** Hỗ trợ tập lệnh ELM327 qua BLE GATT characteristics, cho phép đọc đa dạng dữ liệu từ ECU bao gồm trạng thái động cơ (IGN), số vòng quay (RPM), tốc độ xe, mức nhiên liệu, nhiệt độ động cơ, và mã lỗi chẩn đoán (DTC) [7].
- **Khả năng kết nối:** BLE 4.0 của adapter tương thích ngược với BLE 5.0 của ESP32-S3 [19], [64]. Vendor cũng công bố cơ chế tự sleep sau khoảng 30 phút khi xe tắt máy và tự khởi động lại theo ignition, phù hợp cho kịch bản tracker trên xe [64].
- **Tiêu thụ năng lượng:** Ở thời điểm rà soát nguồn, trang hãng được kiểm tra không công bố dòng active/standby chính thức cho vgate iCar Pro BLE [64]. Vì vậy luận văn không nên điền số mA cứng cho adapter này nếu chưa có datasheet chính thức đúng mẫu.
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
|                                           | MP2482         |  | SX1308   |  |
|                                           | Buck           |  | Boost    |  |
|                                           | 7–40V->5V      |  | 3.7V->5V |  |
| +----+----+              +----+----+      |
|                                           |                |  |
| +--------+---------------+                |
|                                           |                |
| +--------v--------+                       |
|                                           | Power Path     |  |
|                                           | (Diode-OR + EN) |  |
| +--------+--------+                       |
|                                           |                |
| +--------v--------+                       |
|                                           | 5V Rail        |  |
| +--------+--------+                       |
|                                           |                |
| +------------+------------+               |
|                                           |                |  |          |
| +--v--+   +----v-----+  +---v---+         |
|                                           | LDO            |  | LTE/GNSS |  | TP4056  |  |
|                                           | 5->3.3         |  | SIM7600CE-T |  | Charger |  |
|                                           |                |  | LTE+GNSS tích hợp |  |         |  |
| +--+--+   +----------+  +---+---+         |
|                                           |                |  |
| +--v--+                  +--v--+          |
|                                           | ESP32          |  | Pin      |  |
| +-----+                  +-----+          |
+-----------------------------------------------------------+
```

##### a) Mạch buck converter (đầu vào 12V/24V sang 5V)

Mạch buck converter có nhiệm vụ giảm điện áp từ ắc quy xe (12V hoặc 24V) xuống 5V để cấp nguồn cho toàn hệ thống. IC MP2482–5.0 của Texas Instruments được lựa chọn vì các lý do sau:

[Bảng 3.8: Thông số kỹ thuật buck converter MP2482]

| Thông số           | Giá trị               |
| ------------------ | --------------------- |
| IC                 | MP2482–5.0 (Fixed 5V) |
| Điện áp vào        | 7–40 V                |
| Điện áp ra         | 5V @ 3A               |
| Hiệu suất          | ~85%                  |
| Tần số chuyển mạch | 150 kHz               |
| Package            | TO-220–5              |

Điện áp 5V được chọn làm bus nguồn chung vì phù hợp với đầu vào LDO 3.3V (cấp cho ESP32), mức hoạt động của modem SIMCom SIM7600CE-T (LTE + GNSS tích hợp) và đầu vào của mạch sạc TP4056. Dùng chung một bus 5V giúp đơn giản thiết kế và giảm số lượng converter cần triển khai.

Dòng ra 3A của MP2482 đáp ứng tải toàn hệ thống, gồm ESP32-S3 (80–120 mA), modem SIMCom SIM7600CE-T và mạch phụ trợ (10–20 mA). Dòng sạc 3A qua TP4056 chỉ xuất hiện khi xe chạy nên không đồng thời với toàn bộ tải trong mọi thời điểm.

Duty cycle của mạch được tính: D = Vout/Vin = 5/12 = 0.417 (41.7%). Tổn hao công suất: P_loss = (1–0.85) x 5V x 3A = 2.25W, cần xem xét tản nhiệt khi hoạt động ở công suất cao.

Đối với đồ án, nhóm khuyến nghị sử dụng module MP2482 sẵn có (giá 15.000–25.000 VND) đã tích hợp đầy đủ linh kiện phụ trợ (cuộn cảm 100 uH, tụ điện đầu vào 100 uF/50V, tụ điện đầu ra 220 uF/16V, diode Schottky 1N5822) [10].

##### b) Mạch boost converter (3.7V sang 5V)

Khi ắc quy xe yếu và hệ thống chuyển sang nguồn pin backup 21700 (3.7V), mạch boost converter có nhiệm vụ tăng điện áp từ 3.7V lên 5V. IC SX1308 được lựa chọn:

[Bảng 3.9: Thông số kỹ thuật boost converter SX1308]

| Thông số       | Giá trị                                    |
| -------------- | ------------------------------------------ |
| IC             | SX1308 (Step-Up Converter)                 |
| Điện áp vào    | 2–24 V                                     |
| Điện áp ra     | 5–28 V (điều chỉnh bằng điện trở feedback) |
| Dòng ra tối đa | 2A                                         |
| Hiệu suất      | ~85%                                       |
| Package        | SOT23–6                                    |

Dòng ra 2A là đủ cho hệ thống tracker khi chạy từ pin backup (không sạc pin trong chế độ này). Duty cycle: D = 1 - (Vin/Vout) = 1 - (3.7/5) = 0.26 (26%). Dòng đầu vào từ pin: Iin = Iout x (Vout/Vin)/n = 2 x (5/3.7)/0.85 = 3.18A, nằm trong giới hạn dòng xả của pin 21700 (3–5A) [11].

Module SX1308 sẵn có (giá 10.000–15.000 VND) được khuyến nghị sử dụng, đã tích hợp cuộn cảm 22 uH, điện trở feedback, và tụ điện lọc.

##### c) Quản lý đường nguồn (Power Path Management)

Hệ thống cần tự động chuyển đổi giữa hai nguồn cấp: ắc quy xe (qua buck converter) và pin backup (qua boost converter). Ba phương án được đánh giá:

[Bảng 3.10: So sánh các phương án Power Path Management theo thông số]

Đường nguồn runtime sử dụng kiến trúc **Diode-OR + EN** để duy trì cấp nguồn liên tục giữa nhánh chính và nhánh dự phòng, đồng thời cho phép firmware điều phối sạc/chuyển trạng thái theo profile 12V/24V.

```text
Buck 5V (MP2482)  --|<|--+
                     D1   |
                          +---- 5V Rail ----> tải hệ thống
                     D2   |
Boost 5V (SX1308)  --|<|--+

GPIO18/GPIO5 dùng để điều phối enable path (power path + charger EN) theo logic firmware.
```

- D1, D2 dùng diode Schottky để OR hai nguồn 5V, tránh backfeed giữa hai nhánh.
- Khi U_batt thấp hơn ngưỡng Switch_OFF, firmware ưu tiên nhánh backup (SX1308) và tắt sạc.
- Khi U_batt phục hồi vượt Switch_ON, firmware ưu tiên nhánh chính (MP2482) và cho phép sạc TP4056 theo điều kiện IGN.


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

- **Profile 12V:** Switch_OFF=12.0V, Switch_ON=12.2V
- **Profile 24V:** Switch_OFF=24.0V, Switch_ON=24.4V

[Bảng 3.11: Bảng trạng thái chuyển nguồn và cảnh báo]

| Trạng thái          | IGN | U_batt  | Nguồn tracker | Sạc pin | Cảnh báo              |
| ------------------- | --- | ------- | ------------- | ------- | --------------------- |
| Xe chạy bình thường | ON  | Profile 12V: U_batt >= 13.0V; Profile 24V: U_batt >= 26.0V | Ắc quy        | Có      | Không                 |
| Xe đỗ bình thường   | OFF | Profile 12V: U_batt > 12.0V; Profile 24V: U_batt > 24.0V   | Ắc quy        | Không   | Không                 |
| Ắc quy yếu          | OFF | Profile 12V: U_batt <= 12.0V; Profile 24V: U_batt <= 24.0V | Pin 21700     | Không   | Cảnh báo chuyển nguồn |
| Ắc quy phục hồi     | OFF | Profile 12V: U_batt >= 12.2V; Profile 24V: U_batt >= 24.4V | Ắc quy        | Không   | Cảnh báo phục hồi     |

*Ghi chú: Ngưỡng LVD profile: 12V dùng OFF=12.0V, ON=12.2V; 24V dùng OFF=24.0V, ON=24.4V.*

Phương pháp software-based được chọn thay cho hardware-based (LM393 comparator) vì không cần thêm linh kiện ngoài (chi phí = 0), cho phép điều chỉnh ngưỡng linh hoạt trong firmware, và độ chính xác của ADC 12-bit (độ phân giải ~3 mV) đã đáp ứng yêu cầu ứng dụng.

##### e) Mạch sạc pin và bảo vệ: TP4056

Module sạc TP4056 của Injoinic chịu trách nhiệm sạc pin 21700 khi xe chạy. Đây là IC sạc Li-ion với dòng sạc cao 3A, cho phép sạc đầy pin 5000 mAh trong khoảng 2 giờ thực tế.

[Bảng 3.12: Thông số kỹ thuật mạch sạc TP4056]

| Thông số    | Giá trị                                         |
| ----------- | ----------------------------------------------- |
| IC          | TP4056 (Injoinic)                               |
| Dòng sạc    | 3A (có thể điều chỉnh)                          |
| Điện áp vào | 4.5–5.5 V                                       |
| Điện áp sạc | 4.2V (Li-ion standard)                          |
| Hiệu suất   | 85–90%                                          |
| Bảo vệ      | Quá dòng, quá nhiệt, ngược cực, tự ngắt khi đầy |

Mạch sạc chỉ được kích hoạt khi đồng thời thỏa mãn hai điều kiện: IGN ON và U_batt vượt ngưỡng Switch_ON của profile cấu hình (12.2V với profile 12V, 24.4V với profile 24V). ESP32-S3 điều khiển chân EN của TP4056 qua GPIO với điện trở hạn dòng 10 kΩ. Khi xe đỗ (IGN OFF), mạch sạc bị vô hiệu hóa để bảo vệ ắc quy khỏi bị rút năng lượng không cần thiết [13].

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
| 4   | SIMCom SIM7600CE-T             | Bộ     | 1   | 330.000–500.000  | Modem LTE Cat-4 tích hợp GNSS + anten + khe SIM |
| 5   | Pin 21700 Li-ion 5000mAh       | Cái    | 1   | 100.000–200.000  | Loại có protection board             |
| 6   | Module sạc TP4056 (3A)         | Cái    | 1   | 20.000–40.000    | Type-C, dòng sạc 3A                  |
| 7   | BMS/Protection Board 1S        | Cái    | 1   | 10.000–20.000    | BMS 1S 3A hoặc DW01+MOSFET           |
| 8   | Module Buck MP2482 (7–40V->5V) | Cái    | 1   | 15.000–25.000    | Dòng ra 3A, tương thích hệ 12V/24V  |
| 9   | Module Boost SX1308 (3.7V->5V) | Cái    | 1   | 10.000–15.000    | Dòng ra 2A                           |
| 10  | Nhánh Diode-OR + EN path       | Bộ     | 1   | 5.000–15.000     | Chuyển nguồn runtime (D1/D2 + EN)    |
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
| B    | Quản lý nguồn (buck, boost, charger, BMS, diode-OR+EN) | 60.000–110.000     |
| C    | Linh kiện phụ trợ (điện trở, tụ, diode, connector) | 42.000–75.000         |
| D    | PCB và vỏ (tùy chọn)                               | 100.000–200.000       |
|      | **Tổng cộng**                                      | **872.000–1.635.000** |

Tổng chi phí ước tính cho toàn bộ phần cứng hệ thống tracker nằm trong khoảng **872.000–1.635.000 VND**, phù hợp với ngân sách đồ án tốt nghiệp. Nhóm khuyến nghị sử dụng các module sẵn có (thay vì IC rời) trong giai đoạn prototype nhằm rút ngắn thời gian phát triển và tạo điều kiện kiểm thử độc lập từng thành phần trước khi tích hợp.
