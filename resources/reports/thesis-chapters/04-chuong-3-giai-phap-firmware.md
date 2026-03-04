### 3.1.2. Phân tích và lựa chọn giải pháp Firmware

#### 3.1.2.1. Đặt vấn đề cho giải pháp Firmware

Firmware là lớp phần mềm nhúng chạy trực tiếp trên vi điều khiển ESP32-S3 và giữ vai trò điều phối toàn bộ hoạt động của thiết bị theo dõi. Do firmware là điểm hội tụ giữa phần cứng, truyền thông và nghiệp vụ, bài toán thiết kế phải đồng thời thỏa mãn các yêu cầu sau:

- **Đa nhiệm thời gian thực**: thu thập cảm biến, điều khiển modem, truyền dữ liệu và xử lý cảnh báo phải chạy song song, độ trễ thấp.
- **Quản lý năng lượng nghiêm ngặt**: chuyển trạng thái linh hoạt giữa active/sleep/deep sleep theo điều kiện vận hành xe.
- **Giao tiếp đa giao thức**: BLE (OBD2), UART (modem), MQTT/HTTP (cloud), I2C/ADC/GPIO (ngoại vi phần cứng).
- **Độ bền vận hành cao**: có cơ chế retry, fallback và phục hồi sau mất kết nối mạng hoặc lỗi ngoại vi.

#### 3.1.2.2. So sánh các phương án nền tảng Firmware

[Bảng 3.5A: So sánh các phương án nền tảng firmware]

| Phương án | Mô tả | Ưu điểm | Hạn chế | Mức phù hợp |
| --------- | ----- | ------- | ------- | ----------- |
| **PA-FW1: Arduino Core + Superloop** | Vòng lặp chính tuần tự, xử lý tác vụ theo polling | Dễ bắt đầu, ít cấu hình | Khó mở rộng đa nhiệm thực sự, khó tối ưu deep sleep phức tạp, quản lý lỗi hạn chế | Trung bình |
| **PA-FW2: ESP-IDF + FreeRTOS (Đã chọn)** | Kiến trúc task/event, driver chính thức Espressif | Đa nhiệm tốt, hỗ trợ power management sâu, tích hợp NimBLE/modem/UART/I2C ổn định | Độ phức tạp cao hơn Arduino | **Cao** |
| **PA-FW3: Zephyr RTOS trên ESP32** | RTOS đa nền tảng, kiến trúc module hóa | Tính chuẩn hóa tốt, khả năng mở rộng dài hạn | Hệ sinh thái ESP32 chuyên biệt và tài liệu thực chiến BLE-OBD2/modem ít hơn ESP-IDF | Trung bình |

#### 3.1.2.3. Chọn giải pháp Firmware

Từ kết quả so sánh, đồ án chọn **PA-FW2: ESP-IDF + FreeRTOS** làm nền tảng firmware chính.

Lý do lựa chọn:

- **Khớp yêu cầu đa nhiệm của hệ thống**: mô hình task/queue/event group phù hợp cho pipeline dữ liệu IoT.
- **Tối ưu cho ESP32-S3**: driver và power feature chính thức giúp giảm rủi ro tích hợp phần cứng.
- **Phù hợp bài toán năng lượng**: hỗ trợ deep sleep/wakeup và điều khiển peripheral theo trạng thái.
- **Dễ kiểm soát chất lượng vận hành**: thuận lợi xây dựng state machine, retry strategy và fallback cho BLE/modem.

### 3.2.2. Giải pháp Firmware

Firmware chịu trách nhiệm thu thập dữ liệu từ các cảm biến (IMU, GNSS, OBD2), quản lý nguồn điện, điều khiển giao tiếp mạng (4G/LTE) và truyền dữ liệu lên máy chủ qua giao thức MQTT. Trên cơ sở phương án đã chọn ở mục 3.1.2, phần này trình bày chi tiết giải pháp triển khai.

#### 3.2.2.1. Kiến trúc firmware và luồng hoạt động

##### a) Kiến trúc phân lớp (Layered Architecture)

Firmware được thiết kế theo mô hình phân lớp (layered architecture) gồm bốn tầng chính để bảo đảm tính module hóa và khả năng bảo trì:

| Tầng   | Tên tầng                         | Chức năng chính                                                                                          |
| ------ | -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Tầng 1 | Hardware Abstraction Layer (HAL) | Driver LIS3DH (IMU), modem LTE A7670C, module GNSS NEO-M8N (UART/NMEA), ADC, GPIO, BLE (OBD2 vgate iCar Pro) |
| Tầng 2 | Power Management Layer           | Quản lý chế độ ngủ (sleep/deep sleep), đánh thức (wakeup), cắt nguồn khi điện áp thấp (LVD)              |
| Tầng 3 | Application Layer                | Logic xử lý chế độ lái xe, đỗ xe, cảnh báo; xử lý sự kiện và alert                                       |
| Tầng 4 | Communication Layer              | Giao tiếp MQTT/HTTP, mã hóa dữ liệu, xử lý lệnh điều khiển từ máy chủ                                    |

Tầng HAL trừu tượng hóa truy cập phần cứng để các tầng trên làm việc với cảm biến và ngoại vi mà không phụ thuộc trực tiếp vào thanh ghi. Tầng Power Management quản lý trạng thái năng lượng toàn hệ thống. Tầng Application xử lý logic nghiệp vụ và chuyển đổi chế độ hoạt động. Tầng Communication đảm nhận đóng gói và truyền dữ liệu lên máy chủ.

![Hình 3.5 - Sơ đồ kiến trúc phân lớp của firmware](./assets/figures/04-chuong-3-giai-phap-firmware-hinh-3–5.svg)

*Hình 3.5: Sơ đồ kiến trúc phân lớp của firmware*

