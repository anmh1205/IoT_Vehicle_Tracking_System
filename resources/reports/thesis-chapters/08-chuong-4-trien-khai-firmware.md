### 4.2.3. Triển khai Firmware

Phần này trình bày quá trình triển khai firmware cho thiết bị theo dõi xe IoT, từ nền tảng phát triển đến cơ chế vận hành. Nội dung bao gồm môi trường phát triển, cấu trúc mã nguồn, các module chức năng chính và lưu đồ thuật toán điều khiển toàn hệ thống.

#### 4.2.3.1. Môi trường phát triển và công cụ

#### a) Framework và toolchain

Firmware được phát triển trên nền tảng ESP-IDF (Espressif IoT Development Framework) phiên bản 5.4, là bộ công cụ chính thức do Espressif cung cấp cho dòng vi điều khiển ESP32-S3. ESP-IDF cung cấp đầy đủ các thành phần cần thiết để phát triển ứng dụng nhúng, bao gồm hệ điều hành thời gian thực FreeRTOS, thư viện ngoại vi (peripheral drivers), BLE stack (NimBLE) và hệ thống build dựa trên CMake.

**Bảng 4.5: Công cụ phát triển firmware**

| Thành phần | Công cụ / Phiên bản | Mục đích |
|---|---|---|
| Framework | ESP-IDF v5.4 | SDK chính thức cho ESP32-S3 |
| IDE | VS Code + ESP-IDF Extension | Biên tập, debug, flash firmware |
| Build system | CMake + Ninja | Biên dịch và liên kết mã nguồn |
| BLE stack | NimBLE (tích hợp ESP-IDF) | Giao tiếp Bluetooth Low Energy |
| RTOS | FreeRTOS (tích hợp ESP-IDF) | Quản lý tác vụ đa luồng |
| Debug | JTAG / UART Monitor | Giám sát log và debug thời gian thực |
| Version control | Git | Quản lý phiên bản mã nguồn |

#### b) Quy trình build và nạp firmware

Quy trình biên dịch firmware sử dụng hệ thống CMake tích hợp trong ESP-IDF. Các bước chính bao gồm: cấu hình dự án thông qua `menuconfig`, biên dịch toàn bộ dự án, và nạp firmware xuống vi điều khiển qua giao tiếp UART.

```bash
# Cấu hình dự án (chọn target ESP32-S3)
idf.py set-target esp32s3

# Cấu hình tham số (BLE, UART, GPIO, ...)
idf.py menuconfig

# Biên dịch dự án
idf.py build

# Nạp firmware và giám sát log
idf.py -p COM3 flash monitor
```

#### c) Cấu hình NimBLE BLE stack

NimBLE được lựa chọn thay thế cho Bluedroid mặc định của ESP-IDF nhằm tối ưu hóa tài nguyên bộ nhớ. NimBLE tiêu thụ ít RAM hơn đáng kể (khoảng 50 KB so với 100 KB của Bluedroid) trong khi vẫn hỗ trợ đầy đủ các chức năng BLE Central cần thiết để giao tiếp với adapter OBD2.

Cấu hình NimBLE được thực hiện trong `sdkconfig` thông qua menuconfig:

```
CONFIG_BT_ENABLED=y
CONFIG_BT_NIMBLE_ENABLED=y
CONFIG_BT_NIMBLE_MAX_CONNECTIONS=1
CONFIG_BT_NIMBLE_ROLE_CENTRAL=y
CONFIG_BT_NIMBLE_ROLE_PERIPHERAL=n
```

---

#### 4.2.3.2. Cấu trúc mã nguồn firmware

#### a) Tổ chức thư mục

Cấu trúc mã nguồn firmware được tổ chức theo mô hình phân tầng (layered architecture), tách biệt rõ ràng giữa các tầng phần cứng, điều khiển và ứng dụng. Việc phân tầng này giúp tăng tính module hóa, dễ bảo trì và mở rộng.

```
firmware/
├── main/
│   ├── CMakeLists.txt
│   ├── app_main.c              # Điểm vào chính của ứng dụng
│   ├── Kconfig.projbuild       # Cấu hình menuconfig
│   │
│   ├── tasks/                  # Các FreeRTOS tasks
│   │   ├── ble_task.c          # Task giao tiếp BLE-OBD2
│   │   ├── mqtt_task.c         # Task gửi dữ liệu MQTT qua modem
│   │   ├── gps_task.c          # Task đọc vị trí GNSS
│   │   └── power_task.c        # Task quản lý nguồn điện
│   │
│   ├── include/                # Header files
│   │   ├── app_config.h        # Định nghĩa cấu hình toàn cục
│   │   ├── pin_defs.h          # Định nghĩa chân GPIO
│   │   └── data_types.h        # Cấu trúc dữ liệu dùng chung
│   │
│   └── state_machine/          # Máy trạng thái điều khiển
│       └── tracker_fsm.c       # State machine chính
│
├── components/                 # Thư viện tái sử dụng
│   ├── obd2_parser/            # Phân tích dữ liệu OBD2
│   │   ├── obd2_parser.c
│   │   ├── obd2_pids.c
│   │   └── include/obd2_parser.h
│   │
│   ├── modem_driver/           # Điều khiển modem SIMCom SIM7600CE-T (LTE + GNSS)
│   │   ├── modem_at.c          # Xử lý lệnh AT
│   │   ├── modem_mqtt.c        # MQTT qua modem
│   │   ├── modem_gnss.c        # GNSS qua modem
│   │   └── include/modem_driver.h
│   │
│   └── imu_driver/             # Điều khiển cảm biến LIS3DH
│       ├── lis3dh.c
│       └── include/lis3dh.h
│
├── sdkconfig                   # Cấu hình ESP-IDF
└── CMakeLists.txt              # CMake gốc
```

