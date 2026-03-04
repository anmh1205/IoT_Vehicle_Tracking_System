## PHẦN V: THIẾT KẾ PHẦN MỀM (FIRMWARE) - MODULE LTE A7670C VÀ GNSS NEO-M8N

### V.5 Quản Lý Module LTE SIMCom A7670C

Module A7670C là module LTE Cat-1 thuần túy — **không tích hợp GNSS**. Toàn bộ dữ liệu vị trí đến từ module NEO-M8N riêng biệt qua UART2 (xem V.6). Module A7670C chỉ chịu trách nhiệm kết nối mạng và truyền dữ liệu.

#### V.5.1 Khởi Tạo và Kiểm Tra Modem

**Khởi Tạo:**

1. **Kiểm tra modem có phản hồi:**

   ```
   AT
   → OK
   ```

2. **Kiểm tra SIM card:**

   ```
   AT+CPIN?
   → +CPIN: READY
   ```

3. **Kiểm tra đăng ký mạng LTE:**

   ```
   AT+CEREG?
   → +CEREG: 0,1  (đã đăng ký mạng LTE)
   AT+CREG?
   → +CREG: 0,1   (đăng ký mạng GSM/fallback)
   ```

4. **Kiểm tra chất lượng tín hiệu:**

   ```
   AT+CSQ
   → +CSQ: 20,99  (RSSI = 20, BER = 99)
   ```

5. **Kiểm tra nhà mạng:**

   ```
   AT+COPS?
   → +COPS: 0,0,"Viettel",7  (đang kết nối Viettel LTE)
   ```

**Xử Lý Lỗi:**

- Nếu không phản hồi → Reset modem (PWRKEY pulse, GPIO cụ thể chốt ở giai đoạn pin-map implementation)
- Nếu SIM chưa sẵn sàng → Đợi và retry (tối đa 30 giây)
- Nếu chưa đăng ký mạng → Đợi và retry (có thể mất 10–30 giây với LTE)

**Lưu Ý Quan Trọng — A7670C Không Có GNSS:**

Các lệnh AT sau **KHÔNG TỒN TẠI** trên A7670C và sẽ trả về `ERROR`:

```
AT+CGNSPWR   → ERROR  (chỉ có trên một số modem GNSS tích hợp như A7600CE-T, A7670SA)
AT+CGNSINF   → ERROR  (chỉ có trên một số modem GNSS tích hợp như A7600CE-T, A7670SA)
AT+CGPSINFO  → ERROR  (chỉ có trên A7670G/SA)
```

Toàn bộ chức năng GNSS được thực hiện bởi module NEO-M8N qua UART2 (mục V.6).

#### V.5.2 Điều Khiển 4G/LTE

**Bật 4G:**

1. **Thiết lập APN:**

   ```
   AT+CGDCONT=1,"IP","<APN>"
   → OK
   ```

   APN theo nhà mạng tại Việt Nam:
   - Viettel: `v-internet`
   - MobiFone: `m-wap`
   - Vinaphone: `internet`

2. **Kích hoạt PDP context:**

   ```
   AT+CGACT=1,1
   → OK
   ```

3. **Kiểm tra kết nối:**

   ```
   AT+CGACT?
   → +CGACT: 1,1  (đã kích hoạt)
   ```

**Tắt 4G (Khi Đỗ Xe):**

1. **Đóng PDP context:**

   ```
   AT+CGACT=0,1
   → OK
   ```

2. **Hoặc đưa vào chế độ Flight Mode:**

   ```
   AT+CFUN=4
   → OK
   ```

**Lưu Ý:**

- **Khi IGN ON**: Giữ 4G active để gửi dữ liệu liên tục
- **Khi IGN OFF**: Tắt 4G hoặc đưa vào PSM → tiết kiệm năng lượng
- **Khi Heartbeat**: Bật 4G → gửi heartbeat → đưa modem vào sleep → ESP32 deep sleep

#### V.5.3 Quản Lý Sleep Mode cho A7670C

**Các Chế Độ Sleep:**

