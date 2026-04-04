# Firmware Architecture Overview

Bản tóm tắt kiến trúc runtime cho firmware ESP32-S3 của dự án. Nội dung này ưu tiên giúp dev hiểu nhanh luồng khởi động, các boundary module, và điểm rủi ro khi thay đổi.

## Tóm tắt một dòng
Firmware hiện tại là một ứng dụng ESP-IDF đơn khối với một state machine trung tâm điều phối power, modem, GNSS, IMU, BLE OBD, MQTT, OTA và sleep.

## Kiến trúc cấp cao
```text
app_main()
  -> NVS / config load
  -> wakeup cause detect
  -> state_machine_init()
  -> state_machine_run()
```

## Các boundary chính
### 1) Boot boundary
- `app_main()` chỉ làm init, xác định trạng thái ban đầu, rồi chuyển cho FSM.
- Không có service layer lớn bên trên FSM.
- Đây là điểm tốt cho simplicity, nhưng khi thêm feature cần tránh nhồi logic vào `app_main()`.

### 2) Orchestration boundary
- `main/src/state_machine.c` là trung tâm runtime.
- Module này ghép:
  - power manager
  - modem LTE / GNSS
  - BLE OBD
  - IMU motion
  - MQTT publish/subscribe
  - OTA command handling
  - deep sleep transitions
- `g_rtc_context` giữ thông tin qua deep sleep.

### 3) Hardware boundary
- `main/inc/pin_map.h` là nguồn truth cho GPIO mapping trong firmware.
- Một số modem side-band pins trên board có dấu hiệu tồn tại trong netlist nhưng vẫn `GPIO_NUM_NC` trong firmware.
- Đừng nâng mức tin cậy của mapping lên confirmed nếu chưa bench test.

## Data flow chính
### Telemetry path
1. ADC đọc battery.
2. IMU đọc vibration / motion.
3. BLE OBD đọc data xe nếu connected.
4. GNSS lấy location.
5. State machine format payload.
6. MQTT publish sang cloud.

### Command path
1. Cloud gửi command qua MQTT.
2. MQTT client chuyển callback cho command handler.
3. Command handler parse JSON và cập nhật action/config.
4. State machine thực thi reboot / OTA / rollback / tracking change.

### Sleep path
1. Snapshot trạng thái quan trọng vào RTC context.
2. Tắt BLE / GNSS / LTE.
3. Power off modem và chọn backup power.
4. Config wake source.
5. Deep sleep.

## Những phần quan trọng nhất khi thay đổi
### Power / modem
- Luồng bật modem phải giữ thứ tự.
- `PWR-KEY`, rail settle, AT probe, SIM ready, registration, PDP là chuỗi phụ thuộc.
- Nếu đổi sequencing, cần test current draw và boot success rate.

### IMU
- Có rủi ro nhầm **LIS3DSH** với **LIS3DH** trong tài liệu. Nếu đổi sensor, phải xác nhận part thật trước khi sửa register flow hoặc wake threshold.
- IMU không chỉ là sensor raw; nó còn là wake source.

### OTA
- SHA-256 verify phải xong trước khi set boot partition.
- RTC context cần giữ confirm state qua reboot.
- Nếu đổi flow reboot/sleep, dễ làm rollback sai.

### MQTT / command
- Topic contract phải giữ ổn định để backend và device không lệch nhịp.
- Command payload field case phải thống nhất.

## Mức độ chắc chắn
| Chủ đề | Certainty | Lý do |
|---|---|---|
| Boot -> FSM | Cao | Source evidence rõ |
| NVS / RTC / OTA | Cao | Source evidence rõ |
| Modem power sequence | Trung bình-khá | Source rõ nhưng cần bench verify timing/polarity |
| IMU mapping | Trung bình-khá | Source rõ nhưng part-name mismatch vẫn là rủi ro |
| Side-band modem pins | Trung bình | Netlist thấy có, firmware chưa map hết |

## Tài liệu liên quan
- [README](./README.md)
- [Getting started](./getting_started_for_firmware_devs.md)
- [Glossary](./glossary.md)
- [01_project_analysis/firmware_component_map.md](./01_project_analysis/firmware_component_map.md)
- [02_hardware_mapping/hardware_firmware_crosscheck.md](./02_hardware_mapping/hardware_firmware_crosscheck.md)
- [04_modem_gnss/sim7600_power_and_boot_sequence.md](./04_modem_gnss/sim7600_power_and_boot_sequence.md)
- [05_imu/lis3dsh_vs_lis3dh_comparison.md](./05_imu/lis3dsh_vs_lis3dh_comparison.md)

## Rule of thumb
Nếu bạn chưa chắc thay đổi thuộc layer nào, hãy xác định trước:
- đây là boot issue,
- power issue,
- modem issue,
- IMU issue,
- hay command/OTA issue.

Xác định đúng boundary thường cứu rất nhiều thời gian debug.
