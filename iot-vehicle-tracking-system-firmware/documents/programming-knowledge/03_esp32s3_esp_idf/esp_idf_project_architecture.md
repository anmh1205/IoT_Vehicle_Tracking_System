# ESP-IDF Project Architecture

Tài liệu này mô tả kiến trúc hiện tại của firmware ESP32-S3 trong repo, tập trung vào module boundaries, data flow, persistence, wake/sleep, và OTA. Nội dung bám sát source đang có, không mô tả các phần chưa hiện diện.

## Kiến trúc tổng quan
Firmware hiện tại là một **single-component ESP-IDF application** với `main` component chứa toàn bộ runtime code. [Project source]

### Thành phần chính
| Thành phần | Vai trò | Certainty |
|---|---|---|
| `main/main.c` | Entry point, load config, start FSM | [Project source] |
| `main/src/state_machine.c` | Orchestrator chính cho runtime | [Project source] |
| `main/src/modem_lte.c` / `modem_gnss.c` | LTE + GNSS AT control | [Project source] |
| `main/src/imu_lis3dsh.c` | I2C sensor + motion wake | [Project source] |
| `main/src/power_mgr.c` | Power mux / charger / modem control | [Project source] |
| `main/src/nvs_config.c` | NVS config persistence + recovery | [Project source] |
| `main/src/util.c` | OTA helper + string/validation utilities | [Project source] |
| `main/src/ble_init.c` | NimBLE host task lifecycle | [Project source] |

## Boundary của hệ thống runtime
### 1) Device boot boundary
- `app_main()` là entry point duy nhất.
- Khởi tạo log level, NVS, đọc `config_t`, rồi suy ra initial state theo wakeup cause.
- Không có second-stage app service layer hoặc plugin system. [Project source]

### 2) State machine boundary
- `state_machine.c` giữ **runtime orchestration**: sensor sampling, BLE OBD, LTE, MQTT, OTA, sleep transitions.
- `g_rtc_context` nằm trong RTC memory để giữ state xuyên deep sleep.
- Đây là trung tâm liên kết giữa local board sensors, cloud, modem, and OTA. [Project source]

### 3) Hardware abstraction boundary
- `pin_map.h` là mapping duy nhất giữa source và board pins.
- Các pin cho modem reset/DTR/status/netlight đang để `GPIO_NUM_NC`, nên code đã có guard `ESP_ERR_NOT_SUPPORTED`. [Project source]
- Netlist cho thấy tín hiệu modem `RESET`, `PWR-KEY`, `STATUS`, `NET-LIGHT`, `SIM-DTR` được route qua transistor/điện trở riêng; firmware hiện chỉ điều khiển phần đã map trong `pin_map.h`. [Netlist inference][Project source]

## Data flow
### Sensor to telemetry
1. `adc_reader_init()` và `adc_read_battery_voltage()` cung cấp battery voltage. [Project source]
2. `imu_get_vibration_composite()` lấy dữ liệu I2C từ LIS3DSH. [Project source]
3. BLE OBD nếu connected sẽ query PID 0x0C/0x0D/0x05/0x2F/0x04. [Project source]
4. GNSS query trả `gnss_data_t`. [Project source]
5. `s_telemetry` được cập nhật rồi format thành raw/status/event/firmware payload. [Project source]

### Telemetry to cloud
- `tracker_mqtt_publish_rawdata/status/event/firmware()` được gọi từ state machine. [Project source]
- Command callback đi vào `command_handler_process()`.
- OTA flow được kích hoạt từ command handler state và được xử lý bằng `util_ota_apply_update()` + RTC confirm state. [Project source]

### Sleep / wake data preservation
- Trước deep sleep, code snapshot `last_state`, `ign_last_known`, `last_battery_v`, `last_heartbeat_ts` vào RTC context.
- Wake path dùng timer để heartbeat hoặc EXT0 motion interrupt để alarm flow. [Project source]

## Module coupling pattern
### Strong coupling hiện có
- `state_machine.c` trực tiếp gọi gần như mọi subsystem API. [Project source]
- Điều này giúp flow rõ nhưng module biên rộng; hiện chưa tách thành application services riêng. [Project source]

### Loose coupling hiện có
- `util.c` cung cấp OTA helper tách khỏi state machine.
- `nvs_config.c` tách persistence khỏi boot logic.
- `ble_init.c` tách lifecycle host task khỏi BLE business logic. [Project source]