| Chế độ | Lệnh AT | Tiêu thụ | Wake-up |
|--------|---------|----------|---------|
| Sleep (UART wake) | `AT+CSCLK=1` | ~1.5 mA | UART activity, RI pin |
| Deep sleep (DTR wake) | `AT+CSCLK=2` | ~1.5 mA | DTR pin toggle |
| PSM (Power Saving Mode) | `AT+CPSMS=1,...` | ~5 µA | Network TAU timer, PWRKEY |
| eDRX | `AT+CEDRXS=1,...` | < sleep | Network paging |
| Airplane mode | `AT+CFUN=4` | RF off | AT command |
| Power off | `AT+CPOF` | ~0 | PWRKEY |

**Khi ESP32 Deep Sleep:**

Trước khi ESP32 deep sleep:

1. Đưa modem vào sleep:

   ```
   AT+CSCLK=1
   → OK
   ```

2. Hoặc PSM khi đỗ xe lâu dài:

   ```
   AT+CPSMS=1,"","","01100001","00000001"
   → OK
   ```

3. ESP32 vào deep sleep

**Khi ESP32 Wake Up:**

1. Đánh thức modem (UART wake):

   ```
   AT
   → OK
   ```

2. Khôi phục kết nối 4G (nếu cần):

   ```
   AT+CFUN=1
   AT+CGACT=1,1
   ```

**Thời Gian:**

- **Wake up từ sleep (CSCLK=1)**: ~100–500 ms
- **Wake up từ PSM**: ~1–3 giây + đăng ký mạng lại
- **Kết nối 4G lại**: ~5–15 giây

#### V.5.4 Kết Nối MQTT

**Khởi Tạo MQTT:**

```
AT+CMQTTSTART
→ OK

AT+CMQTTACCQ=0,"TRACKER_001"
→ OK

AT+CMQTTCONNECT=0,"<broker>:<port>",60,1
→ +CMQTTCONNECT: 0,0  (kết nối thành công)
```

**Subscribe Command Topic:**

```
AT+CMQTTSUB=0,"vehicle/TRACKER_001/commands",1
→ +CMQTTSUB: 0,0
```

**Publish Telemetry:**

```
AT+CMQTTPUB=0,"vehicle/TRACKER_001/telemetry",1,<len>
> <JSON payload>
→ +CMQTTPUB: 0,0
```

**Ngắt Kết Nối:**

```
AT+CMQTTDISC=0,120
AT+CMQTTREL=0
AT+CMQTTSTOP
```

#### V.5.5 Cấu Hình SSL/TLS

```
AT+CSSLCFG="sslversion",0,3     → TLS 1.2
AT+CSSLCFG="cacert",0,"<file>"  → CA certificate
AT+CSSLCFG="clientcert",0,"<file>"
AT+CSSLCFG="clientkey",0,"<file>"
```

Lưu certificate vào flash modem:

```
AT+CFSINIT
AT+CFSWFILE=3,"ca.crt",0,<size>,10000
> <certificate data>
→ OK
```

#### V.5.6 Chiến Lược Điều Khiển Modem Theo Chế Độ

**Chế Độ 1: Lái Xe (IGN ON)**

Module A7670C và NEO-M8N hoạt động **độc lập**:

1. **A7670C** (UART1):
   - `AT+CFUN=1` → full functionality
   - `AT+CGACT=1,1` → activate PDP
   - Giữ MQTT active, gửi telemetry định kỳ
2. **NEO-M8N** (UART2):
   - Đã hoạt động liên tục từ khi khởi động
   - `gnss_task` đọc NMEA stream → cập nhật `gnss_data_t`
3. **Publish**: `mqtt_task` đọc `gnss_data_t` (mutex) + OBD2 data → publish MQTT mỗi 5–30 giây

**Chế Độ 2: Đỗ Xe (IGN OFF)**

1. **A7670C**:
   - Đóng MQTT: `AT+CMQTTDISC=0,120`
   - Đưa vào sleep: `AT+CSCLK=1` hoặc PSM
2. **NEO-M8N**:
   - Tắt nguồn qua tín hiệu EN của rail GNSS để tiết kiệm 11–67 mA
   - Giữ VBAT để bảo toàn almanac/ephemeris (hot start khi bật lại)
3. **Khi heartbeat wake up**:
   - Bật NEO-M8N (assert tín hiệu EN) → đợi fix (1 giây hot start)
   - Wake up A7670C → kết nối 4G → gửi heartbeat
   - Tắt NEO-M8N → đưa A7670C vào sleep → ESP32 deep sleep

