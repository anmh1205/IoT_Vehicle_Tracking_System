# Firmware Component Map

**Cập nhật lần cuối:** 2026-04-04  
**Mục tiêu:** mô tả luồng tương tác giữa các module firmware để debug và thay đổi có kiểm soát.

## 1) Mục đích
Tài liệu này giải thích cách các khối firmware ghép với nhau: boot, power, modem, GNSS, BLE OBD, MQTT, command handling, OTA, và sleep/RTC. Đây là bản đồ quan hệ, không phải API reference chi tiết.

## 2) Phạm vi áp dụng trong dự án này
Chỉ áp dụng cho firmware ESP32-S3 trong `iot-vehicle-tracking-system-firmware/main/`. Tài liệu này bám vào source hiện tại, không dựa vào tên cũ/legacy nếu chúng đã bị xóa khỏi build.

## 3) Bản đồ component theo luồng runtime

### 3.1 Boot và state machine trung tâm
**Luồng:** `main/main.c` → `state_machine_init()` → `state_machine_run()`

- `main/main.c`:
  - khởi tạo `nvs_config_init()` và `nvs_config_load(&config)`.
  - đọc partition OTA bằng `esp_ota_get_running_partition()` / `esp_ota_get_boot_partition()`.
  - cập nhật `g_rtc_context.boot_count` và state khởi đầu theo wakeup source.
  - gọi `state_machine_init(&config)` rồi chạy vòng lặp `state_machine_run()`.
- `main/src/state_machine.c`:
  - giữ `RTC_DATA_ATTR rtc_context_t g_rtc_context`.
  - giữ `s_config`, `s_telemetry`, `s_ble_ctx`, `s_mqtt_started`, `s_status_running`.
  - quyết định các state: `APP_STATE_INIT`, `CHECK_IGN`, `DRIVING`, `PARKED`, `ALARM`, `HEARTBEAT`, `SLEEP`.

**Ý nghĩa:** đây là điều phối viên duy nhất, mọi subsystem khác là dependency của FSM.

### 3.2 Power subsystem
**Luồng:** `state_machine.c` ↔ `power_mgr.c` ↔ `adc_reader.c` ↔ `pin_map.h`

- `main/src/adc_reader.c`:
  - đọc battery voltage bằng ADC oneshot.
  - dùng `ADC_CHANNEL_3`, attenuation 12 dB, sample averaging, và calibration khi support có sẵn.
- `main/src/power_mgr.c`:
  - config GPIO output/input cho mux nguồn, charger, modem control, low-voltage detector, ignition.
  - `power_select_backup()` là trạng thái an toàn sau boot.
  - `power_get_status()` kết hợp ADC + latch hysteresis + pin `PIN_LVD_STATUS`.
  - `modem_power_on/off()` dùng pulse trên `PIN_MODEM_PWRKEY`.
  - `modem_reset_pulse()`, `modem_set_dtr()`, `modem_read_status()`, `modem_read_netlight()` cung cấp interface tùy chân có map hay không.
- `main/inc/pin_map.h`:
  - xác nhận `PIN_MODEM_RESET`, `PIN_MODEM_DTR`, `PIN_MODEM_STATUS`, `PIN_MODEM_NETLIGHT` đang `GPIO_NUM_NC` trong source hiện tại.

**Ý nghĩa:** power path không chỉ là charger/battery, mà còn điều khiển modem power rail và low-power state.

### 3.3 LTE / AT transport / GNSS
**Luồng:** `power_mgr.c` → `modem_at.c` → `modem_lte.c` → `modem_gnss.c`

- `main/src/modem_at.c`:
  - thiết lập UART modem trên `MODEM_UART_NUM` với `MODEM_UART_BAUD`.
  - serialize transaction bằng mutex.
  - dispatch URC callback theo prefix.
- `main/src/modem_lte.c`:
  - power-on modem, setup AT, tắt echo, check SIM ready, set network mode, cấu hình PDP context theo APN.
  - poll `+CEREG?` để chờ registration.
  - `modem_lte_connect()` kích hoạt PDP và query IP bằng `AT+CGPADDR=1`.
  - `modem_lte_sleep()/wakeup()` dùng DTR + `AT+CSCLK=1` / `AT`.
- `main/src/modem_gnss.c`:
  - bật/tắt GNSS bằng `AT+CGNSPWR=1/0`.
  - đọc `+CGNSINF` và parse latitude/longitude/speed/course/satellites/timestamp.