#### b) Kiến trúc phân tầng

Firmware được thiết kế theo bốn tầng chức năng, mỗi tầng đảm nhận một nhóm trách nhiệm cụ thể:

**Bảng 4.6: Kiến trúc phân tầng firmware**

| Tầng | Tên tầng | Thành phần | Chức năng |
|---|---|---|---|
| 1 | Hardware Abstraction | `imu_driver`, `modem_driver`, ADC, GPIO | Trừu tượng hóa giao tiếp phần cứng |
| 2 | Power Management | `power_task`, LVD, charger control | Quản lý nguồn, sleep, wakeup |
| 3 | Application Logic | `tracker_fsm`, state machine | Logic chuyển đổi chế độ lái/đỗ/cảnh báo |
| 4 | Communication | `ble_task`, `mqtt_task`, `gps_task` | Giao tiếp BLE, MQTT, GNSS |

Các tầng giao tiếp với nhau thông qua cơ chế message queue và semaphore của FreeRTOS, đảm bảo tính an toàn luồng (thread-safe) khi truy cập tài nguyên dùng chung.

#### c) Định nghĩa chân GPIO

**Bảng 4.7: Bảng ánh xạ chân GPIO**

| GPIO | Chức năng | Hướng | Mô tả |
|---|---|---|---|
| 2 | IGN_IN | Input | Đọc trạng thái khóa điện (hoặc qua OBD2) |
| 4 | U_BATT_ADC | Input | Đọc điện áp ắc quy (ADC 12-bit) |
| 5 | CHARGER_EN | Output | Điều khiển IC sạc IP2312 |
| 16 | MODEM_UART_TX | Output | UART TX đến module SIMCom SIM7600CE-T |
| 17 | MODEM_UART_RX | Input | UART RX từ module SIMCom SIM7600CE-T |
| 18 | POWER_MUX_SEL | Output | Chọn nguồn cấp (ắc quy/pin dự phòng) |
| 19 | LVD_STATUS | Input | Trạng thái từ comparator LM393 |
| 21 | LIS3DH_INT | Input | Ngắt từ cảm biến gia tốc IMU |
| 22 | LIS3DH_SDA | I/O | I2C data line |
| 23 | LIS3DH_SCL | I/O | I2C clock line |
| 25 | MODEM_PWRKEY | Output | Điều khiển nguồn modem |

---

#### 4.2.3.3. Triển khai module BLE-OBD2

#### a) Tổng quan giao tiếp BLE với adapter OBD2

Module BLE-OBD2 thiết lập kết nối Bluetooth Low Energy với adapter vgate iCar Pro tại cổng OBD2 để gửi yêu cầu đọc dữ liệu theo chuẩn OBD2 (Mode 0x01 - Current Data) và phân tích phản hồi, từ đó trích xuất các thông số vận hành động cơ.

Chu trình giao tiếp BLE-OBD2 gồm các giai đoạn: quét thiết bị (scan) — kết nối (connect) — khám phá dịch vụ GATT (service discovery) — gửi lệnh OBD2 (write characteristic) — nhận phản hồi (notification callback).

#### b) Khởi tạo NimBLE stack

Việc khởi tạo BLE stack được thực hiện trong hàm `ble_init_stack()`. NimBLE chạy trong một FreeRTOS task riêng biệt, xử lý toàn bộ các sự kiện BLE thông qua vòng lặp sự kiện (event loop).

```c
void ble_init_stack(ble_init_config_t const *config)
{
    // Khởi tạo cổng NimBLE
    esp_err_t ret = nimble_port_init();
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Khởi tạo NimBLE thất bại");
        return;
    }

    // Cấu hình callback cho host
    ble_hs_cfg.reset_cb        = config->reset_cb;
    ble_hs_cfg.sync_cb         = config->sync_cb;
    ble_hs_cfg.store_status_cb = ble_store_util_status_rr;
    ble_store_config_init();

    // Tạo task chạy NimBLE event loop
    xTaskCreate(ble_task, "NimBLE_task", 4096, NULL, 5, NULL);
}

static void ble_task(void *param)
{
    nimble_port_run();  // Blocking - chạy event loop BLE
}
```