**Chế Độ 3: Cảnh Báo (Motion Detected)**

1. **A7670C**: Wake up từ sleep, bật 4G, kết nối MQTT ngay
2. **NEO-M8N**: Bật nguồn (assert tín hiệu EN), đợi fix (~1 giây hot start)
3. Gửi cảnh báo ưu tiên cao
4. Track liên tục, giữ cả hai module active

#### V.5.7 Xử Lý Lỗi Modem A7670C

**Modem Không Phản Hồi:**

1. Timeout sau 5 giây khi gửi lệnh AT
2. Reset modem: PWRKEY pulse 1–2 giây (GPIO cụ thể sẽ chốt sau)
3. Đợi khởi động lại (~10–30 giây)
4. Retry khởi tạo

**Mất Kết Nối 4G:**

1. Phát hiện: Không publish được MQTT
2. Kiểm tra:

   ```
   AT+CEREG?
   AT+CGACT?
   ```

3. Reconnect:

   ```
   AT+CGACT=0,1
   AT+CGACT=1,1
   ```

**Modem Quá Nhiệt:**

1. Phát hiện: Không phản hồi, nhiệt độ cao
2. Đưa vào airplane mode: `AT+CFUN=4`
3. Đợi nguội → restore: `AT+CFUN=1`

---

### V.6 Quản Lý Module GNSS u-blox NEO-M8N

Module NEO-M8N là module GNSS chuyên dụng, kết nối trực tiếp với ESP32-S3 qua **UART GNSS riêng** (mapping chân cụ thể sẽ chốt ở giai đoạn pin-map implementation). Module xuất chuỗi **NMEA sentences** liên tục, firmware đọc và parse để lấy dữ liệu vị trí.

#### V.6.1 Cấu Hình UART2 cho NEO-M8N

**Cấu hình ESP-IDF:**

```c
uart_config_t uart_cfg = {
    .baud_rate  = 115200,    // Đổi từ default 9600 lên 115200 bps
    .data_bits  = UART_DATA_8_BITS,
    .parity     = UART_PARITY_DISABLE,
    .stop_bits  = UART_STOP_BITS_1,
    .flow_ctrl  = UART_HW_FLOWCTRL_DISABLE,
};
uart_param_config(GNSS_UART_PORT, &uart_cfg);
uart_set_pin(GNSS_UART_PORT,
    PIN_GNSS_UART_TX,   // TX ESP32-S3 → RX NEO-M8N
    PIN_GNSS_UART_RX,   // RX ESP32-S3 ← TX NEO-M8N
    UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);
uart_driver_install(GNSS_UART_PORT, 1024, 0, 0, NULL, 0);
```

**Lý Do Đổi Baud Rate:**

NEO-M8N mặc định 9600 bps. Tại 9600 bps, nhận đủ tất cả NMEA sentences (GGA, RMC, VTG, GSA, GSV) mất ~1 giây/chu kỳ — không đủ cho update rate 5–10 Hz. Cần đổi lên 115200 bps bằng lệnh UBX-CFG-PRT khi khởi động:

```c
// UBX-CFG-PRT: đổi UART1 NEO-M8N lên 115200 bps, giữ NMEA output
static const uint8_t ubx_set_baud_115200[] = {
    0xB5, 0x62,             // UBX sync chars
    0x06, 0x00,             // Class=CFG, ID=PRT
    0x14, 0x00,             // Length = 20 bytes
    0x01,                   // Port ID: UART1
    0x00,                   // Reserved
    0x00, 0x00,             // txReady
    0xC0, 0x08, 0x00, 0x00, // mode: 8N1
    0x00, 0xC2, 0x01, 0x00, // baudRate: 115200
    0x07, 0x00,             // inProtoMask: UBX+NMEA+RTCM
    0x03, 0x00,             // outProtoMask: UBX+NMEA
    0x00, 0x00,             // flags
    0x00, 0x00,             // reserved
    0xAD, 0x23              // checksum CK_A, CK_B (tính theo Fletcher)
};
uart_write_bytes(GNSS_UART_PORT, ubx_set_baud_115200, sizeof(ubx_set_baud_115200));
vTaskDelay(pdMS_TO_TICKS(100));
// Sau đó đổi baud rate UART GNSS của ESP32-S3 lên 115200
uart_set_baudrate(GNSS_UART_PORT, 115200);
```