**Ý nghĩa:** modem layer là giao diện duy nhất tới SIM7600; GNSS và LTE share cùng transport nhưng tách module.

### 3.4 MQTT transport và JSON payload
**Luồng:** `state_machine.c` → `mqtt_client.c` → `data_formatter.c`

- `main/src/mqtt_client.c`:
  - build topic theo `device_id`: `v1/{device_id}/rawdata`, `status`, `events`, `firmware`, `commands`.
  - connect broker bằng `mqtt://host:port`.
  - subscribe command topic khi `command_subscribe_enabled`.
  - publish payload theo QoS 0/1 tùy topic.
- `main/src/state_machine.c`:
  - gọi `data_format_rawdata()`, `data_format_status()`, `data_format_event()`, `data_format_firmware()` trước khi publish.
  - xử lý callback command từ MQTT bằng `state_machine_command_callback()`.

**Ý nghĩa:** `mqtt_client.c` là transport wrapper; format payload nằm riêng để giữ FSM không lẫn logic JSON.

### 3.5 Command / config / OTA
**Luồng:** MQTT command → `command_handler.c` → `state_machine.c` → `util.c` / NVS

- `main/src/command_handler.c`:
  - parse JSON command bằng cJSON.
  - hỗ trợ `update_config`, `request_location`, `enable_tracking`, `reboot`, `ota_update`, `manual_rollback`, `ota_rollback`.
  - `update_config` chỉ đổi `tracking_interval_s` và `heartbeat_interval_s`, sau đó gọi `nvs_config_save()`.
  - `ota_update` yêu cầu các trường camelCase: `jobId`, `version`, `url`, `size`, `sha256`; `force` và `confirmTimeoutSec` là optional.
- `main/src/state_machine.c`:
  - đọc action từ `command_handler_consume_action()`.
  - xử lý OTA update / rollback qua `command_handler_take_ota_command()` và `util_ota_apply_update()` / `util_ota_trigger_manual_rollback()`.
  - lưu OTA context vào `g_rtc_context` để confirm sau reboot.

**Ý nghĩa:** command handler chỉ parse và persist config; FSM mới là nơi chốt thực thi OTA/rollback/reboot.

### 3.6 BLE central + OBD adapter
**Luồng:** `ble_init.c` → `ble_mgr.c` → `ble_obd.c` → `state_machine.c`

- `main/src/ble_init.c`:
  - khởi tạo/đóng NimBLE host stack.
- `main/src/ble_mgr.c`:
  - scan, connect, service discovery, characteristic discovery, notification subscription.
  - có callback filter thiết bị và callback disconnect.
- `main/src/ble_obd.c`:
  - wrap BLE manager thành session OBD.
  - service UUID hard-coded `0x18f0`, TX `0x2af1`, RX `0x2af0`.
  - `ble_obd_rxtx()` gửi frame mode/PID, callback parse response mode+0x40.
  - `ble_obd_elm327_init()` gửi chuỗi khởi tạo ELM327.
- `main/src/state_machine.c`:
  - giữ `ble_obd_ctx_t *s_ble_ctx`.
  - ở `APP_STATE_CHECK_IGN` / `DRIVING` / `ALARM` gọi `state_machine_try_connect_ble()` và sample OBD PIDs.

**Ý nghĩa:** BLE OBD là nguồn dữ liệu phụ trợ cho ignition heuristic và telemetry runtime.

### 3.7 Sensor + vibration/ignition logic
**Luồng:** `imu_lis3dsh.c` → `state_machine.c`

- `main/src/imu_lis3dsh.c`:
  - init I2C trên `PIN_LIS3DSH_SDA/SCL`.
  - fallback sang I2C address `0x19` nếu `0x18` không trả WHO_AM_I `0x3F`.
  - `imu_configure_motion_interrupt(120, 200)` được gọi từ FSM để set wake interrupt.
  - `imu_get_vibration_composite()` đọc accel, tính magnitude, trừ 1g, scale về 0..1000.
- `main/src/state_machine.c`:
  - dùng `imu_get_vibration_composite()` trong telemetry.
  - dùng `imu_motion_detected()` để xử lý `APP_STATE_ALARM`.

**Ý nghĩa:** IMU cung cấp wake source và vibration score, không chỉ là sensor đọc raw.

