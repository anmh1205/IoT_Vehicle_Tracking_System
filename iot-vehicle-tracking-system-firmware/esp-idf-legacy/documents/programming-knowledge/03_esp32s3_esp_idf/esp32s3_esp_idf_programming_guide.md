# ESP32-S3 + ESP-IDF Programming Guide

Mục tiêu của tài liệu này là mô tả cách firmware hiện tại khởi động, cấu hình, ngủ, thức dậy và kết nối modem/IMU/OTA trên nền ESP32-S3 + ESP-IDF 5.5.3. Tài liệu chỉ ghi nhận những gì có thể đối chiếu được với source và netlist hiện tại.

## Phạm vi
- Board dùng **ESP32-S3** làm MCU chính. [Project source]
- Firmware chạy theo **finite-state machine** trong `main/src/state_machine.c`. [Project source]
- Lưu cấu hình runtime vào **NVS**. [Project source]
- OTA qua **HTTPS + ESP-IDF OTA APIs**. [Project source][Official ESP-IDF docs]
- Deep sleep dùng **timer wakeup** và **EXT0 wakeup** từ chân IMU. [Project source][Official ESP-IDF docs]

## Luồng chạy hiện tại
1. `app_main()` khởi tạo log, NVS và tải `config_t`. [Project source]
2. Ứng dụng đọc partition đang chạy và ghi label vào RTC context cho báo cáo firmware. [Project source]
3. Wakeup cause quyết định state ban đầu: timer -> `APP_STATE_HEARTBEAT`, EXT0 -> `APP_STATE_ALARM`, còn lại -> `APP_STATE_INIT`. [Project source]
4. `state_machine_init()` khởi tạo ADC, IMU, power manager, LTE modem, MQTT client, command handler. [Project source]
5. Vòng lặp chính gọi `state_machine_run()` rồi `vTaskDelay(100ms)`. [Project source]

## Cấu hình build và component
| Hạng mục | Trạng thái hiện tại | Certainty |
|---|---|---|
| `idf_component_register()` | Có 1 component `main` với `bt`, `driver`, `esp_adc`, `esp_event`, `esp_netif`, `esp_http_client`, `app_update`, `mbedtls`, `json`, `mqtt`, `nvs_flash`, `esp_timer` | [Project source] |
| Task riêng cho watchdog | Chưa thấy `esp_task_wdt_add()` hoặc task WDT tự khai báo | [Project source] |
| SDMMC/FATFS | Chưa có source dùng `sdmmc_host`, `esp_vfs_fat`, hay mount SD card | [Project source][Official ESP-IDF docs] |
| UART modem | Có UART modem AT, nhưng current source triển khai ở `modem_at.c`/`modem_lte.c`; `pin_map.h` map UART1 TX/RX | [Project source] |
| I2C sensor | Có `driver/i2c_master.h` cho LIS3DSH | [Project source] |

## Bộ nhớ và persistence
### NVS
- `nvs_config_init()` gọi `nvs_flash_init()` và tự xóa khi gặp `ESP_ERR_NVS_NO_FREE_PAGES` hoặc `ESP_ERR_NVS_NEW_VERSION_FOUND`. [Project source][Official ESP-IDF docs]
- `nvs_config_load()` nạp cả `config_t` từ blob, nếu thiếu hoặc invalid thì restore defaults rồi lưu lại. [Project source]
- Đây là cơ chế **self-healing config**; hiện chưa có schema migration chi tiết theo version key riêng. [Project source]

### RTC memory
- `RTC_DATA_ATTR rtc_context_t g_rtc_context` giữ trạng thái qua deep sleep. [Project source]
- Dùng để lưu boot count, version/partition, OTA confirm state và last battery/ignition snapshot. [Project source]

## Sleep / wake behavior
### Deep sleep hiện tại
- `state_machine_prepare_sleep()` tắt BLE stack, GNSS, LTE, charger, rồi select backup power. [Project source]
- Wake sources đang dùng:
  - `esp_sleep_enable_ext0_wakeup(PIN_LIS3DSH_INT, 1)` cho motion wake. [Project source][Official ESP-IDF docs]
  - `esp_sleep_enable_timer_wakeup(...)` cho heartbeat wake. [Project source][Official ESP-IDF docs]
- Firmware không thấy dùng light sleep hay ULP flow trong source hiện tại. [Project source][Official ESP-IDF docs]

### Error handling / recovery
- Nếu IMU motion config fail, code chỉ log warning rồi vẫn tiếp tục boot stack. [Project source]
- Nếu `esp_ota_mark_app_valid_cancel_rollback()` fail, firmware publish status `failed` với error `confirm_failed`. [Project source]
- Nếu BLE connect thất bại, code retry 3 lần với delay 500 ms. [Project source]
- Nếu LTE AT init fail, code thử reset modem một lần rồi probe lại AT. [Project source]