#### V.6.2 Định Dạng NMEA và Cách Parse

NEO-M8N xuất liên tục các câu NMEA (prefix `$GN` khi multi-constellation):

```
$GNGGA,123519.00,1059.99123,N,10645.12456,E,1,08,0.9,50.4,M,-17.5,M,,*47
$GNRMC,123519.00,A,1059.99123,N,10645.12456,E,022.4,084.4,020326,,,A*7B
$GNVTG,084.4,T,,M,022.4,N,041.5,K,A*31
$GNGSA,A,3,01,04,07,08,11,17,19,28,,,,,1.2,0.9,0.8*24
```

**Parse GGA — Vị Trí, Độ Cao, Số Vệ Tinh:**

| Field | Ví dụ | Ý nghĩa |
|-------|-------|---------|
| 1 | `123519.00` | Thời gian UTC (HHMMSS.SS) |
| 2 | `1059.99123` | Vĩ độ (DDMM.MMMMM) |
| 3 | `N` | Bắc/Nam |
| 4 | `10645.12456` | Kinh độ (DDDMM.MMMMM) |
| 5 | `E` | Đông/Tây |
| 6 | `1` | Fix quality (0=invalid, 1=GPS, 2=DGPS) |
| 7 | `08` | Số vệ tinh đang dùng |
| 8 | `0.9` | HDOP |
| 9 | `50.4` | Độ cao MSL (mét) |

**Parse RMC — Tốc Độ, Hướng Đi, Ngày:**

| Field | Ví dụ | Ý nghĩa |
|-------|-------|---------|
| 2 | `A` | Status (A=valid, V=void) |
| 7 | `022.4` | Tốc độ (knots) |
| 8 | `084.4` | Hướng đi (degrees true north) |
| 9 | `020326` | Ngày (DDMMYY) |

**Chỉ Parse GGA và RMC** — đủ cho vehicle tracking, bỏ qua VTG, GSA, GSV để giảm CPU load.

#### V.6.3 Chuyển Đổi Tọa Độ NMEA → Decimal Degrees

Định dạng NMEA dùng DDMM.MMMMM (độ + phút thập phân), cần chuyển sang decimal degrees:

```c
/**
 * Chuyển tọa độ NMEA (DDMM.MMMMM) sang decimal degrees.
 * Ví dụ: 1059.99123 (10 độ 59.99123 phút) → 10.9998538 degrees
 */
double nmea_to_decimal_degrees(double nmea_val, char hemisphere) {
    int degrees = (int)(nmea_val / 100);          // Lấy phần độ
    double minutes = nmea_val - (degrees * 100);  // Phần phút
    double decimal = degrees + (minutes / 60.0);  // Chuyển sang decimal
    if (hemisphere == 'S' || hemisphere == 'W') {
        decimal = -decimal;                        // Nam hoặc Tây → âm
    }
    return decimal;
}
```

**Ví dụ:**

```
GGA field: "1059.99123", "N"
→ degrees = 10, minutes = 59.99123
→ decimal = 10 + 59.99123/60 = 10.9998538°N  ✓

GGA field: "10645.12456", "E"
→ degrees = 106, minutes = 45.12456
→ decimal = 106 + 45.12456/60 = 106.7520760°E  ✓
```

**Chuyển đổi tốc độ từ RMC:**

```c
// RMC field 7: tốc độ đơn vị knots → km/h
float speed_kmh = speed_knots * 1.852f;
```

#### V.6.4 Cấu Trúc Dữ Liệu GNSS Dùng Chung

Dữ liệu GNSS được chia sẻ giữa `gnss_task` và `mqtt_task` qua mutex:

```c
typedef struct {
    double   latitude;       // decimal degrees (âm = Nam)
    double   longitude;      // decimal degrees (âm = Tây)
    float    altitude;       // mét MSL
    float    speed_kmh;      // km/h (từ RMC, đã nhân 1.852)
    float    course;         // degrees, true north (từ RMC)
    uint8_t  satellites;     // số vệ tinh đang dùng (từ GGA field 7)
    uint8_t  fix_quality;    // 0=no fix, 1=GPS, 2=DGPS (từ GGA field 6)
    float    hdop;           // Horizontal DOP (từ GGA field 8)
    uint32_t timestamp_ms;   // system tick lúc nhận NMEA
    bool     is_valid;       // true khi RMC status = 'A'
} gnss_data_t;

// Mutex bảo vệ truy cập đồng thời
static gnss_data_t  g_gnss_data;
static SemaphoreHandle_t g_gnss_mutex;
```

