# Inventory Project Structure

**Cập nhật lần cuối:** 2026-04-04  
**Mục tiêu:** ghi nhanh cấu trúc firmware hiện tại để onboarding, debug và đối chiếu thay đổi source.

## 1) Mục đích
Tài liệu này lập bản đồ cấu trúc project firmware đang build thực tế, bám theo các file trong `iot-vehicle-tracking-system-firmware/main/` và các header tương ứng trong `main/inc/`. Mục tiêu là trả lời nhanh 3 câu hỏi:
- Firmware được ghép từ những module nào?
- Mỗi module chịu trách nhiệm gì?
- File nào là điểm vào, file nào là phụ trợ, file nào là hạ tầng?

## 2) Phạm vi áp dụng trong dự án này
Phạm vi chỉ gồm firmware ESP32-S3 trong thư mục `iot-vehicle-tracking-system-firmware/`. Không bao gồm backend, frontend, mobile, hay PCB artifacts ngoài phạm vi build firmware.

## 3) Bản đồ cấu trúc source hiện tại

### 3.1 Điểm vào và cấu hình build
| File | Vai trò | Ghi chú |
|---|---|---|
| `main/main.c` | Điểm vào `app_main()` | Khởi tạo NVS, đọc config, xác định state khởi đầu, chạy vòng lặp state machine |
| `main/CMakeLists.txt` | Danh sách file build | Cho thấy module thực tế đang được link vào firmware |
| `main/Kconfig.projbuild` | Cấu hình build-time | Được dùng để cấp `CONFIG_*` cho APN, command subscribe, project version, ... |

### 3.2 Domain cấu hình, trạng thái, payload
| File | Vai trò | Hàm / kiểu quan trọng |
|---|---|---|
| `main/inc/app_config.h` | Mô hình config và OTA payload | `config_t`, `firmware_status_t`, `ota_command_t`, `app_config_set_defaults()`, `app_config_is_valid()` |
| `main/inc/app_state.h` | FSM + RTC context + telemetry | `app_state_t`, `rtc_context_t`, `telemetry_t`, `g_rtc_context`, `state_machine_init()`, `state_machine_run()` |
| `main/inc/data_formatter.h` | Tạo JSON payload | `data_format_rawdata()`, `data_format_status()`, `data_format_event()`, `data_format_firmware()` |
| `main/inc/util.h` | Helper chung, OTA utils, guard macros | `util_copy_string()`, `util_uptime_ms()`, `util_ota_apply_update()`, `util_ota_trigger_manual_rollback()` |

### 3.3 Domain nguồn/power/sensor
| File | Vai trò | Hàm / kiểu quan trọng |
|---|---|---|
| `main/inc/pin_map.h` | Map GPIO/peripheral | `PIN_IGN_IN`, `PIN_U_BATT_ADC`, `PIN_CHARGER_EN`, `PIN_POWER_MUX_SEL`, `PIN_LIS3DSH_*`, `PIN_MODEM_*` |
| `main/inc/adc_reader.h` / `main/src/adc_reader.c` | Đọc điện áp pin | `adc_reader_init()`, `adc_read_battery_voltage()` |
| `main/inc/power_mgr.h` / `main/src/power_mgr.c` | Điều khiển mux nguồn, charger, modem power/reset/DTR | `power_mgr_init()`, `power_select_battery()`, `power_select_backup()`, `charger_enable()`, `charger_disable()`, `modem_power_on()`, `modem_power_off()`, `modem_reset_pulse()`, `modem_set_dtr()`, `modem_read_status()`, `modem_read_netlight()`, `power_get_status()` |
| `main/inc/imu_lis3dsh.h` / `main/src/imu_lis3dsh.c` | Driver LIS3DSH | `imu_init()`, `imu_configure_motion_interrupt()`, `imu_motion_detected()`, `imu_read_accel()`, `imu_get_vibration_composite()`, `imu_deinit()` |

### 3.4 Domain modem / LTE / GNSS / MQTT
| File | Vai trò | Hàm / kiểu quan trọng |
|---|---|---|
| `main/inc/modem_at.h` / `main/src/modem_at.c` | UART AT transport | `modem_at_init()`, `modem_at_send()`, `modem_at_send_expect()`, `modem_at_register_urc()` |
| `main/inc/modem_lte.h` / `main/src/modem_lte.c` | Khởi tạo LTE, PDP, sleep/wakeup | `modem_lte_init()`, `modem_lte_connect()`, `modem_lte_disconnect()`, `modem_lte_sleep()`, `modem_lte_wakeup()`, `modem_lte_get_rssi()`, `modem_lte_is_connected()` |
| `main/inc/modem_gnss.h` / `main/src/modem_gnss.c` | Bật/tắt GNSS, parse fix | `modem_gnss_power_on()`, `modem_gnss_power_off()`, `modem_gnss_get_location()` |
| `main/inc/mqtt_client.h` / `main/src/mqtt_client.c` | Topic + publish/subscribe | `tracker_mqtt_init()`, `tracker_mqtt_connect()`, `tracker_mqtt_publish_*()`, `tracker_mqtt_subscribe_commands()`, `tracker_mqtt_set_command_callback()` |