> Nguồn: Hình vẽ của tác giả

##### b) Kiến trúc đa nhiệm với FreeRTOS

Firmware sử dụng hệ điều hành thời gian thực FreeRTOS (tích hợp sẵn trong ESP-IDF) để quản lý nhiều tác vụ đồng thời. Các task chính được thiết kế với độ ưu tiên phù hợp:

| Task                 | Độ ưu tiên     | Chức năng                                                       |
| -------------------- | -------------- | --------------------------------------------------------------- |
| `power_monitor_task` | Cao (5)        | Giám sát điện áp ắc quy, điều khiển power path, phát hiện LVD   |
| `modem_control_task` | Cao (4)        | Điều khiển modem SIMCom qua AT commands, quản lý kết nối 4G/LTE |
| `ble_obd2_task`      | Trung bình (3) | Kết nối BLE với OBD2 adapter, đọc dữ liệu xe                    |
| `gnss_task`          | Trung bình (3) | Đọc dữ liệu vị trí GPS/GNSS từ module NEO-M8N qua UART          |
| `mqtt_publish_task`  | Trung bình (2) | Đóng gói và gửi dữ liệu telemetry qua MQTT                      |
| `state_machine_task` | Thấp (1)       | Điều phối chuyển đổi trạng thái toàn hệ thống                   |

Giao tiếp giữa các task sử dụng cơ chế hàng đợi (FreeRTOS Queue) và nhóm sự kiện (Event Group). Hàng đợi được sử dụng để truyền dữ liệu telemetry từ các task cảm biến đến task MQTT. Nhóm sự kiện được sử dụng để đồng bộ trạng thái giữa các task, ví dụ thông báo sự kiện "IGN ON detected" hoặc "network connected".

```c
/* Khai báo hàng đợi và nhóm sự kiện */
static QueueHandle_t telemetry_queue;
static EventGroupHandle_t system_event_group;

/* Các bit sự kiện */
#define EVT_IGN_ON          (1 << 0)
#define EVT_IGN_OFF         (1 << 1)
#define EVT_NETWORK_READY   (1 << 2)
#define EVT_GPS_FIX         (1 << 3)
#define EVT_MOTION_DETECTED (1 << 4)
#define EVT_LOW_BATTERY     (1 << 5)

void app_main(void) {
    /* Khởi tạo hàng đợi và nhóm sự kiện */
    telemetry_queue = xQueueCreate(32, sizeof(telemetry_msg_t));
    system_event_group = xEventGroupCreate();

    /* Khởi tạo các task */
    xTaskCreate(power_monitor_task, "pwr_mon", 4096, NULL, 5, NULL);
    xTaskCreate(modem_control_task, "modem",   8192, NULL, 4, NULL);
    xTaskCreate(ble_obd2_task,     "ble_obd", 8192, NULL, 3, NULL);
    xTaskCreate(gnss_task,         "gnss",    4096, NULL, 3, NULL);
    xTaskCreate(mqtt_publish_task, "mqtt",    8192, NULL, 2, NULL);
    xTaskCreate(state_machine_task,"sm",      4096, NULL, 1, NULL);
}
```

![Hình 3.6 - Sơ đồ tương tác giữa các FreeRTOS task](./assets/figures/04-chuong-3-giai-phap-firmware-hinh-3–6.svg)

*Hình 3.6: Sơ đồ tương tác giữa các FreeRTOS task*

> Nguồn: Hình vẽ của tác giả

##### c) Luồng hoạt động cơ bản

Luồng hoạt động tổng thể của firmware được tổ chức theo trình tự sau:

1. **Khởi tạo ngoại vi**: Cấu hình và khởi động các peripheral gồm IMU (LIS3DH qua I2C), modem LTE A7670C (UART), module GNSS NEO-M8N (UART), ADC (đọc điện áp), và BLE stack (NimBLE).

2. **Đọc trạng thái IGN và điện áp ắc quy**: Hệ thống ưu tiên đọc trạng thái động cơ (IGN) trực tiếp từ ECU qua OBD2 BLE. Nếu không kết nối được OBD2, hệ thống fallback sang đo điện áp ắc quy qua ADC theo profile: profile 12V dùng IGN_ON >= 13.0V và IGN_OFF <= 12.0V; profile 24V dùng IGN_ON >= 26.0V và IGN_OFF <= 24.0V.

3. **Quyết định chế độ hoạt động**: Dựa trên trạng thái IGN và dữ liệu cảm biến, firmware chuyển sang chế độ phù hợp (lái xe, đỗ xe, hoặc cảnh báo).

4. **Thực thi tác vụ trong từng chế độ**:
   - **Chế độ lái xe (Driving)**: Kết nối OBD2, theo dõi liên tục, giữ BLE active, gửi telemetry định kỳ.
   - **Chế độ đỗ xe (Parked)**: Không kết nối OBD2, chuyển sang deep sleep, gửi heartbeat định kỳ.
   - **Chế độ cảnh báo (Alarm)**: Gửi cảnh báo ngay lập tức, theo dõi liên tục, có thể kết nối OBD2 tùy chọn.

5. **Xử lý sau tác vụ**: Nếu IGN ON, giữ kết nối BLE và không deep sleep. Nếu IGN OFF, ngắt BLE và chuyển sang deep sleep để tiết kiệm năng lượng.

![Hình 3.7 - Lưu đồ thuật toán luồng hoạt động chính của firmware](./assets/figures/04-chuong-3-giai-phap-firmware-hinh-3–7.png)

*Hình 3.7: Lưu đồ thuật toán luồng hoạt động chính của firmware*

> Nguồn: Hình vẽ của tác giả

#### 3.2.2.2. Module giao tiếp Bluetooth OBD2

##### a) Tổng quan giao tiếp BLE OBD2