**gnss_task** (Core 1, Priority 5, Stack 4096 B):

```c
void gnss_task(void *pvParameters) {
    uint8_t  buf[256];
    char     line[128];
    int      len;

    gnss_init_uart();          // Cấu hình UART2, đổi baud lên 115200

    while (1) {
        len = uart_read_bytes(GNSS_UART_PORT, buf, sizeof(buf)-1,
                              pdMS_TO_TICKS(100));
        if (len > 0) {
            buf[len] = '\0';
            // Tách từng dòng NMEA và parse
            parse_nmea_lines((char*)buf, len);
        }
    }
}

static void parse_nmea_lines(const char *data, int len) {
    // Tìm $GNGGA và $GNRMC, parse từng câu
    // Cập nhật g_gnss_data với mutex
    if (xSemaphoreTake(g_gnss_mutex, pdMS_TO_TICKS(10)) == pdTRUE) {
        // update g_gnss_data fields
        xSemaphoreGive(g_gnss_mutex);
    }
}
```

#### V.6.5 Quản Lý Nguồn NEO-M8N

**Tiêu thụ điện NEO-M8N:**

| Chế độ | Dòng điện |
|--------|-----------|
| Acquisition / Tracking (full power) | ~67 mA |
| Power Save Mode (1 Hz cyclic) | ~11 mA |
| Backup / RTC only (VBAT) | ~15 µA |

**Bật/Tắt Nguồn GNSS qua tín hiệu EN (GPIO cụ thể chốt sau):**

```c
#define GNSS_POWER_EN_GPIO  PIN_GNSS_EN  // ánh xạ GPIO cụ thể trong pin_map.h khi chốt phần cứng

void gnss_power_on(void) {
    gpio_set_level(GNSS_POWER_EN_GPIO, 1);  // Bật LDO 3.3V cho NEO-M8N
    vTaskDelay(pdMS_TO_TICKS(500));          // Đợi module ổn định
}

void gnss_power_off(void) {
    gpio_set_level(GNSS_POWER_EN_GPIO, 0);  // Tắt LDO → NEO-M8N off
    // VBAT vẫn cấp → giữ almanac/ephemeris → hot start lần sau
}
```

**Power Save Mode (PSM) qua UBX-CFG-PM2:**

```c
// Kích hoạt Power Save Mode cyclic 1 Hz khi không cần update nhanh
static const uint8_t ubx_enable_psm[] = {
    0xB5, 0x62, 0x06, 0x3B,  // UBX-CFG-PM2
    // ... payload theo u-blox M8 protocol spec
};
uart_write_bytes(GNSS_UART_PORT, ubx_enable_psm, sizeof(ubx_enable_psm));
```

**Chiến lược nguồn theo chế độ:**

| Chế độ | NEO-M8N | Lý do |
|--------|---------|-------|
| DRIVING | Full power (67 mA) | Track liên tục, cập nhật vị trí nhanh |
| PARKED | Tắt nguồn hoàn toàn | Tiết kiệm 11–67 mA, VBAT giữ almanac |
| ALARM | Full power (67 mA) | Cần fix nhanh để gửi cảnh báo |
| HEARTBEAT | Bật → fix → tắt | Hot start ~1 giây, đọc vị trí, tắt lại |

#### V.6.6 Xử Lý Fix Timeout

```c
#define GNSS_FIX_TIMEOUT_MS  60000  // 60 giây timeout cold start
#define GNSS_HOT_START_MS    3000   // 3 giây timeout hot start

/**
 * Đợi GNSS có fix. Trả về true nếu có fix, false nếu timeout.
 */
bool gnss_wait_for_fix(uint32_t timeout_ms) {
    uint32_t start = xTaskGetTickCount() * portTICK_PERIOD_MS;
    while ((xTaskGetTickCount() * portTICK_PERIOD_MS - start) < timeout_ms) {
        if (xSemaphoreTake(g_gnss_mutex, pdMS_TO_TICKS(10)) == pdTRUE) {
            bool valid = g_gnss_data.is_valid;
            xSemaphoreGive(g_gnss_mutex);
            if (valid) return true;
        }
        vTaskDelay(pdMS_TO_TICKS(200));
    }
    return false;  // Timeout — gửi dữ liệu không có GPS nếu cần
}
```

