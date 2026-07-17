# Undocumented Assumptions

**Cập nhật lần cuối:** 2026-04-04  
**Mục tiêu:** liệt kê các giả định đang nằm trong code nhưng chưa được chứng minh đầy đủ bằng tài liệu vendor/official/community.

## 1) Mục đích
Tài liệu này giúp dev/debugger nhìn thấy những chỗ code đang “ngầm tin” vào phần cứng, modem, giao thức, hoặc dữ liệu cloud. Đây là nơi ghi rõ giả định nào chắc, giả định nào chỉ là suy luận, và giả định nào còn mơ hồ.

## 2) Phạm vi áp dụng trong dự án này
Chỉ áp dụng cho firmware ESP32-S3 trong `iot-vehicle-tracking-system-firmware/main/`. Không mở rộng sang backend hay PCB, trừ khi giả định đó ảnh hưởng trực tiếp tới firmware runtime.

## 3) Danh sách giả định chưa được tài liệu hóa đầy đủ

| ID | Giả định | Bằng chứng trong source | Mức độ | Rủi ro nếu sai |
|---|---|---|---|---|
| A01 | Board có resistor divider pin `PIN_U_BATT_ADC` dùng tỉ lệ cố định `11.0f` | `main/src/adc_reader.c` | Suy luận | Sai điện áp pin, sai low-voltage decision |
| A02 | Modem SIM7600CE chấp nhận chuỗi `AT`, `ATE0`, `AT+CPIN?`, `AT+CNMP=2`, `AT+CGDCONT=1,...` | `main/src/modem_lte.c` | Chắc về code, mơ hồ về vendor timing | LTE init fail trên firmware/firmware variant khác |
| A03 | `+CEREG: n,stat` chỉ cần stat `1` hoặc `5` để coi là registered | `main/src/modem_lte.c` | Suy luận | Có thể bỏ qua trạng thái đăng ký khác nhưng vẫn usable |
| A04 | APN mặc định `"internet"` phù hợp đủ rộng cho runtime mặc định | `main/src/modem_lte.c`, `main/src/nvs_config.c` | Suy luận | Không attach mạng nếu carrier khác APN |
| A05 | `PIN_MODEM_RESET`, `PIN_MODEM_DTR`, `PIN_MODEM_STATUS`, `PIN_MODEM_NETLIGHT` có thể để `GPIO_NUM_NC` mà firmware vẫn chạy | `main/inc/pin_map.h`, `main/src/power_mgr.c`, `main/src/modem_lte.c` | Chắc về code | Mất khả năng power/reset/monitor đầy đủ nếu board có dây nhưng map sai |
| A06 | SIM slot đã có SIM hợp lệ trước khi vào LTE init | `main/src/modem_lte.c::modem_lte_init()` | Suy luận | `AT+CPIN?` fail, modem không connect |
| A07 | GNSS parser dựa vào `+CGNSINF` field order và timestamp `YYYYMMDDhhmmss.xxx` | `main/src/modem_gnss.c` | Mơ hồ | Sai location/time nếu modem firmware trả format khác |
| A08 | `modem_gnss_get_location()` chỉ hoạt động sau khi `modem_gnss_power_on()` đã thành công | `main/src/modem_gnss.c` | Chắc về code | Call sai thứ tự sẽ trả lỗi trạng thái |
| A09 | OBD adapter là ELM327-compatible, service UUID `0x18f0`, TX `0x2af1`, RX `0x2af0` | `main/src/ble_obd.c` | Suy luận | Không kết nối được nếu adapter dùng profile khác |
| A10 | OBD response có dạng mode + 0x40 và PID theo byte 2 | `main/src/ble_obd.c` | Suy luận | Parse sai nếu adapter trả frame khác chuẩn |
| A11 | Ignition heuristic `obd_rpm > 0 || battery_top > 13.0f` đủ tin cậy cho phân state `DRIVING`/`PARKED` | `main/src/state_machine.c` | Suy luận | Dễ nhầm khi engine off nhưng đang sạc hoặc voltage spike |
| A12 | `imu_configure_motion_interrupt(120, 200)` là ngưỡng phù hợp cho xe thực tế | `main/src/state_machine.c`, `main/src/imu_lis3dsh.c` | Mơ hồ | Wake quá nhạy hoặc quá trễ |
| A13 | MQTT broker URL luôn có dạng `mqtt://host:port` | `main/src/mqtt_client.c` | Chắc về code | Không hỗ trợ `mqtts://` nếu cần TLS mà không sửa code |
| A14 | Command JSON fields dùng camelCase cho OTA và snake_case cho config update | `main/src/command_handler.c` | Chắc về code, nhưng chưa doc | Cloud payload sai case sẽ bị reject/ngầm bỏ qua |
| A15 | `request_location` và `enable_tracking` là command hợp lệ nhưng không có schema public kèm theo trong firmware | `main/src/command_handler.c` | Mơ hồ | Cloud gửi payload khác format sẽ không hoạt động |
| A16 | `state_machine_try_connect_network()` không kiểm tra return value của `modem_lte_init()` / `modem_lte_connect()` / `tracker_mqtt_connect()` nên lỗi có thể bị che | `main/src/state_machine.c` | Chắc về code | Lỗi network khó thấy sớm, fallback muộn |