#### c) Quy trình quét và kết nối thiết bị

Firmware thực hiện quét BLE để tìm adapter OBD2 dựa trên tên thiết bị (chứa chuỗi "iCar") hoặc UUID dịch vụ. Khi phát hiện thiết bị phù hợp, hệ thống sẽ kết nối và khám phá dịch vụ GATT để xác định characteristic dùng cho truyền/nhận dữ liệu.

```c
// Tham số quét BLE - chế độ thụ động (passive) để tiết kiệm năng lượng
static const struct ble_gap_disc_params disc_params = {
    .passive           = 1,
    .itvl              = 0x0010,   // Khoảng cách quét
    .window            = 0x0010,   // Cửa sổ quét
    .filter_duplicates = 1,        // Lọc quảng cáo trùng lặp
};

// Callback xử lý sự kiện GAP (scan, connect, disconnect)
static int ble_mgr_gap_event_cb(struct ble_gap_event *event, void *arg)
{
    switch (event->type) {
    case BLE_GAP_EVENT_DISC:
        // Phân tích dữ liệu quảng cáo
        ble_hs_adv_parse_fields(&adv_fields,
                                event->disc.data,
                                event->disc.length_data);
        // Kiểm tra UUID dịch vụ có trùng khớp không
        if (ble_mgr_adv_contains_service(&adv_fields,
                                          disc_cfg->svc_def->service_uuid)) {
            // Kết nối đến thiết bị
            ble_gap_connect(BLE_OWN_ADDR_PUBLIC,
                            &event->disc.addr,
                            30000,           // Timeout 30 giây
                            &conn_params,
                            ble_mgr_gap_event_cb, mgr_ctx);
        }
        break;

    case BLE_GAP_EVENT_CONNECT:
        if (event->connect.status == 0) {
            // Kết nối thành công - khám phá dịch vụ GATT
            ble_gattc_disc_all_svcs(conn_handle,
                                     ble_mgr_gatt_svc_discovered_cb,
                                     mgr_ctx);
        }
        break;
    }
    return 0;
}
```

Để tối ưu thời gian kết nối lại sau khi thức dậy từ deep sleep, firmware lưu địa chỉ MAC của adapter OBD2 vào bộ nhớ flash. Khi thức dậy, firmware ưu tiên kết nối trực tiếp đến địa chỉ đã lưu thay vì quét lại từ đầu, giảm thời gian reconnect xuống còn 1–3 giây so với 3–10 giây khi quét mới.

#### d) Gửi lệnh và phân tích phản hồi OBD2

Giao thức OBD2 sử dụng định dạng lệnh ELM327 truyền qua BLE GATT characteristic. Mỗi lệnh có dạng `"MMPP\r"`, trong đó `MM` là mode (01 cho dữ liệu hiện tại) và `PP` là PID (Parameter ID) cần đọc.

```c
// Gửi lệnh OBD2 và đợi phản hồi
int ble_obd_rxtx(ble_obd_ctx_t *obd, uint8_t mode, uint8_t pid,
                 uint32_t timeout_ms)
{
    // Định dạng lệnh: "MMPP\r"
    snprintf(obd->tx_data.buf, sizeof(obd->tx_data.buf),
             "%02X%02X\r", mode, pid);

    // Gửi qua GATT write characteristic
    ble_mgr_send(obd->mgr_ctx, obd_tx_char->handle,
                 obd->tx_data.buf, strlen(obd->tx_data.buf));

    // Đợi phản hồi (semaphore với timeout)
    if (xSemaphoreTake(obd->api.response_sem,
                       pdMS_TO_TICKS(timeout_ms)) != pdTRUE) {
        return -1;  // Hết thời gian chờ
    }
    return 0;
}
```

Phản hồi OBD2 được xử lý trong notification callback. Dữ liệu trả về có dạng `"41 0C 1F 40\r"`, trong đó byte đầu là mode + 0x40 (chỉ thị phản hồi), byte thứ hai là PID, và các byte còn lại là dữ liệu cần giải mã.

```c
// Phân tích phản hồi OBD2
static void ble_obd_process_obd_data(ble_obd_ctx_t *obd,
                                      char *data, size_t len)
{
    char *saveptr;
    char *tok = strtok_r(data, " \r", &saveptr);
    uint8_t values[BLE_OBD_MAX_DATA_LEN];
    int count = 0;

    while (tok && count < BLE_OBD_MAX_DATA_LEN) {
        long val = strtol(tok, NULL, 16);  // Chuyển hex sang số nguyên
        values[count++] = (uint8_t)val;
        tok = strtok_r(NULL, " \r", &saveptr);
    }

    // Xác thực phản hồi: kiểm tra mode và PID trùng khớp
    if (values[0] == (obd->tx_data.mode + 0x40) &&
        values[1] == obd->tx_data.pid) {
        // Gọi callback với dữ liệu đã trích xuất
        obd->response_cb(obd->tx_data.pid,
                         values + 2,      // Bỏ qua mode và PID
                         count - 2,       // Độ dài dữ liệu thực
                         obd->usr_ctx);
    }
}
```