Module giao tiếp Bluetooth Low Energy (BLE) OBD2 cho phép thiết bị theo dõi kết nối không dây với adapter vgate iCar Pro — thiết bị OBD2 hỗ trợ BLE, được cắm trực tiếp vào cổng chẩn đoán OBD-II của xe. Firmware sử dụng NimBLE stack (tích hợp trong ESP-IDF) để triển khai giao tiếp BLE theo chuẩn GATT (Generic Attribute Profile).

Kiến trúc module BLE OBD2 được tổ chức theo bốn tầng:

```
+-------------------------------------------+
|         Application Layer                 |
|  (main.c - OBD task, xử lý dữ liệu)     |
+-------------------+-----------------------+
                    |
+-------------------v-----------------------+
|         OBD Protocol Layer                |
|  (ble_obd.c - xử lý giao thức OBD2)     |
|  - Phân tích phản hồi OBD                |
|  - Chuyển đổi dữ liệu PID              |
|  - Gửi lệnh OBD2 (ELM327 compatible)    |
+-------------------+-----------------------+
                    |
+-------------------v-----------------------+
|         BLE Manager Layer                 |
|  (ble_mgr.c - quản lý GATT)             |
|  - Tìm kiếm thiết bị (discovery)        |
|  - Khám phá service/characteristic       |
|  - Đọc/ghi/thông báo GATT               |
+-------------------+-----------------------+
                    |
+-------------------v-----------------------+
|         BLE Stack Layer                   |
|  (NimBLE - khởi tạo và quản lý stack)    |
+-------------------------------------------+
```

##### b) Quy trình kết nối BLE OBD2

Quy trình kết nối BLE với adapter OBD2 diễn ra theo các bước sau:

1. **Kiểm tra địa chỉ BLE đã lưu**: Đọc địa chỉ MAC của vgate iCar Pro từ bộ nhớ flash (NVS). Nếu đã có địa chỉ, chuyển trực tiếp sang bước kết nối (reconnect nhanh trong 1–3 giây).

2. **Quét tìm thiết bị (Scan)**: Nếu chưa có địa chỉ, thực hiện BLE scan để tìm adapter. Quá trình scan lọc thiết bị theo tên (device name) hoặc service UUID đặc trưng của OBD2 adapter.

3. **Kết nối GATT**: Thiết lập kết nối BLE với adapter, thực hiện GATT service discovery để tìm các characteristic cần thiết (TX và RX characteristic).

4. **Gửi lệnh khởi tạo ELM327**: Gửi chuỗi lệnh khởi tạo giao thức ELM327 qua BLE GATT write:
   - `ATZ` — Reset adapter
   - `ATE0` — Tắt echo
   - `ATL0` — Tắt line feed
   - `ATS0` — Tắt khoảng trắng
   - `ATSP0` — Tự động phát hiện giao thức OBD2

5. **Đọc dữ liệu OBD2**: Gửi các lệnh PID (Parameter ID) để đọc thông số xe:
   - `010C` — RPM động cơ
   - `010D` — Tốc độ xe
   - `0105` — Nhiệt độ nước làm mát
   - `012F` — Mức nhiên liệu
   - `AT IGN` — Trạng thái động cơ (ignition)

```c
/* Quy trình kết nối và đọc dữ liệu OBD2 */
void ble_obd2_task(void *param) {
    /* Bước 1: Đọc BLE address từ NVS */
    uint8_t saved_addr[6];
    bool has_saved = nvs_read_ble_address(saved_addr);

    /* Bước 2: Kết nối hoặc scan */
    if (has_saved) {
        ble_connect_direct(saved_addr);  /* Reconnect nhanh */
    } else {
        ble_start_scan(BLE_SCAN_TIMEOUT_MS);
        ble_connect_first_obd2_device();
        nvs_save_ble_address(connected_addr);
    }

    /* Bước 3: Khởi tạo ELM327 */
    ble_obd_send_command("ATZ");
    ble_obd_send_command("ATE0");
    ble_obd_send_command("ATSP0");

    /* Bước 4: Vòng lặp đọc dữ liệu */
    while (device_state == STATE_DRIVING) {
        obd2_data_t data;
        data.rpm   = ble_obd_read_pid(PID_RPM);
        data.speed = ble_obd_read_pid(PID_SPEED);
        data.temp  = ble_obd_read_pid(PID_COOLANT_TEMP);
        data.fuel  = ble_obd_read_pid(PID_FUEL_LEVEL);

        xQueueSend(telemetry_queue, &data, pdMS_TO_TICKS(100));
        vTaskDelay(pdMS_TO_TICKS(TRACKING_INTERVAL_MS));
    }
}
```

![Hình 3.8 - Lưu đồ thuật toán quy trình kết nối và đọc dữ liệu BLE OBD2](./assets/figures/04-chuong-3-giai-phap-firmware-hinh-3–8.jpg)

*Hình 3.8: Lưu đồ thuật toán quy trình kết nối và đọc dữ liệu BLE OBD2*

> Nguồn: Hình vẽ của tác giả

##### c) Chiến lược kết nối theo chế độ hoạt động

Việc kết nối BLE OBD2 được tối ưu hóa theo từng chế độ hoạt động của thiết bị để tiết kiệm năng lượng:

**Chế độ lái xe (IGN ON)**: ESP32-S3 duy trì kết nối BLE liên tục với OBD2 adapter. Dữ liệu OBD2 được đọc định kỳ (mỗi 5–10 giây). Hệ thống chỉ sử dụng light sleep (giữ BLE active) thay vì deep sleep.

**Chế độ đỗ xe (IGN OFF)**: Không kết nối OBD2 adapter. Trạng thái IGN đã được xác nhận trước khi chuyển sang deep sleep. Việc không kết nối BLE khi đỗ xe giúp tiết kiệm đáng kể thời gian wake-up và năng lượng tiêu thụ.