## 4) Đối chiếu source hiện tại
### Nhóm power / ADC
- `main/src/adc_reader.c` dùng `ADC_CHANNEL_3`, `ADC_ATTEN_DB_12`, `ADC_DIVIDER_RATIO 11.0f` và trung bình `ADC_SAMPLES 8`.
- `main/src/power_mgr.c` latch low-voltage bằng `s_voltage_low_latched` + pin `PIN_LVD_STATUS`.
- `main/src/state_machine.c` dùng `s_telemetry.battery_top > 13.0f` như một proxy ignition.

### Nhóm modem / GNSS
- `main/src/modem_lte.c` hard-code APN từ `CONFIG_TRACKER_MODEM_APN` fallback là `"internet"`.
- `main/src/modem_lte.c::modem_lte_cereg_registered()` chỉ chấp nhận `1` hoặc `5`.
- `main/src/modem_gnss.c` parse `+CGNSINF`, aggregate satellites từ field 14/15.

### Nhóm BLE / OBD
- `main/src/ble_obd.c` hard-code service UUID `0x18f0` và characteristic UUID `0x2af1/0x2af0`.
- `main/src/ble_obd.c::ble_obd_notify_cb()` coi `>` là prompt, `?` là parse error.
- `main/src/state_machine.c` nối OBD data vào telemetry qua `ble_obd_rxtx()`.

### Nhóm command / OTA / MQTT
- `main/src/command_handler.c` yêu cầu `jobId`, `version`, `url`, `size`, `sha256` cho OTA update.
- `main/src/mqtt_client.c` build topic theo `v1/{device_id}/...` và chỉ dùng `mqtt://`.
- `main/src/state_machine.c` gọi `command_handler_take_ota_command()` rồi mới thực thi OTA / rollback.

## 5) Điểm chắc chắn vs suy luận vs mơ hồ
### Chắc chắn
- Các giả định trên đều phản ánh đúng source hiện tại; không phải đoán ngẫu nhiên.
- Một số giả định là explicit default trong code, ví dụ APN, ngưỡng hysteresis, command schema.

### Suy luận
- Nhiều giá trị là “fit for current hardware” chứ chưa chứng minh là giá trị tối ưu.
- Một số logic là heuristic operational, không phải invariant giao thức.

### Mơ hồ
- Bằng chứng vendor/official/community chưa được tra cứu nên chưa thể chốt các con số thời gian, ngưỡng interrupt, và frame parse là chuẩn 100%.
- Các chân `GPIO_NUM_NC` có thể là board variant, hoặc có thể là phần cứng bỏ trống; source chưa đủ để phân biệt.

## 6) Nguồn tham khảo
### [Project Evidence]
- `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- `iot-vehicle-tracking-system-firmware/main/inc/app_config.h`
- `iot-vehicle-tracking-system-firmware/main/src/adc_reader.c`
- `iot-vehicle-tracking-system-firmware/main/src/power_mgr.c`
- `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
- `iot-vehicle-tracking-system-firmware/main/src/modem_gnss.c`
- `iot-vehicle-tracking-system-firmware/main/src/ble_obd.c`
- `iot-vehicle-tracking-system-firmware/main/src/command_handler.c`
- `iot-vehicle-tracking-system-firmware/main/src/mqtt_client.c`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c`
- `iot-vehicle-tracking-system-firmware/main/src/nvs_config.c`

### [Vendor/Official/Community]
- [Official ESP-IDF docs] deep sleep, UART, NVS, OTA, watchdog, peripheral APIs: https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/
- [Vendor SIMCom] AT + hardware design docs trong `documents/hardware-specs/components/modem/` và official portal: https://www.simcom.com/technical_files.html
- [Vendor ST] LIS3DSH datasheet: `documents/hardware-specs/components/imu/lis3dsh-datasheet.pdf` (link hãng: https://www.st.com/resource/en/datasheet/lis3dsh.pdf)
- [Vendor RTC/Flash] DS3231M datasheet (`documents/hardware-specs/components/rtc/ds3231m-datasheet.pdf`), W25Q128JV datasheet (`documents/hardware-specs/components/flash/w25q128jv-datasheet.pdf`)
- [OBD references] ELM327 datasheet + AT commands: https://www.elmelectronics.com/wp-content/uploads/2016/07/ELM327DS.pdf ; https://www.elmelectronics.com/ELM327/AT_Commands.pdf