**Khi Timeout:**

1. Nếu heartbeat: Gửi vị trí cuối cùng đã biết (last known location)
2. Nếu alarm: Gửi cảnh báo không có vị trí (location: null)
3. Log lỗi để debug
4. Retry: Tắt/bật lại nguồn NEO-M8N (deassert EN → delay 500ms → assert EN)

#### V.6.7 Tín Hiệu PPS (Pulse Per Second)

NEO-M8N có thể cung cấp tín hiệu PPS trên một chân interrupt riêng (GPIO cụ thể chốt sau):

- **Chính xác**: ±30 ns RMS khi đã có fix
- **Mục đích**: Đồng bộ timestamp telemetry chính xác
- **Sử dụng**: Interrupt handler cập nhật system time từ RTC khi nhận pulse

```c
// Cấu hình chân PPS interrupt rising edge
gpio_set_direction(PIN_GNSS_PPS, GPIO_MODE_INPUT);
gpio_set_intr_type(PIN_GNSS_PPS, GPIO_INTR_POSEDGE);
gpio_isr_handler_add(PIN_GNSS_PPS, pps_isr_handler, NULL);

static void IRAM_ATTR pps_isr_handler(void *arg) {
    // Lấy system tick tại đúng thời điểm PPS → dùng để calibrate timestamp
    pps_tick = xTaskGetTickCountFromISR();
}
```

PPS là **tùy chọn** — không cần cho vehicle tracking cơ bản.

#### V.6.8 Xử Lý Lỗi NEO-M8N

**Module Không Có NMEA Output:**

1. Kiểm tra nguồn (tín hiệu EN GNSS đã được assert chưa?)
2. Kiểm tra kết nối UART (TX/RX không hoán đổi?)
3. Kiểm tra baud rate (đang dùng 9600 hay 115200?)
4. Thử gửi UBX-CFG-PRT để reset cấu hình UART về mặc định

**GNSS Mất Fix (is_valid → false):**

1. Xe vào hầm, nhà đỗ xe kín → bình thường
2. Dùng last known position trong thời gian ngắn
3. Nếu mất fix > 5 phút → cảnh báo log
4. Không reset module — tự tìm lại khi ra ngoài trời

**HDOP Cao (> 2.0):**

1. Tín hiệu yếu → độ chính xác thấp
2. Vẫn dùng nhưng đánh dấu `fix_quality` để server biết
3. HDOP < 1.0: xuất sắc; 1.0–2.0: tốt; > 2.0: kém

---

### V.7 Tóm Tắt Kiến Trúc Hai Module

```
ESP32-S3
│
├─ UART1 (pin cụ thể chốt sau) ─► A7670C (LTE Cat-1)
│   modem_task (Core 0, Pri 4)      │
│   AT commands: network, MQTT       ├─ Viettel/MobiFone/Vinaphone LTE
│   Không có GNSS AT commands        └─ MQTT broker (IoT server)
│
├─ UART2 (pin cụ thể chốt sau) ─► NEO-M8N (GNSS)
│   gnss_task (Core 1, Pri 5)       │
│   NMEA parser: GGA + RMC           ├─ GPS + GLONASS + Galileo + BeiDou
│   Shared: gnss_data_t + mutex      └─ 72 channels, 2.0-2.5m CEP
│
└─ mqtt_task (Core 0, Pri 3)
    Đọc gnss_data_t (mutex)
    + OBD2 data (BLE)
    → JSON payload → MQTT publish
```

**Ưu điểm kiến trúc tách biệt:**

- GNSS track liên tục trong khi LTE ở PSM (5 µA) → tiết kiệm pin tối đa
- Tắt GNSS độc lập khi xe đỗ trong nhà → tiết kiệm 11–67 mA
- NEO-M8N chính xác hơn GNSS tích hợp: 2.0–2.5m CEP vs ~3–5m CEP
- 72 channels, 6 constellation systems + SBAS