### 3.5 Domain BLE / OBD / command
| File | Vai trò | Hàm / kiểu quan trọng |
|---|---|---|
| `main/inc/ble_init.h` / `main/src/ble_init.c` | Lifecycle NimBLE | `ble_init_stack()`, `ble_stack_init()`, `ble_stack_deinit()` |
| `main/inc/ble_mgr.h` / `main/src/ble_mgr.c` | BLE central manager | `ble_mgr_init()`, `ble_mgr_connect_service()`, `ble_mgr_send()`, `ble_mgr_is_connected()`, `ble_mgr_disconnect()` |
| `main/inc/ble_obd.h` / `main/src/ble_obd.c` | OBD-over-BLE session | `ble_obd_set_preferred_address()`, `ble_obd_connect()`, `ble_obd_disconnect()`, `ble_obd_is_connected()`, `ble_obd_rxtx()`, `ble_obd_send_raw()`, `ble_obd_elm327_init()` |
| `main/inc/command_handler.h` / `main/src/command_handler.c` | Parse JSON command cloud | `command_handler_init()`, `command_handler_process()`, `command_handler_consume_location_request()`, `command_handler_is_tracking_enabled()`, `command_handler_consume_action()`, `command_handler_take_ota_command()` |

### 3.6 NVS / runtime persistence
| File | Vai trò | Hàm / kiểu quan trọng |
|---|---|---|
| `main/inc/nvs_config.h` / `main/src/nvs_config.c` | Persist config runtime | `nvs_config_init()`, `nvs_config_load()`, `nvs_config_save()` |

## 4) Đối chiếu source hiện tại
Các điểm build và entry hiện xác nhận trực tiếp từ source:
- `main/CMakeLists.txt` liệt kê rõ module build: `main.c`, `src/adc_reader.c`, `src/ble_init.c`, `src/ble_mgr.c`, `src/ble_obd.c`, `src/ble_util.c`, `src/imu_lis3dsh.c`, `src/power_mgr.c`, `src/modem_at.c`, `src/modem_lte.c`, `src/modem_gnss.c`, `src/mqtt_client.c`, `src/data_formatter.c`, `src/command_handler.c`, `src/state_machine.c`, `src/nvs_config.c`, `src/util.c`.
- `main/main.c` là boot entrypoint, gọi `nvs_config_init()`, `nvs_config_load()`, rồi `state_machine_init(&config)` và `state_machine_run()`.
- `main/src/state_machine.c` là vòng điều phối trung tâm, nắm `g_rtc_context`, OBD/BLE, LTE/GNSS, MQTT, OTA, deep sleep.
- `main/inc/pin_map.h` xác nhận pin mapping đang dùng trong code, kể cả các chân `GPIO_NUM_NC` cho phần modem chưa lắp.

## 5) Điểm chắc chắn vs suy luận vs mơ hồ
### Chắc chắn
- Tên module, hàm public, và phụ thuộc build đã có trong `main/CMakeLists.txt` và các header `main/inc/*`.
- Vòng runtime chính đi qua `app_main()` → `state_machine_init()` → `state_machine_run()`.
- Firmware dùng MQTT, LTE/GNSS, BLE OBD, IMU, ADC, NVS, OTA, deep sleep.

### Suy luận
- Các module được chia theo domain như trên vì tên file, hàm public, và call graph nội bộ khớp nhau.
- `main/src/state_machine.c` là “orchestrator” vì nó ghép hầu hết module lại và giữ RTC context.

### Mơ hồ
- Một số chi tiết wiring thực tế của board không thể xác nhận chỉ từ source, ví dụ resistor divider, chân modem chưa gán, hoặc giá trị phần cứng ngoài code.
- `imu_lis3dsh.c` và `modem_lte.c` mô tả hành vi phần cứng khá rõ, nhưng vẫn cần datasheet/vendor doc để chốt timing/threshold chính xác.

## 6) Nguồn tham khảo
### [Project Evidence]
- `iot-vehicle-tracking-system-firmware/main/main.c`
- `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`
- `iot-vehicle-tracking-system-firmware/main/Kconfig.projbuild`
- `iot-vehicle-tracking-system-firmware/main/inc/app_config.h`
- `iot-vehicle-tracking-system-firmware/main/inc/app_state.h`
- `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- `iot-vehicle-tracking-system-firmware/main/src/ble_obd.c`
- `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c`
- `iot-vehicle-tracking-system-firmware/main/src/nvs_config.c`

### [Vendor/Official/Community]
- [Official ESP-IDF docs] Sleep modes, UART, I2C, NVS, OTA, watchdog, SDMMC/FATFS:  
  - https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/sleep_modes.html  
  - https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/uart.html  
  - https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/i2c.html  
  - https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/storage/nvs_flash.html  
  - https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/ota.html
- [Vendor SIMCom] `documents/hardware-specs/components/modem/sim7600-series-at-command-manual-v2.00.pdf`, `documents/hardware-specs/components/modem/sim7600ce-hardware-design-v1.04.pdf`, technical files portal: https://www.simcom.com/technical_files.html
- [Vendor ST] `documents/hardware-specs/components/imu/lis3dsh-datasheet.pdf`, official page: https://www.st.com/resource/en/datasheet/lis3dsh.pdf
- [Vendor/Standard OBD] ELM327 datasheet: https://www.elmelectronics.com/wp-content/uploads/2016/07/ELM327DS.pdf ; SAE J1979 listing: https://saemobilus.sae.org/standards/j1979_202505-e-e-diagnostic-test-modes
- [Community] TinyGSM: https://github.com/vshymanskyy/TinyGSM ; OBD PID map repo: https://github.com/OBDb/SAEJ1979