**Chế độ cảnh báo (Motion Detected)**: Kết nối OBD2 là tùy chọn. Hệ thống có thể chỉ sử dụng IMU và GPS để xác nhận chuyển động mà không cần dữ liệu OBD2.

Đặc biệt, khi ESP32-S3 chuyển sang deep sleep, kết nối BLE bị ngắt hoàn toàn. Mỗi lần wake-up, firmware cần thực hiện reconnect với adapter. Nhờ có việc lưu địa chỉ MAC vào flash, thời gian reconnect chỉ mất khoảng 1–3 giây, nhanh hơn đáng kể so với pairing lần đầu (3–10 giây).

##### d) Xử lý lỗi và cơ chế dự phòng (Fallback)

Module BLE OBD2 được thiết kế với nhiều lớp xử lý lỗi:

| Tình huống lỗi              | Xử lý                                           | Thời gian timeout |
| --------------------------- | ----------------------------------------------- | ----------------- |
| Không kết nối được adapter  | Retry 2–3 lần với delay 2 giây, sau đó fallback | 10 giây           |
| Mất kết nối giữa chừng      | Reconnect 2–3 lần, nếu thất bại thì fallback    | 5 giây mỗi lần    |
| Adapter không phản hồi lệnh | Retry 1–2 lần, nếu thất bại thì fallback        | 5 giây            |

**Cơ chế dự phòng (Fallback)**: Khi không thể giao tiếp với OBD2 adapter, hệ thống chuyển sang phát hiện trạng thái động cơ bằng phương pháp đo điện áp ắc quy. Phương pháp này có độ chính xác thấp hơn OBD2 nhưng vẫn đảm bảo hệ thống hoạt động liên tục. Tiêu chí phân biệt theo profile: profile 12V dùng IGN_ON>=13.0V và IGN_OFF<=12.0V; profile 24V dùng IGN_ON>=26.0V và IGN_OFF<=24.0V.

Mọi lỗi kết nối OBD2 đều được ghi lại vào log để phục vụ việc giám sát và khắc phục sự cố từ xa.

#### 3.2.2.3. Module điều khiển modem SIMCom

##### a) Tổng quan modem A7670C + GNSS NEO-M8N

Trong kiến trúc hiện tại, modem SIMCom A7670C là thành phần giao tiếp mạng chính của thiết bị, cung cấp kết nối 4G/LTE. Chức năng định vị GNSS (GPS + GLONASS + BeiDou) được tách sang module NEO-M8N và xử lý qua UART/NMEA parser riêng. Modem được điều khiển bởi ESP32-S3 thông qua tập lệnh AT (AT commands), đảm bảo quy trình khởi tạo, kết nối mạng và gửi dữ liệu diễn ra có hệ thống và có khả năng phục hồi từ lỗi.

##### b) Quy trình khởi tạo modem

Quy trình khởi tạo modem diễn ra theo bốn bước tuần tự:

| Bước | Lệnh AT    | Phản hồi mong đợi | Mục đích                         |
| ---- | ---------- | ----------------- | -------------------------------- |
| 1    | `AT`       | `OK`              | Kiểm tra modem còn phản hồi      |
| 2    | `AT+CPIN?` | `+CPIN: READY`    | Kiểm tra SIM card đã sẵn sàng    |
| 3    | `AT+CREG?` | `+CREG: 0,1`      | Kiểm tra đăng ký mạng thành công |
| 4    | `AT+CSQ`   | `+CSQ: 20,99`     | Đọc cường độ tín hiệu (RSSI)     |

Trường hợp modem không phản hồi, firmware thực hiện reset phần cứng bằng cách điều khiển chân PWRKEY (GPIO25): kéo LOW rồi HIGH trong 1–2 giây, sau đó đợi modem khởi động lại (10–30 giây). Nếu SIM chưa sẵn sàng hoặc chưa đăng ký mạng, hệ thống đợi và retry (quá trình đăng ký mạng có thể mất 30–60 giây).

##### c) Điều khiển kết nối 4G/LTE

**Bật kết nối 4G:**

Quy trình bật kết nối 4G/LTE gồm các bước: thiết lập chế độ mạng (`AT+CNMP=38` cho LTE only), kích hoạt PDP context (`AT+CGACT=1,1`), và cấu hình APN của nhà mạng (`AT+CGDCONT=1,"IP","internet"`).

**Tắt kết nối 4G:**

Khi không cần gửi dữ liệu (chế độ đỗ xe), firmware đóng PDP context (`AT+CGACT=0,1`) hoặc đưa modem vào chế độ Flight Mode (`AT+CFUN=4`) để tiết kiệm năng lượng.

**Chiến lược sử dụng theo chế độ:**

- **Lái xe (IGN ON)**: Giữ 4G active liên tục để gửi dữ liệu telemetry định kỳ.
- **Đỗ xe (IGN OFF)**: Tắt 4G trước khi deep sleep.
- **Heartbeat**: Bật 4G -> gửi heartbeat -> tắt 4G -> deep sleep.

##### d) Điều khiển GNSS/GPS

Trong kiến trúc hiện tại, modem A7670C đảm nhiệm kết nối 4G/LTE, còn định vị GNSS được tách sang module NEO-M8N. Firmware điều khiển A7670C bằng AT commands cho phần cellular, trong khi dữ liệu GNSS được đọc từ NEO-M8N qua UART/NMEA parser:

**Bật GNSS (NEO-M8N)**: cấp nguồn cho module GNSS và khởi tạo UART reader.

**Đọc vị trí**: đọc và parse bản tin NMEA (ví dụ `GGA`, `RMC`, `VTG`) từ NEO-M8N để lấy tọa độ, vận tốc và trạng thái fix.