#### e) Bảng PID OBD2 sử dụng trong hệ thống

**Bảng 4.8: Các PID OBD2 được đọc định kỳ (Mode 0x01 - Current Data)**

| PID (Hex) | Thông số | Độ dài | Công thức tính | Đơn vị |
|---|---|---|---|---|
| 0x0C | Tốc độ động cơ (RPM) | 2 byte | (A x 256 + B) / 4 | vòng/phút |
| 0x0D | Tốc độ xe | 1 byte | A | km/h |
| 0x04 | Tải động cơ | 1 byte | (A x 100) / 255 | % |
| 0x05 | Nhiệt độ nước làm mát | 1 byte | A - 40 | độ C |
| 0x2F | Mức nhiên liệu | 1 byte | (A x 100) / 255 | % |
| 0x0F | Nhiệt độ khí nạp | 1 byte | A - 40 | độ C |
| 0x11 | Vị trí bướm ga | 1 byte | (A x 100) / 255 | % |
| 0x42 | Điện áp module điều khiển | 2 byte | (A x 256 + B) / 1000 | V |

Các hàm chuyển đổi tương ứng được định nghĩa trong component `obd2_parser`:

```c
// Chuyển đổi RPM: (A * 256 + B) / 4
static int obd_conv_rpm(int32_t *value, uint8_t const *data, size_t len)
{
    *value = ((data[0] << 8) | data[1]) / 4;
    return 0;
}

// Chuyển đổi phần trăm: (A * 100) / 255
static int obd_conv_percent(int32_t *value, uint8_t const *data, size_t len)
{
    *value = (data[0] * 100) / 255;
    return 0;
}

// Chuyển đổi nhiệt độ: A - 40
static int obd_conv_temperature(int32_t *value, uint8_t const *data, size_t len)
{
    *value = data[0] - 40;
    return 0;
}
```

#### f) Xử lý lỗi và fallback

Khi không thể kết nối BLE với adapter OBD2 (timeout sau 10 giây, retry 2–3 lần), firmware chuyển sang chế độ fallback và dùng điện áp ắc quy đo qua ADC để ước lượng trạng thái khóa điện. Tiêu chí theo profile cấu hình: profile 12V dùng IGN_ON>=13.0V và IGN_OFF<=12.0V; profile 24V dùng IGN_ON>=26.0V và IGN_OFF<=24.0V. Cách này kém chính xác hơn OBD2 nhưng vẫn bảo đảm hệ thống tiếp tục hoạt động khi mất kết nối BLE.

---

#### 4.2.3.4. Triển khai module modem MQTT

#### a) Khởi tạo và kiểm tra modem

Module modem quản lý toàn bộ giao tiếp với SIMCom SIM7600CE-T (LTE + GNSS tích hợp) thông qua UART1 và tập lệnh AT. Quy trình khởi tạo bao gồm kiểm tra phản hồi, CEREG trước CGACT, APN `internet`, và tế nhị kiểm tra trạng thái GNSS bằng `AT+CGNSPWR`/`AT+CGNSTST` để đảm bảo fix trước khi publish.

```c
// Trình tự khởi tạo SIMCom SIM7600CE-T
int modem_init(modem_ctx_t *ctx)
{
    // Bước 1: Kiểm tra module phản hồi
    if (modem_send_at(ctx, "AT", "OK", 5000) != 0) {
        // Modem không phản hồi - reset bằng GPIO PWRKEY
        gpio_set_level(MODEM_PWRKEY, 0);
        vTaskDelay(pdMS_TO_TICKS(1500));
        gpio_set_level(MODEM_PWRKEY, 1);
        vTaskDelay(pdMS_TO_TICKS(10000));  // Đợi khởi động lại
        if (modem_send_at(ctx, "AT", "OK", 5000) != 0) {
            return -1;  // Khởi tạo thất bại
        }
    }

    // Bước 2: Kiểm tra SIM card
    if (modem_send_at(ctx, "AT+CPIN?", "+CPIN: READY", 5000) != 0) {
        return -2;  // SIM chưa sẵn sàng
    }

    // Bước 3: Đợi đăng ký mạng (tối đa 60 giây)
    for (int i = 0; i < 12; i++) {
        if (modem_send_at(ctx, "AT+CEREG?", "+CEREG: 0,1", 5000) == 0) {
            break;  // Đã đăng ký mạng
        }
        vTaskDelay(pdMS_TO_TICKS(5000));
    }

    // Bước 4: Kiểm tra chất lượng tín hiệu
    modem_send_at(ctx, "AT+CSQ", "+CSQ:", 3000);

    // Bước 5: Thiết lập APN và kích hoạt PDP context
    modem_send_at(ctx, "AT+CGDCONT=1,\"IP\",\"internet\"", "OK", 5000);
    modem_send_at(ctx, "AT+CGACT=1,1", "OK", 10000);

    return 0;  // Khởi tạo thành công
}
```