## 4) Đối chiếu source hiện tại
### File/function cấp cao đã xác nhận
- Boot: `main/main.c::app_main()`
- Orchestrator: `main/src/state_machine.c::state_machine_init()`, `state_machine_run()`
- Power: `main/src/power_mgr.c::power_mgr_init()`, `power_get_status()`
- LTE: `main/src/modem_lte.c::modem_lte_init()`, `modem_lte_connect()`
- GNSS: `main/src/modem_gnss.c::modem_gnss_get_location()`
- MQTT: `main/src/mqtt_client.c::tracker_mqtt_init()`, `tracker_mqtt_publish_*()`
- Commands: `main/src/command_handler.c::command_handler_process()`
- BLE OBD: `main/src/ble_obd.c::ble_obd_connect()`, `ble_obd_rxtx()`
- IMU: `main/src/imu_lis3dsh.c::imu_init()`, `imu_configure_motion_interrupt()`

## 5) Điểm chắc chắn vs suy luận vs mơ hồ
### Chắc chắn
- `state_machine.c` là trung tâm điều phối.
- `mqtt_client.c`, `command_handler.c`, `ble_obd.c`, `modem_lte.c`, `modem_gnss.c`, `imu_lis3dsh.c` đều được build từ `main/CMakeLists.txt`.
- App dùng deep sleep và wake theo timer / motion interrupt.

### Suy luận
- Ignition heuristic là `obd_rpm > 0 || battery_top > 13.0f`, nên module coi charging voltage là một tín hiệu chạy máy.
- `command_handler.c` đang đóng vai trò bridge giữa cloud command và NVS persistence, dù chỉ một phần config được update runtime.
- `ble_obd.c` đang tối ưu cho adapter ELM327-compatible hơn là generic BLE profile.

### Mơ hồ
- Chi tiết board-level wiring thật sự của modem reset/status/DTR chưa có bằng chứng phần cứng trong source.
- Quy ước field GNSS và thời gian `+CGNSINF` cần vendor doc để xác nhận 100%.
- `imu_configure_motion_interrupt(120, 200)` là ngưỡng/độ dài được chọn trong code; chưa rõ tương ứng chính xác với baseline cơ khí thực tế của xe.

## 6) Nguồn tham khảo
### [Project Evidence]
- `iot-vehicle-tracking-system-firmware/main/main.c`
- `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`
- `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- `iot-vehicle-tracking-system-firmware/main/inc/app_state.h`
- `iot-vehicle-tracking-system-firmware/main/inc/app_config.h`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `iot-vehicle-tracking-system-firmware/main/src/power_mgr.c`
- `iot-vehicle-tracking-system-firmware/main/src/adc_reader.c`
- `iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
- `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- `iot-vehicle-tracking-system-firmware/main/src/modem_gnss.c`
- `iot-vehicle-tracking-system-firmware/main/src/mqtt_client.c`
- `iot-vehicle-tracking-system-firmware/main/src/command_handler.c`
- `iot-vehicle-tracking-system-firmware/main/src/ble_init.c`
- `iot-vehicle-tracking-system-firmware/main/src/ble_mgr.c`
- `iot-vehicle-tracking-system-firmware/main/src/ble_obd.c`
- `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c`

### [Vendor/Official/Community]
- [Official ESP-IDF docs] `esp_sleep`, `esp_ota_*`, `nvs_flash`, UART/I2C/SDMMC/FATFS, watchdog: https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/index.html
- [Vendor SIMCom] `documents/hardware-specs/components/modem/sim7600-series-at-command-manual-v2.00.pdf`, `documents/hardware-specs/components/modem/sim7600ce-hardware-design-v1.04.pdf`, portal: https://www.simcom.com/technical_files.html
- [Vendor ST] `documents/hardware-specs/components/imu/lis3dsh-datasheet.pdf` + đối chiếu LIS3DH: https://www.st.com/resource/en/datasheet/lis3dh.pdf
- [Vendor/Standard OBD] ELM327 DS: https://www.elmelectronics.com/wp-content/uploads/2016/07/ELM327DS.pdf ; SAE J1979/J1979-DA listings: https://saemobilus.sae.org/standards/j1979_202505-e-e-diagnostic-test-modes
- [Community] TinyGSM: https://github.com/vshymanskyy/TinyGSM ; SIM7600 field issues: https://github.com/Xinyuan-LilyGO/LilyGo-Modem-Series/issues