## UART / modem / GNSS
- `MODEM_UART_NUM` là `UART_NUM_1`, baud 115200. [Project source]
- Chân UART dùng cho SIM7600 trong `pin_map.h`: TX GPIO16, RX GPIO17. [Project source]
- `modem_lte.c` dùng AT flow cho:
  - power on/off,
  - `AT+CPIN?`, `AT+CNMP=2`, `AT+CGDCONT=1`,
  - network registration polling qua `AT+CEREG?`,
  - PDP activate `AT+CGACT=1,1`,
  - low power `AT+CSCLK=1`. [Project source]
- GNSS bật/tắt qua `AT+CGNSPWR=1/0`, đọc `AT+CGNSINF`. [Project source]
- Thời gian chờ hiện tại là timeout cứng theo command: 5 s, 10 s, 15 s, và poll 1 s trong 20 vòng cho đăng ký mạng. [Project source]

## I2C / IMU
- LIS3DSH chạy trên `I2C_NUM_0`, 400 kHz, SDA GPIO47, SCL GPIO48. [Project source]
- Driver dùng `i2c_new_master_bus()` và `i2c_master_bus_add_device()`. [Project source][Official ESP-IDF docs]
- Nếu địa chỉ 0x18 không phản hồi, code thử fallback 0x19. [Project source]
- Motion interrupt dùng threshold/duration được quy đổi và ghi vào register sensor. [Project source]

## OTA hiện tại
- OTA download dùng `esp_http_client` over HTTPS + CRT bundle. [Project source][Official ESP-IDF docs]
- Image được ghi vào partition do `esp_ota_get_next_update_partition(NULL)` chọn. [Project source]
- Firmware verify SHA-256 trước khi `esp_ota_end()` và `esp_ota_set_boot_partition()`. [Project source]
- Sau reboot, code chỉ confirm image khi `esp_ota_mark_app_valid_cancel_rollback()` thành công. [Project source]

## Những gì chưa thấy trong source hiện tại
- Chưa thấy use-case SD card, SDMMC, hoặc FATFS để lưu log/dữ liệu cục bộ. [Project source][Official ESP-IDF docs]
- Chưa thấy task watchdog riêng hay cấu hình watchdog lifecycle cụ thể trong runtime source. [Project source][Official ESP-IDF docs]
- Chưa thấy explicit light-sleep API. [Project source][Official ESP-IDF docs]
- Chưa thấy OTA file cache cục bộ trên flash ngoài. [Project source]

## Đối chiếu với source hiện tại
| Mục | Quan sát từ source | Đối chiếu |
|---|---|---|
| Boot entry | `app_main()` chỉ làm init, load NVS, detect wakeup rồi loop FSM | [Project source] |
| State machine | `state_machine.c` là trung tâm orchestration | [Project source] |
| NVS | Config blob lưu trong namespace `tracker_cfg` | [Project source] |
| Sleep | Deep sleep + timer + EXT0 wake | [Project source][Official ESP-IDF docs] |
| UART | Modem AT qua UART1 | [Project source][Official ESP-IDF docs] |
| I2C | LIS3DSH qua I2C master mới | [Project source][Official ESP-IDF docs] |
| OTA | HTTPS OTA + rollback confirm | [Project source][Official ESP-IDF docs] |
| WDT | Không có explicit task WDT trong source đã xem | [Project source] |
| SDMMC/FATFS | Không thấy driver/mount flow | [Project source][Official ESP-IDF docs] |

## Nguồn tham khảo chi tiết
### Source project
- `iot-vehicle-tracking-system-firmware/main/main.c`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- `iot-vehicle-tracking-system-firmware/main/src/modem_gnss.c`
- `iot-vehicle-tracking-system-firmware/main/src/nvs_config.c`
- `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c`
- `iot-vehicle-tracking-system-firmware/main/src/util.c`
- `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`
- `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- `iot-vehicle-tracking-system-firmware/partitions.csv`
- `iot-vehicle-tracking-system-firmware/sdkconfig`

### Hardware / netlist
- `iot-vehicle-tracking-system-firmware/documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET`
- `iot-vehicle-tracking-system-firmware/documents/hardware-specs/components/mcu/esp32-s3-datasheet-en.pdf`
- `iot-vehicle-tracking-system-firmware/documents/hardware-specs/components/mcu/esp32-s3-technical-reference-manual-en.pdf`

### Official ESP-IDF docs
- [ESP-IDF Programming Guide — ESP32-S3 API Reference](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/index.html)
- [Sleep Modes](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/system/sleep_modes.html)
- [UART](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/uart.html)
- [I2C](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/i2c.html)
- [SDMMC Host Driver](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/sdmmc_host.html)
- [FAT Filesystem Support](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/storage/fatfs.html)
- [NVS / Non-Volatile Storage](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/storage/nvs_flash.html)
- [ESP HTTPS OTA](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/system/esp_https_ota.html)
- [Watchdogs](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/system/wdts.html)

### Vendor docs
- [ESP32-S3 Series Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [ESP32-S3 Technical Reference Manual](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