## Runtime state model
### State machine states
- `APP_STATE_INIT`
- `APP_STATE_CHECK_IGN`
- `APP_STATE_DRIVING`
- `APP_STATE_PARKED`
- `APP_STATE_ALARM`
- `APP_STATE_HEARTBEAT`
- `APP_STATE_SLEEP` [Project source]

### State transition notes
- Driving mode gửi raw telemetry theo `tracking_interval_s` hoặc theo location request.
- Parked mode chỉ publish stopped rồi đi sleep.
- Alarm mode publish warning event `motion_detected`, gửi rawdata mỗi 5 s, và rời alarm nếu ignition được suy ra hoặc motion mất quá 300 s.
- Heartbeat mode chỉ phát 1 rawdata rồi sleep. [Project source]

## Persistence architecture
### NVS
- Một blob config cho toàn bộ `config_t`.
- Default restore tự động khi namespace / key missing / data invalid. [Project source]

### RTC memory
- Dùng cho rollback/confirm OTA và boot counters.
- Không có file-system persistence ngoài flash partition NVS/OTA. [Project source]

### Partition layout
| Partition | Purpose | Certainty |
|---|---|---|
| `nvs` | Runtime config, future persistence | [Project source] |
| `otadata` | OTA selection metadata | [Project source] |
| `phy_init` | PHY calibration data | [Project source] |
| `factory` | Base app image | [Project source] |
| `ota_0`, `ota_1` | Redundant OTA slots | [Project source] |

## Error handling / timeout / retry / recovery model
### Timeout
- LTE registration poll: 20 lần x 1 s, tổng xấp xỉ 20 s. [Project source]
- AT command timeouts: 5 s, 10 s, 15 s tùy command. [Project source]
- BLE host stop wait: 1 s. [Project source]
- I2C register ops: 100 ticks timeout per transaction. [Project source]

### Retry
- BLE connect retry 3 lần, mỗi lần delay 500 ms. [Project source]
- LTE AT init chỉ có một nhánh reset recovery khi AT probe fail. [Project source]

### Recovery
- NVS erase/re-init khi flash state sai version/free page. [Project source][Official ESP-IDF docs]
- OTA verify hash mismatch thì abort, không set boot partition. [Project source]
- OTA valid confirm fail thì giữ trạng thái failed và chờ rollback/next boot policy. [Project source]
- BLE stack teardown if task creation or init fails rolls back HCI/NimBLE resources. [Project source]

## Những phần chưa dùng trong source hiện tại
| Capability | Status | Ghi chú |
|---|---|---|
| SDMMC | Chưa dùng | Không thấy mount hoặc storage flow | [Project source][Official ESP-IDF docs] |
| FATFS | Chưa dùng | Không có local file logging path | [Project source][Official ESP-IDF docs] |
| Explicit watchdog task | Chưa thấy | Không có task WDT registration riêng | [Project source][Official ESP-IDF docs] |
| Light sleep | Chưa thấy | Chỉ thấy deep sleep path | [Project source][Official ESP-IDF docs] |
| Separate app layers | Chưa có | FSM gọi trực tiếp module APIs | [Project source] |

## Đối chiếu với source hiện tại
| Kiến trúc | Source evidence | Nhận định |
|---|---|---|
| Single ESP-IDF component | `main/CMakeLists.txt` chỉ register một component | [Project source] |
| Central FSM | `state_machine.c` owns orchestration | [Project source] |
| RTC retained context | `RTC_DATA_ATTR rtc_context_t g_rtc_context` | [Project source] |
| OTA redundant slots | `partitions.csv` có `factory`, `ota_0`, `ota_1` | [Project source] |
| Motion wake | `esp_sleep_enable_ext0_wakeup(PIN_LIS3DSH_INT, 1)` | [Project source] |
| Heartbeat timer wake | `esp_sleep_enable_timer_wakeup(...)` | [Project source] |
| I2C sensor | LIS3DSH via `driver/i2c_master.h` | [Project source][Official ESP-IDF docs] |
| Netlist fit | ESP32-S3 pinout includes I2C0, SD interface, modem control nets, but firmware only wires the subset in `pin_map.h` | [Netlist inference][Project source] |

## Nguồn tham khảo chi tiết
### Source project
- `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`
- `iot-vehicle-tracking-system-firmware/main/main.c`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `iot-vehicle-tracking-system-firmware/main/src/power_mgr.c`
- `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c`
- `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- `iot-vehicle-tracking-system-firmware/main/src/modem_gnss.c`
- `iot-vehicle-tracking-system-firmware/main/src/nvs_config.c`
- `iot-vehicle-tracking-system-firmware/main/src/util.c`
- `iot-vehicle-tracking-system-firmware/main/src/ble_init.c`
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