#### b) Kết nối và gửi dữ liệu MQTT

Firmware sử dụng AT command trên SIMCom SIM7600CE-T để thiết lập kết nối dữ liệu và gửi telemetry MQTT về broker. Quy trình bao gồm khởi tạo mạng (CEREG kiểm tra trước CGACT), kết nối broker, đăng ký topic, và gửi dữ liệu telemetry định kỳ.

```c
// Kết nối MQTT thông qua modem
int modem_mqtt_connect(modem_ctx_t *ctx, const char *broker_url,
                        const char *client_id)
{
    // Khởi động dịch vụ MQTT
    modem_send_at(ctx, "AT+CMQTTSTART", "OK", 5000);

    // Tạo client với client_id
    char cmd[128];
    snprintf(cmd, sizeof(cmd),
             "AT+CMQTTACCQ=0,\"%s\"", client_id);
    modem_send_at(ctx, cmd, "OK", 5000);

    // Kết nối đến broker
    snprintf(cmd, sizeof(cmd),
             "AT+CMQTTCONNECT=0,\"%s\",60,1", broker_url);
    modem_send_at(ctx, cmd, "+CMQTTCONNECT: 0,0", 15000);

    // Đăng ký topic nhận lệnh từ server
    snprintf(cmd, sizeof(cmd),
             "AT+CMQTTSUB=0,\"vehicle/%s/commands\",1",
             ctx->device_id);
    modem_send_at(ctx, cmd, "+CMQTTSUB: 0,0", 5000);

    return 0;
}

// Gửi dữ liệu telemetry lên broker MQTT
int modem_mqtt_publish(modem_ctx_t *ctx, const char *topic,
                        const char *payload, int payload_len)
{
    char cmd[128];

    // Thiết lập topic
    snprintf(cmd, sizeof(cmd),
             "AT+CMQTTTOPIC=0,%d", (int)strlen(topic));
    modem_send_at(ctx, cmd, ">", 3000);
    modem_send_raw(ctx, topic, strlen(topic));

    // Thiết lập payload
    snprintf(cmd, sizeof(cmd),
             "AT+CMQTTPAYLOAD=0,%d", payload_len);
    modem_send_at(ctx, cmd, ">", 3000);
    modem_send_raw(ctx, payload, payload_len);

    // Gửi (QoS 1)
    modem_send_at(ctx, "AT+CMQTTPUB=0,1,60", "+CMQTTPUB: 0,0", 10000);

    return 0;
}
```

**Cấu trúc topic MQTT:**

| Topic | Hướng | Mục đích |
|---|---|---|
| `vehicle/{device_id}/telemetry` | Device -> Server | Dữ liệu vị trí, OBD2, nguồn điện |
| `vehicle/{device_id}/alerts` | Device -> Server | Cảnh báo chuyển động, quá tốc độ |
| `vehicle/{device_id}/status` | Device -> Server | Heartbeat và trạng thái thiết bị |
| `vehicle/{device_id}/commands` | Server -> Device | Lệnh điều khiển từ xa |

#### c) Đọc dữ liệu GNSS

SIMCom SIM7600CE-T cung cấp GNSS tích hợp. Firmware bật GNSS qua `AT+CGNSPWR=1`, đọc fix bằng `AT+CGNSINF`, và chỉ dùng `AT+CGNSTST=1` khi cần stream NMEA.
```c
// Bật và đọc dữ liệu GNSS từ modem
int modem_gnss_read(modem_ctx_t *ctx, gnss_data_t *gnss)
{
    // Bật nguồn GNSS (nếu chưa bật)
    modem_send_at(ctx, "AT+CGNSPWR=1", "OK", 3000);

    // Đọc thông tin GNSS
    // Phản hồi: +CGNSINF: <GNSS run>,<fix>,<UTC>,<lat>,<lon>,...
    //           <lat>,<N/S>,<lon>,<E/W>,<date>,<time>,<alt>,
    //           <speed>,<course>,<hdop>,<vdop>
    char response[256];
    if (modem_send_at_get_response(ctx, "AT+CGNSINF",
                                    response, sizeof(response),
                                    3000) == 0) {
        // Phân tích phản hồi
        gnss_parse_cgnsinf(response, gnss);
        return 0;
    }
    return -1;  // Chưa có fix
}

// Cấu trúc dữ liệu GNSS
typedef struct {
    double   latitude;      // Vĩ độ (độ thập phân)
    double   longitude;     // Kinh độ (độ thập phân)
    float    altitude;      // Độ cao (mét)
    float    speed;         // Tốc độ (km/h)
    float    course;        // Hướng đi (độ)
    uint8_t  satellites;    // Số vệ tinh
    bool     fix_valid;     // Trạng thái fix hợp lệ
} gnss_data_t;
```