Trong đó các trường quan trọng gồm: trạng thái fix, `lat`/`lon` (tọa độ thập phân), `alt` (độ cao, mét), `speed` (tốc độ, km/h), số vệ tinh khả dụng.

**Tắt GNSS**: ngắt nguồn GNSS hoặc đưa module vào chế độ tiết kiệm năng lượng theo cấu hình.

Thời gian để GNSS fix được vị trí phụ thuộc vào trạng thái trước đó:

| Loại khởi động | Điều kiện | Thời gian fix |
| -------------- | --------- | ------------- |
| Hot start      | Module vừa hoạt động trước đó, còn dữ liệu hỗ trợ | 1–5 giây |
| Warm start     | Còn một phần dữ liệu hỗ trợ | 5–20 giây |
| Cold start     | Khởi động mới hoàn toàn | 20–60 giây |

![Hình 3.9 - Lưu đồ thuật toán điều khiển modem theo chế độ hoạt động](./assets/figures/04-chuong-3-giai-phap-firmware-hinh-3–9.png)

*Hình 3.9: Lưu đồ thuật toán điều khiển modem theo chế độ hoạt động*

> Nguồn: Hình vẽ của tác giả

##### e) Chế độ ngủ của modem

Modem A7670C hỗ trợ các chế độ tiết kiệm năng lượng cho phần LTE, trong khi NEO-M8N được bật/tắt độc lập theo nhu cầu định vị:

| Chế độ              | Lệnh AT      | Dòng tiêu thụ | Đặc điểm                                                          |
| ------------------- | ------------ | ------------- | ----------------------------------------------------------------- |
| Sleep (CSCLK)       | `AT+CSCLK=1` | 1–5 mA        | Tự động ngủ khi UART không hoạt động, đánh thức bằng dữ liệu UART |
| Deep Sleep (CFUN=0) | `AT+CFUN=0`  | < 1 mA        | Tắt RF, giữ UART, đánh thức bằng lệnh AT hoặc GPIO                |

Trước khi ESP32-S3 vào deep sleep, firmware đưa modem vào chế độ sleep (`AT+CSCLK=1` hoặc `AT+CFUN=0`) và lưu trạng thái modem. Khi ESP32-S3 wake-up, firmware đánh thức modem bằng cách gửi ký tự bất kỳ trên UART, sau đó khôi phục kết nối 4G (`AT+CFUN=1`, `AT+CGACT=1,1`).

##### f) Xử lý lỗi modem

| Lỗi                  | Phương án xử lý                                                         |
| -------------------- | ----------------------------------------------------------------------- |
| Modem không phản hồi | Timeout 5 giây -> reset GPIO PWRKEY -> đợi 10–30 giây -> retry khởi tạo |
| Mất kết nối 4G       | Kiểm tra `AT+CREG?` và `AT+CGACT?` -> deactivate/reactivate PDP context |
| GNSS không fix       | Timeout 60 giây -> tắt/bật lại GNSS -> gửi dữ liệu không có GPS nếu cần |
| Modem quá nhiệt      | Phát hiện qua phản hồi bất thường -> đưa vào sleep mode tạm thời        |

#### 3.2.2.4. Module quản lý nguồn và GPIO

##### a) Sơ đồ chân GPIO

Module quản lý nguồn sử dụng các chân GPIO của ESP32-S3 để điều khiển và giám sát hệ thống nguồn điện. Bảng sau liệt kê đầy đủ các chân GPIO được sử dụng:

| GPIO | Chức năng     | Hướng  | Mô tả                                     |
| ---- | ------------- | ------ | ----------------------------------------- |
| 2    | IGN_IN        | Input  | Đọc trạng thái động cơ (GPIO hoặc OBD2)   |
| 4    | U_BATT_ADC    | Input  | Đọc điện áp ắc quy (ADC 12-bit)           |
| 5    | CHARGER_EN    | Output | Điều khiển IC sạc IP2312                  |
| 18   | POWER_MUX_SEL | Output | Chọn nguồn cấp (ắc quy hoặc pin dự phòng) |
| 19   | LVD_STATUS    | Input  | Đọc trạng thái LVD từ comparator LM393    |
| 21   | LIS3DH_INT    | Input  | Ngắt từ cảm biến gia tốc IMU              |
| 22   | LIS3DH_SDA    | I/O    | Đường dữ liệu I2C                         |
| 23   | LIS3DH_SCL    | I/O    | Đường clock I2C                           |
| 16   | MODEM_UART_TX | Output | UART TX đến modem                         |
| 17   | MODEM_UART_RX | Input  | UART RX từ modem                          |
| 25   | MODEM_PWRKEY  | Output | Điều khiển nguồn modem                    |

##### b) Điều khiển Power Path (MOSFET Power MUX)

Hệ thống sử dụng mạch Power MUX dựa trên hai MOSFET (Q1 và Q2) để chuyển đổi nguồn cấp giữa ắc quy xe và pin dự phòng 21700. Firmware điều khiển qua chân GPIO18 (POWER_MUX_SEL):

- **GPIO18 = LOW (0)**: Dùng nguồn ắc quy xe (Q1 ON, Q2 OFF) — chế độ mặc định khi IGN ON.
- **GPIO18 = HIGH (1)**: Dùng pin dự phòng (Q1 OFF, Q2 ON) — khi điện áp ắc quy quá thấp.

Logic điều khiển power path được thực hiện trong task giám sát nguồn:

```c
void power_monitor_task(void *param) {
    while (1) {
        float u_batt = adc_read_battery_voltage();
        bool ign_on = check_ignition_status();

        if (ign_on) {
            select_battery_power();     /* Luôn dùng ắc quy khi IGN ON */
            enable_charger();           /* Sạc pin dự phòng */
        } else if (u_batt < LVD_THRESHOLD) {
            select_backup_power();      /* Chuyển sang pin dự phòng */
            disable_charger();          /* Tắt sạc để bảo vệ ắc quy */
            xEventGroupSetBits(system_event_group, EVT_LOW_BATTERY);
        } else if (u_batt > LVD_HYSTERESIS) {
            select_battery_power();     /* Phục hồi dùng ắc quy */
        }

        vTaskDelay(pdMS_TO_TICKS(5000));
    }
}
```

![Hình 3.10 - Lưu đồ thuật toán điều khiển power path](./assets/figures/04-chuong-3-giai-phap-firmware-hinh-3–10.png)

*Hình 3.10: Lưu đồ thuật toán điều khiển power path*

> Nguồn: Hình vẽ của tác giả

##### c) Điều khiển IC sạc (IP2312)

IC sạc IP2312 được điều khiển qua chân GPIO5 (CHARGER_EN). Logic sạc được thiết kế để bảo vệ cả ắc quy xe lẫn pin dự phòng:

| Điều kiện              | Trạng thái charger    | Lý do                                               |
| ---------------------- | --------------------- | --------------------------------------------------- |
| IGN ON và U_batt vượt ngưỡng profile (ví dụ > 12V cho hệ 12V) | Enable (GPIO5 = HIGH) | Máy phát điện đang nạp, có thể sạc pin dự phòng     |
| IGN OFF                | Disable (GPIO5 = LOW) | Bảo vệ ắc quy không bị hao pin khi xe tắt máy       |
| U_batt dưới ngưỡng profile (ví dụ < 12V cho hệ 12V) | Disable (GPIO5 = LOW) | Ắc quy yếu, không đủ năng lượng để sạc pin dự phòng |

##### d) Giám sát điện áp và LVD

Firmware đọc điện áp ắc quy qua kênh ADC 12-bit (GPIO4) với bộ chia áp để đưa điện áp ắc quy 12V hoặc 24V về dải đo của ADC (0–3.3V). Giá trị ADC được chuyển đổi sang điện áp thực thông qua công thức hiệu chuẩn (calibration).

Ngoài ra, hệ thống có thêm kênh giám sát LVD độc lập sử dụng comparator LM393 (GPIO19). Đây là kênh dự phòng cho ADC, cho phép kiểm tra nhanh trạng thái nguồn với cơ chế trễ (hysteresis): profile 12V dùng Switch_OFF=12.0V, Switch_ON=12.2V; profile 24V dùng Switch_OFF=24.0V, Switch_ON=24.4V. Comparator tự xử lý hysteresis ở mức phần cứng, tránh hiện tượng dao động (oscillation) quanh ngưỡng.

##### e) Các chế độ quản lý nguồn

Firmware hỗ trợ ba chế độ năng lượng chính:

| Chế độ           | Trạng thái ESP32 | Trạng thái modem    | Trạng thái BLE | Dòng tiêu thụ |
| ---------------- | ---------------- | ------------------- | -------------- | ------------- |
| Normal (Driving) | Active           | 4G + GNSS active    | Connected      | 150–250 mA    |
| Light Sleep      | Light sleep      | Sleep (CSCLK)       | Giữ kết nối    | 10–20 mA      |
| Deep Sleep       | Deep sleep       | Deep sleep (CFUN=0) | Ngắt kết nối   | < 2 mA        |

Chuyển đổi giữa các chế độ dựa trên trạng thái IGN và dữ liệu cảm biến, được điều phối bởi máy trạng thái chính (trình bày tại mục 3.2.2.5).

#### 3.2.2.5. Định dạng dữ liệu và máy trạng thái

##### a) Định dạng dữ liệu MQTT

Dữ liệu từ thiết bị được đóng gói theo định dạng JSON và truyền lên máy chủ thông qua giao thức MQTT 5.0. Hệ thống định nghĩa ba loại thông điệp chính:

**Thông điệp Telemetry (dữ liệu hoạt động)**

Chứa toàn bộ dữ liệu hoạt động của xe, gửi định kỳ khi xe đang chạy:

```json
{
  "timestamp": "2024–01–01T12:00:00Z",
  "device_id": "TRACKER_001",
  "vehicle_id": "VEHICLE_001",
  "location": {
    "lat": 22.123456,
    "lon": 105.123456,
    "alt": 50.5,
    "speed": 60.0,
    "course": 180.0,
    "satellites": 8
  },
  "obd2": {
    "ign": true,
    "rpm": 2000,
    "speed": 60,
    "fuel": 75,
    "temp": 85
  },
  "power": {
    "battery_voltage": 12.5,
    "backup_battery": 3.8,
    "power_source": "battery",
    "charger_enabled": true
  },
  "status": {
    "mode": "driving",
    "signal_strength": 20
  }
}
```

**Thông điệp Alert (cảnh báo)**

Gửi ngay khi phát hiện sự kiện bất thường:

```json
{
  "timestamp": "2024–01–01T12:00:00Z",
  "device_id": "TRACKER_001",
  "vehicle_id": "VEHICLE_001",
  "alert_type": "motion_detected",
  "severity": "high",
  "location": {
    "lat": 22.123456,
    "lon": 105.123456
  },
  "description": "Vehicle movement detected while parked"
}
```

**Thông điệp Heartbeat (nhịp tim)**

Gửi định kỳ khi xe đang đỗ để xác nhận thiết bị còn hoạt động:

```json
{
  "timestamp": "2024–01–01T12:00:00Z",
  "device_id": "TRACKER_001",
  "type": "heartbeat",
  "location": {
    "lat": 22.123456,
    "lon": 105.123456
  },
  "power": {
    "battery_voltage": 12.3,
    "backup_battery": 4.0,
    "power_source": "battery"
  },
  "status": "parked"
}
```

