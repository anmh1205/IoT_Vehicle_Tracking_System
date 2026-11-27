# 04 — platform-board-esp32s3: pin map và power GPIO

> 🎯 Mục tiêu: xây lớp board — nơi **duy nhất** biết chân GPIO nào nối gì. Mọi lớp khác gọi qua tên logic (`PIN_MODEM_PWRKEY`) chứ không gõ số chân.

Nguồn thật: `components/platform-board-esp32s3/` và `main/inc/pin_map.h`

## 1. Vì sao gom pin vào một chỗ?

Nếu số chân rải khắp code, đổi board revision = sửa 30 file. Gom vào `pin_map.h` → đổi board chỉ sửa một file. Đây là biên giới giữa **phần cứng cụ thể** và **logic phần mềm**.

```
components/platform-board-esp32s3/
├── CMakeLists.txt
├── include/
│   ├── pin_map.h      # mọi GPIO/peripheral
│   ├── power_mgr.h    # điều khiển nguồn + modem power
│   └── adc_reader.h   # đọc điện áp pin/+12V
└── src/
    ├── power_mgr.c
    └── adc_reader.c
```

## 2. pin_map.h — bản đồ chân thật của dự án

🧩 (trích đúng từ codebase)

```c
#pragma once
#include "driver/gpio.h"
#include "driver/uart.h"

/* Đọc điện áp (qua cầu chia 11:1) */
#define PIN_U_SUPPLY_ADC GPIO_NUM_3   // +12V xe
#define PIN_U_BATT_ADC   GPIO_NUM_4   // pin backup

/* Modem SIM7600: UART + điều khiển nguồn */
#define PIN_MODEM_TX     GPIO_NUM_17  // MCU -> modem RXD
#define PIN_MODEM_RX     GPIO_NUM_18  // modem TXD -> MCU
#define PIN_MODEM_PWRKEY GPIO_NUM_34  // pulse để bật/tắt modem
#define PIN_MODEM_RESET  GPIO_NUM_35  // pulse reset cứng
#define PIN_MODEM_DTR    GPIO_NUM_NC  // CHƯA nối → set_dtr là no-op
#define PIN_MODEM_STATUS GPIO_NUM_NC  // CHƯA nối → read_status không hỗ trợ
#define PIN_USER_LED     GPIO_NUM_15

/* Bus I2C dùng chung cho IMU LIS3DSH và RTC DS3231 */
#define PIN_LIS3DSH_SDA  GPIO_NUM_2
#define PIN_LIS3DSH_SCL  GPIO_NUM_1
#define PIN_LIS3DSH_INT1 GPIO_NUM_41  // ngắt motion -> wake
#define PIN_DS3231_SDA   GPIO_NUM_2   // cùng dây với IMU
#define PIN_DS3231_SCL   GPIO_NUM_1

/* Thẻ SD 4-bit (SDMMC) để buffer dữ liệu offline */
#define PIN_SDMMC_CLK GPIO_NUM_10
#define PIN_SDMMC_CMD GPIO_NUM_9
#define PIN_SDMMC_D0  GPIO_NUM_11
#define PIN_SDMMC_D1  GPIO_NUM_12
#define PIN_SDMMC_D2  GPIO_NUM_7
#define PIN_SDMMC_D3  GPIO_NUM_8

#define MODEM_UART_NUM  UART_NUM_1
#define MODEM_UART_BAUD 115200
```

> ⚠️ **`GPIO_NUM_NC` = "not connected"** trên board revision này. `PIN_MODEM_DTR`, `PIN_MODEM_STATUS`, `PIN_MODEM_NETLIGHT` chưa nối. Driver phải kiểm tra `== GPIO_NUM_NC` và bỏ qua thao tác, **không** crash. Đây là một bài học thiết kế quan trọng: phần cứng không lý tưởng, firmware phải chịu được chân thiếu.

> 💡 IMU và RTC **dùng chung một bus I2C** (SDA=GPIO2, SCL=GPIO1). Hai driver phải chia sẻ bus, không tự init bus xung đột.

## 3. power_mgr.h — điều khiển nguồn + modem power

🧩 (rút gọn theo signature thật)

```c
#pragma once
#include "esp_err.h"
#include <stdbool.h>

esp_err_t power_mgr_init(void);

/* Điều khiển nguồn modem (board-level) */
esp_err_t modem_power_on(void);     // pulse PWRKEY
esp_err_t modem_power_off(void);
esp_err_t modem_set_dtr(bool high); // no-op nếu DTR == NC
esp_err_t modem_read_status(bool *level); // ESP_ERR_NOT_SUPPORTED nếu NC
```

🧩 `power_mgr.c` — xử lý chân NC an toàn

```c
#include "power_mgr.h"
#include "pin_map.h"
#include "driver/gpio.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

esp_err_t modem_set_dtr(bool high) {
    if (PIN_MODEM_DTR == GPIO_NUM_NC) {
        return ESP_OK;            // không nối -> coi như thành công, bỏ qua
    }
    return gpio_set_level(PIN_MODEM_DTR, high ? 1 : 0);
}

esp_err_t modem_read_status(bool *level) {
    if (PIN_MODEM_STATUS == GPIO_NUM_NC) {
        return ESP_ERR_NOT_SUPPORTED;  // báo rõ "không đo được"
    }
    *level = gpio_get_level(PIN_MODEM_STATUS);
    return ESP_OK;
}

esp_err_t modem_power_on(void) {
    gpio_set_direction(PIN_MODEM_PWRKEY, GPIO_MODE_OUTPUT);
    gpio_set_level(PIN_MODEM_PWRKEY, 1);
    vTaskDelay(pdMS_TO_TICKS(1000)); // SIM7600 cần pulse ~1s
    gpio_set_level(PIN_MODEM_PWRKEY, 0);
    return ESP_OK;
}
```

> 💡 Trả `ESP_ERR_NOT_SUPPORTED` khi chân NC tốt hơn là trả `false` giả — lớp trên phân biệt được "modem tắt" với "không đo được".

## 4. adc_reader.h — đọc điện áp

🧩

```c
#pragma once
#include "esp_err.h"
esp_err_t adc_reader_init(void);
float adc_read_supply_voltage(void);  // +12V xe (đã nhân hệ số chia + calib)
float adc_read_battery_voltage(void); // pin backup
```

> 💡 Codebase có hệ số calib đo thực tế (`TRACKER_ADC_SUPPLY_CALIB_GAIN = 1.02007f`). ADC ESP32 không tuyến tính hoàn hảo → phải nhân hệ số hiệu chỉnh đo từ đồng hồ thật.

## 5. 🔧 Build & kiểm tra

```c
power_mgr_init();
adc_reader_init();
ESP_LOGI(TAG, "supply=%.2fV batt=%.2fV",
         adc_read_supply_voltage(), adc_read_battery_voltage());
modem_power_on(); // nghe tiếng modem khởi động / xem netlight
```

## ⚠️ Bẫy thường gặp

- **Gõ số chân thẳng trong driver:** phá nguyên tắc "một nguồn sự thật". Luôn dùng macro từ `pin_map.h`.
- **Không xử lý `GPIO_NUM_NC`:** crash hoặc thao tác nhầm chân khác.
- **PWRKEY pulse sai thời lượng:** SIM7600 cần pulse đủ dài (~1s); ngắn quá modem không bật. Xem bước 07.
- **Quên cầu chia áp:** đọc thẳng 12V vào ADC 3.3V = cháy chân. Hệ số 11:1 là bắt buộc.

## ➡️ Tiếp theo

[05 — Ports và Dependency Injection](./05-ports-va-dependency-injection.md)