Thời gian fix GNSS phụ thuộc vào trạng thái trước đó của modem: hot start (5–10 giây nếu modem chỉ ở chế độ sleep), warm start (20–30 giây nếu đã có dữ liệu almanac), và cold start (30–60 giây nếu reset hoàn toàn).

#### d) Xử lý lệnh điều khiển từ xa

Firmware lắng nghe lệnh từ server thông qua topic `vehicle/{device_id}/commands`. Khi nhận được sự kiện `+CMQTTRXSTART` trên UART, firmware đọc nội dung lệnh và thực hiện hành động tương ứng.

```c
// Xử lý lệnh từ server
void process_server_command(const char *payload)
{
    // Phân tích JSON payload
    cJSON *root = cJSON_Parse(payload);
    const char *command = cJSON_GetStringValue(
                              cJSON_GetObjectItem(root, "command"));

    if (strcmp(command, "update_config") == 0) {
        cJSON *params = cJSON_GetObjectItem(root, "params");
        // Cập nhật cấu hình (heartbeat interval, tracking interval)
        int heartbeat = cJSON_GetNumberValue(
                            cJSON_GetObjectItem(params, "heartbeat_interval"));
        int tracking  = cJSON_GetNumberValue(
                            cJSON_GetObjectItem(params, "tracking_interval"));
        update_device_config(heartbeat, tracking);

    } else if (strcmp(command, "request_location") == 0) {
        // Đọc và gửi vị trí ngay lập tức
        send_immediate_location();

    } else if (strcmp(command, "enable_tracking") == 0) {
        int duration = cJSON_GetNumberValue(
                           cJSON_GetObjectItem(
                               cJSON_GetObjectItem(root, "params"),
                               "duration"));
        enable_continuous_tracking(duration);
    }

    cJSON_Delete(root);
}
```

---

#### 4.2.3.5. Triển khai quản lý nguồn và chế độ ngủ

#### a) Đọc điện áp và điều khiển nguồn

Module quản lý nguồn thực hiện đọc điện áp ắc quy qua ADC, điều khiển chọn nguồn cấp (ắc quy hoặc pin dự phòng) qua MOSFET Power MUX, và điều khiển IC sạc IP2312.

```c
// Đọc điện áp ắc quy qua ADC (12-bit, chia áp)
float read_battery_voltage(void)
{
    int adc_raw = adc1_get_raw(ADC1_CHANNEL_4);  // GPIO4
    float voltage = (adc_raw / 4095.0f) * 3.3f;  // Chuyển sang volt
    voltage *= VOLTAGE_DIVIDER_RATIO;              // Bù tỷ lệ chia áp
    return voltage;
}

// Logic quản lý nguồn chính
void power_management_task(void *param)
{
    while (true) {
        float u_batt = read_battery_voltage();
        bool ign_on  = get_ignition_status();
        bool lvd_ok  = gpio_get_level(LVD_STATUS);
        float switch_off = cfg.power_profile_24v ? 24.0f : 12.0f;
        float switch_on  = cfg.power_profile_24v ? 24.4f : 12.2f;

        if (ign_on) {
            // IGN ON: dùng nguồn ắc quy, bật sạc pin dự phòng
            gpio_set_level(POWER_MUX_SEL, 0);   // Chọn ắc quy
            gpio_set_level(CHARGER_EN, 1);       // Bật sạc
        } else if (u_batt <= switch_off) {
            // Điện áp thấp: chuyển sang pin dự phòng theo profile
            gpio_set_level(POWER_MUX_SEL, 1);   // Chọn pin dự phòng
            gpio_set_level(CHARGER_EN, 0);       // Tắt sạc
            send_low_battery_alert(u_batt);
        } else if (u_batt >= switch_on) {
            // Điện áp phục hồi: quay lại ắc quy theo profile
            gpio_set_level(POWER_MUX_SEL, 0);   // Chọn ắc quy
            gpio_set_level(CHARGER_EN, 0);       // Tắt sạc (IGN OFF)
        }
        // Giữ nguyên trạng thái nếu trong vùng trễ của profile (12V: 12.0-12.2V; 24V: 24.0-24.4V)

        vTaskDelay(pdMS_TO_TICKS(5000));  // Kiểm tra mỗi 5 giây
    }
}
```

Ngưỡng điện áp sử dụng cơ chế trễ (hysteresis) theo profile cấu hình để tránh hiện tượng chuyển đổi liên tục khi điện áp dao động quanh ngưỡng: profile 12V dùng 12.0V (OFF) và 12.2V (ON), profile 24V dùng 24.0V (OFF) và 24.4V (ON). Ngưỡng suy luận trạng thái động cơ cũng được tách profile: IGN_ON >= 13.0V và IGN_OFF <= 12.0V (12V), hoặc IGN_ON >= 26.0V và IGN_OFF <= 24.0V (24V).

#### b) Chế độ ngủ và đánh thức

Firmware sử dụng hai chế độ ngủ của ESP32-S3 tùy theo tình huống:

**Bảng 4.9: So sánh các chế độ ngủ**

| Chế độ | Dòng tiêu thụ | Thời gian thức dậy | BLE | Điều kiện sử dụng |
|---|---|---|---|---|
| Light sleep | ~0.8 mA | < 1 ms | Giữ active | IGN ON, đợi dữ liệu giữa các chu kỳ |
| Deep sleep | ~10 µA | ~100 ms | Mất kết nối | IGN OFF, chế độ đỗ xe |

Trước khi vào deep sleep, firmware thực hiện trình tự tắt các ngoại vi để tiết kiệm năng lượng tối đa:

```c
// Trình tự trước khi vào deep sleep
void enter_deep_sleep(uint32_t sleep_duration_sec)
{
    // 1. Ngắt kết nối BLE (nếu đang kết nối)
    ble_obd_disconnect();

    // 2. Tắt GNSS
    modem_send_at(&modem_ctx, "AT+CGNSPWR=0", "OK", 3000);

    // 3. Tắt 4G và đưa modem vào chế độ ngủ
    modem_send_at(&modem_ctx, "AT+CGACT=0,1", "OK", 5000);
    modem_send_at(&modem_ctx, "AT+CSCLK=1", "OK", 3000);

    // 4. Tắt sạc pin
    gpio_set_level(CHARGER_EN, 0);

    // 5. Lưu trạng thái hiện tại vào RTC memory
    rtc_data.last_mode       = current_mode;
    rtc_data.last_ign_status = ign_on;
    rtc_data.sleep_count++;

    // 6. Cấu hình nguồn đánh thức
    //    - Timer: heartbeat định kỳ
    esp_sleep_enable_timer_wakeup(sleep_duration_sec * 1000000ULL);
    //    - IMU interrupt: phát hiện chuyển động
    esp_sleep_enable_ext0_wakeup(LIS3DH_INT, 1);

    // 7. Vào deep sleep
    esp_deep_sleep_start();
}
```

Khi thức dậy từ deep sleep, firmware đọc nguyên nhân đánh thức và trạng thái đã lưu trong RTC memory để quyết định chế độ hoạt động tiếp theo mà không cần khởi tạo lại toàn bộ.

#### c) Quản lý nguồn modem theo chế độ

SIMCom SIM7600CE-T hỗ trợ nhiều chế độ ngủ với mức tiêu thụ khác nhau:

- **UART sleep** (`AT+CSCLK=1`): Module tự động ngủ khi không có dữ liệu UART, tiêu thụ 1–5 mA, GNSS vẫn có thể được bật theo policy.
- **Minimum functionality** (`AT+CFUN=0`): Tắt RF và GNSS, tiêu thụ < 1 mA, đánh thức bằng lệnh AT hoặc GPIO.
- **Flight mode** (`AT+CFUN=4`): Tắt RF nhưng giữ chức năng khác, phù hợp cho heartbeat ngắn.

Thời gian đánh thức modem phụ thuộc chế độ: từ sleep là 100–500 ms, từ minimum functionality là 1–3 giây, và kết nối lại 4G mất thêm 5–15 giây.

---

#### 4.2.3.6. Lưu đồ thuật toán chính

#### a) Máy trạng thái (State Machine)

Toàn bộ logic điều khiển firmware được tổ chức theo mô hình máy trạng thái (Finite State Machine - FSM), gồm bảy trạng thái chính:

**Bảng 4.10: Các trạng thái của firmware**

| Trạng thái | Mã | Mô tả |
|---|---|---|
| INIT | `STATE_INIT` | Khởi tạo hệ thống, ngoại vi |
| CHECK_IGN | `STATE_CHECK_IGN` | Kiểm tra trạng thái khóa điện |
| DRIVING | `STATE_DRIVING` | Chế độ lái xe - theo dõi liên tục |
| PARKED | `STATE_PARKED` | Chế độ đỗ xe - heartbeat định kỳ |
| ALARM | `STATE_ALARM` | Chế độ cảnh báo - phát hiện chuyển động |
| HEARTBEAT | `STATE_HEARTBEAT` | Gửi tín hiệu heartbeat |
| SLEEP | `STATE_SLEEP` | Deep sleep tiết kiệm năng lượng |

**Bảng 4.11: Chuyển đổi trạng thái**

| Trạng thái hiện tại | Điều kiện | Trạng thái mới |
|---|---|---|
| INIT | Khởi tạo xong | CHECK_IGN |
| CHECK_IGN | IGN = ON | DRIVING |
| CHECK_IGN | IGN = OFF | PARKED |
| DRIVING | IGN = OFF (phát hiện) | PARKED |
| PARKED | IMU interrupt (chuyển động) | ALARM |
| PARKED | Timer wake-up | HEARTBEAT |
| ALARM | Chuyển động dừng, IGN = OFF | PARKED |
| HEARTBEAT | Gửi xong heartbeat | SLEEP |
| SLEEP | Timer hoặc IMU wake-up | CHECK_IGN |