##### b) Thiết kế MQTT Topic

Hệ thống sử dụng cấu trúc phân cấp MQTT topic để tổ chức luồng dữ liệu:

| Topic                           | Hướng            | QoS | Mô tả                                          |
| ------------------------------- | ---------------- | --- | ---------------------------------------------- |
| `vehicle/{device_id}/telemetry` | Device -> Server | 0   | Dữ liệu vị trí, OBD2, nguồn điện (gửi định kỳ) |
| `vehicle/{device_id}/alerts`    | Device -> Server | 1   | Cảnh báo khẩn cấp (đảm bảo gửi thành công)     |
| `vehicle/{device_id}/status`    | Device -> Server | 1   | Thông báo trạng thái thiết bị (online/offline) |
| `vehicle/{device_id}/commands`  | Server -> Device | 1   | Lệnh điều khiển từ máy chủ                     |

Các lệnh điều khiển từ máy chủ bao gồm:

| Lệnh               | Mục đích                     | Tham số                                   |
| ------------------ | ---------------------------- | ----------------------------------------- |
| `update_config`    | Cập nhật cấu hình thiết bị   | `heartbeat_interval`, `tracking_interval` |
| `request_location` | Yêu cầu gửi vị trí ngay      | Không                                     |
| `enable_tracking`  | Bật chế độ theo dõi liên tục | `duration` (giây)                         |

##### c) Cơ chế lưu trữ dữ liệu ngoại tuyến (Offline Buffering)

Khi thiết bị mất kết nối mạng (mất sóng 4G, modem lỗi), dữ liệu telemetry được lưu tạm vào bộ nhớ flash của ESP32-S3. Hệ thống sử dụng vùng nhớ SPIFFS hoặc LittleFS làm bộ đệm vòng (circular buffer), với dung lượng dự trữ cho khoảng 500–1000 bản ghi telemetry.

Khi kết nối mạng được khôi phục, firmware tự động gửi lần lượt các bản ghi đã lưu theo thứ tự thời gian (FIFO - First In, First Out). Sau khi gửi thành công (nhận được ACK từ MQTT broker), các bản ghi đã gửi được xóa khỏi flash.

```c
/* Lưu dữ liệu offline */
void buffer_telemetry(telemetry_msg_t *msg) {
    if (!is_network_connected()) {
        flash_buffer_write(msg, sizeof(telemetry_msg_t));
        offline_count++;
    }
}

/* Gửi dữ liệu đã lưu khi có mạng */
void flush_offline_buffer(void) {
    telemetry_msg_t msg;
    while (flash_buffer_read(&msg, sizeof(telemetry_msg_t))) {
        if (mqtt_publish_telemetry(&msg) == SUCCESS) {
            flash_buffer_mark_sent();
        } else {
            break;  /* Dừng gửi nếu mất kết nối lại */
        }
    }
}
```

##### d) Máy trạng thái thiết bị (Device State Machine)

Máy trạng thái là cơ chế điều phối trung tâm của firmware, quyết định hành vi thiết bị tại từng thời điểm vận hành. Hệ thống định nghĩa bảy trạng thái chính:

| Trạng thái | Mã  | Mô tả                                              |
| ---------- | --- | -------------------------------------------------- |
| INIT       | 0   | Khởi tạo hệ thống, cấu hình ngoại vi               |
| CHECK_IGN  | 1   | Kiểm tra trạng thái động cơ                        |
| DRIVING    | 2   | Chế độ lái xe - theo dõi liên tục                  |
| PARKED     | 3   | Chế độ đỗ xe - tiết kiệm năng lượng                |
| ALARM      | 4   | Chế độ cảnh báo - phát hiện chuyển động bất thường |
| HEARTBEAT  | 5   | Gửi tín hiệu heartbeat                             |
| SLEEP      | 6   | Deep sleep - tiêu thụ năng lượng tối thiểu         |

**Bảng chuyển đổi trạng thái:**

| Trạng thái hiện tại | Sự kiện kích hoạt                | Trạng thái tiếp theo |
| ------------------- | -------------------------------- | -------------------- |
| INIT                | Khởi tạo hoàn tất                | CHECK_IGN            |
| CHECK_IGN           | IGN = ON                         | DRIVING              |
| CHECK_IGN           | IGN = OFF                        | PARKED               |
| DRIVING             | IGN = OFF được phát hiện         | PARKED               |
| PARKED              | IMU interrupt (motion detected)  | ALARM                |
| PARKED              | Timer wake-up                    | HEARTBEAT            |
| ALARM               | Motion dừng, IGN = OFF           | PARKED               |
| ALARM               | IGN = ON                         | DRIVING              |
| HEARTBEAT           | Gửi heartbeat xong               | SLEEP                |
| SLEEP               | Timer wake-up hoặc IMU interrupt | CHECK_IGN            |

![Hình 3.11 - Sơ đồ máy trạng thái của thiết bị theo dõi](./assets/figures/04-chuong-3-giai-phap-firmware-hinh-3–11.svg)

*Hình 3.11: Sơ đồ máy trạng thái của thiết bị theo dõi*

> Nguồn: Hình vẽ của tác giả