```c
// Máy trạng thái chính
typedef enum {
    STATE_INIT,
    STATE_CHECK_IGN,
    STATE_DRIVING,
    STATE_PARKED,
    STATE_ALARM,
    STATE_HEARTBEAT,
    STATE_SLEEP
} tracker_state_t;

void tracker_fsm_run(void)
{
    tracker_state_t state = STATE_INIT;

    while (true) {
        switch (state) {
        case STATE_INIT:
            init_peripherals();     // IMU, modem, ADC, BLE
            state = STATE_CHECK_IGN;
            break;

        case STATE_CHECK_IGN:
            if (check_ignition_via_obd2() || check_ignition_via_voltage()) {
                state = STATE_DRIVING;
            } else {
                state = STATE_PARKED;
            }
            break;

        case STATE_DRIVING:
            connect_ble_obd2();
            enable_gnss();
            while (get_ignition_status()) {
                read_obd2_data();       // RPM, tốc độ, nhiên liệu
                read_gnss_position();   // Vị trí, tốc độ GPS
                read_imu_data();        // Gia tốc, rung
                publish_telemetry();    // Gửi MQTT
                vTaskDelay(pdMS_TO_TICKS(TRACKING_INTERVAL_MS));
            }
            state = STATE_PARKED;       // IGN OFF được phát hiện
            break;

        case STATE_PARKED:
            disconnect_ble_obd2();
            state = STATE_HEARTBEAT;    // Gửi heartbeat trước khi ngủ
            break;

        case STATE_ALARM:
            enable_gnss();
            send_motion_alert();
            // Theo dõi liên tục cho đến khi hết chuyển động
            while (is_motion_detected()) {
                read_gnss_position();
                publish_telemetry();
                vTaskDelay(pdMS_TO_TICKS(ALARM_INTERVAL_MS));
            }
            state = STATE_PARKED;
            break;

        case STATE_HEARTBEAT:
            wakeup_modem();
            enable_gnss();
            wait_for_gnss_fix(60000);    // Đợi fix tối đa 60 giây
            send_heartbeat();
            state = STATE_SLEEP;
            break;

        case STATE_SLEEP:
            enter_deep_sleep(HEARTBEAT_INTERVAL_SEC);
            // Sau khi thức dậy, chương trình bắt đầu lại từ STATE_INIT
            // nhưng đọc trạng thái từ RTC memory
            state = STATE_CHECK_IGN;
            break;
        }
    }
}
```

#### b) Lưu đồ thuật toán tổng thể

```
                    +-----------+
                    |   START   |
                    +-----+-----+
                          |
                          v
                  +-------+--------+
                  | Khởi tạo:      |
                  | IMU, Modem,    |
                  | ADC, BLE, GPIO |
                  +-------+--------+
                          |
                          v
              +-----------+-----------+
              | Đọc trạng thái IGN    |
              | (OBD2 BLE hoặc ADC)  |
              +-----------+-----------+
                          |
               +----------+----------+
               |                     |
           IGN = ON              IGN = OFF
               |                     |
               v                     v
     +---------+---------+   +-------+--------+
     | Chế độ LÁI XE     |   | Chế độ ĐỖ XE   |
     | - Kết nối BLE     |   | - Ngắt BLE     |
     | - Bật GNSS        |   | - Gửi heartbeat|
     | - Đọc OBD2        |   | - Deep sleep   |
     | - Đọc GPS, IMU    |   +-------+--------+
     | - Gửi MQTT        |           |
     +---------+---------+   +-------+--------+
               |             | IMU interrupt?  |
           IGN OFF?          +---+--------+----+
               |                 |        |
               v               YES       NO
     +---------+---------+      |         |
     | Chuyển sang ĐỖ XE |      v         v
     +-------------------+ +----+----+ +--+-------+
                           | ALARM   | | Timer    |
                           | Cảnh báo| | wake-up? |
                           | GPS+MQTT| +--+-------+
                           +----+----+    |
                                |        YES
                            Hết động      |
                                |         v
                                v    +----+------+
                           +----+---+| HEARTBEAT |
                           | PARKED || Gửi status|
                           +--------++----+------+
                                          |
                                          v
                                    +-----+-----+
                                    | DEEP SLEEP|
                                    +-----------+
```

*Hình 4.X: Lưu đồ thuật toán chính của firmware thiết bị theo dõi xe*

#### c) Định dạng dữ liệu telemetry

Mỗi gói dữ liệu telemetry gửi lên server có cấu trúc JSON bao gồm bốn nhóm thông tin chính: vị trí (location), dữ liệu OBD2 (obd2), trạng thái nguồn (power), và trạng thái thiết bị (status).

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

Dữ liệu được gửi định kỳ mỗi 10–30 giây trong chế độ lái xe và mỗi 15 phút trong chế độ heartbeat (đỗ xe). Tần suất gửi có thể được điều chỉnh từ xa thông qua lệnh `update_config` từ server.

---