```c
/* Cấu trúc máy trạng thái */
typedef enum {
    STATE_INIT,
    STATE_CHECK_IGN,
    STATE_DRIVING,
    STATE_PARKED,
    STATE_ALARM,
    STATE_HEARTBEAT,
    STATE_SLEEP
} device_state_t;

void state_machine_task(void *param) {
    device_state_t state = STATE_INIT;

    while (1) {
        switch (state) {
        case STATE_INIT:
            init_peripherals();
            state = STATE_CHECK_IGN;
            break;

        case STATE_CHECK_IGN:
            if (check_ignition_status()) {
                state = STATE_DRIVING;
            } else {
                state = STATE_PARKED;
            }
            break;

        case STATE_DRIVING:
            start_continuous_tracking();
            /* Chuyển sang PARKED khi phát hiện IGN OFF */
            EventBits_t bits = xEventGroupWaitBits(
                system_event_group, EVT_IGN_OFF,
                pdTRUE, pdFALSE, pdMS_TO_TICKS(1000));
            if (bits & EVT_IGN_OFF) {
                stop_ble_connection();
                state = STATE_PARKED;
            }
            break;

        case STATE_PARKED:
            prepare_for_sleep();
            state = STATE_SLEEP;
            break;

        case STATE_ALARM:
            send_alert_immediate();
            start_continuous_tracking();
            /* Đợi cho đến khi hết chuyển động */
            if (!is_motion_detected() && !check_ignition_status()) {
                state = STATE_PARKED;
            }
            break;

        case STATE_HEARTBEAT:
            wakeup_modem();
            send_heartbeat();
            flush_offline_buffer();
            state = STATE_SLEEP;
            break;

        case STATE_SLEEP:
            shutdown_modem();
            configure_wakeup_sources();
            enter_deep_sleep();
            /* Sau khi wake-up, bắt đầu lại từ CHECK_IGN */
            state = STATE_CHECK_IGN;
            break;
        }
    }
}
```

**Lưu trạng thái qua deep sleep**: Trước khi vào deep sleep, firmware lưu trạng thái hiện tại vào vùng nhớ RTC (RTC memory) — vùng nhớ đặc biệt của ESP32-S3 được giữ nguyên nội dung trong suốt quá trình deep sleep. Khi wake-up, firmware đọc trạng thái từ RTC memory để biết chế độ hoạt động trước đó và xử lý phù hợp.

#### 3.2.2.6. Cấu hình hệ thống

##### a) Cấu trúc dữ liệu cấu hình

Toàn bộ cấu hình của thiết bị được lưu trữ trong bộ nhớ flash (NVS — Non-Volatile Storage) của ESP32-S3 dưới dạng cấu trúc dữ liệu cố định:

```c
typedef struct {
    char     device_id[16];          /* Mã định danh thiết bị */
    char     mqtt_broker[64];        /* Địa chỉ MQTT broker */
    uint16_t mqtt_port;              /* Cổng MQTT (mặc định 1883) */
    char     mqtt_username[32];      /* Tên đăng nhập MQTT */
    char     mqtt_password[32];      /* Mật khẩu MQTT */
    uint16_t heartbeat_interval;     /* Chu kỳ gửi heartbeat (giây) */
    uint16_t tracking_interval;      /* Chu kỳ gửi telemetry (giây) */
    char     obd2_ble_address[18];   /* Địa chỉ MAC của OBD2 adapter */
    float    switch_off;             /* Ngưỡng chuyển sang pin backup: 12.0V (12V) hoặc 24.0V (24V) */
    float    switch_on;              /* Ngưỡng quay lại ắc quy: 12.2V (12V) hoặc 24.4V (24V) */
    float    ign_on_threshold;       /* Ngưỡng suy luận IGN ON: >=13.0V (12V) hoặc >=26.0V (24V) */
    float    ign_off_threshold;      /* Ngưỡng suy luận IGN OFF: <=12.0V (12V) hoặc <=24.0V (24V) */
} config_t;
```

##### b) Quản lý cấu hình

Cấu hình được quản lý theo ba cơ chế:

**Cấu hình mặc định (Default Configuration)**: Được định nghĩa trong mã nguồn firmware, áp dụng khi thiết bị khởi động lần đầu hoặc khi NVS bị xóa. Bao gồm các giá trị an toàn như `heartbeat_interval = 900` (15 phút), `tracking_interval = 10` (10 giây), và profile nguồn kép: profile 12V (`switch_off=12.0`, `switch_on=12.2`, `ign_on_threshold=13.0`, `ign_off_threshold=12.0`) hoặc profile 24V (`switch_off=24.0`, `switch_on=24.4`, `ign_on_threshold=26.0`, `ign_off_threshold=24.0`).

**Cấu hình lưu trữ (Persistent Configuration)**: Lưu trong NVS, được tải khi thiết bị khởi động. Các thay đổi cấu hình từ máy chủ được lưu vào NVS để giữ nguyên sau khi reset hoặc mất điện.

**Cập nhật cấu hình từ xa (Remote Configuration Update)**: Máy chủ gửi lệnh `update_config` qua MQTT topic `vehicle/{device_id}/commands`. Firmware phân tích lệnh, cập nhật các tham số tương ứng và lưu vào NVS. Thiết bị gửi xác nhận (ACK) về máy chủ sau khi cập nhật thành công.

##### c) Hiệu chuẩn cảm biến (Sensor Calibration)

Để đảm bảo độ chính xác của phép đo, firmware hỗ trợ hiệu chuẩn ba loại cảm biến:

| Cảm biến             | Phương pháp hiệu chuẩn                                | Lưu trữ |
| -------------------- | ----------------------------------------------------- | ------- |
| ADC (điện áp ắc quy) | So sánh với đồng hồ vạn năng, tính hệ số hiệu chỉnh   | NVS     |
| IMU (LIS3DH)         | Đặt thiết bị trên mặt phẳng, đo offset các trục X/Y/Z | NVS     |
| GNSS                 | Hiệu chỉnh offset vị trí (nếu cần)                    | NVS     |

Các giá trị hiệu chuẩn được lưu trữ trong NVS và được tải khi thiết bị khởi động, đảm bảo tính nhất quán của phép đo giữa các lần reset.

