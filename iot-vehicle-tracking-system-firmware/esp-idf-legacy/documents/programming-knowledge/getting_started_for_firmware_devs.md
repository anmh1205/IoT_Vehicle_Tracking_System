# Getting Started for Firmware Developers

Hướng dẫn khởi đầu ngắn cho dev firmware mới hoặc dev feature vừa chạm vào ESP32-S3 firmware của dự án.

## Mục tiêu
Sau khi đọc trang này, bạn nên biết:
- firmware khởi động từ đâu,
- module nào chịu trách nhiệm phần nào,
- đọc tài liệu nào trước khi sửa code,
- và chỗ nào có rủi ro cao nhất.

## 5 bước đọc nhanh
1. Đọc [README](./README.md) để hiểu scope và mức độ hoàn thiện.
2. Đọc [Glossary](./glossary.md) để thống nhất thuật ngữ.
3. Đọc [Architecture overview](./architecture_overview.md) để nắm flow runtime.
4. Nếu đụng hardware, mở [hardware_firmware_crosscheck.md](./02_hardware_mapping/hardware_firmware_crosscheck.md).
5. Nếu đụng modem hoặc IMU, mở đúng trang chuyên ngành trước khi sửa gì.

## Theo vai trò
### Dev mới
Nên đọc theo thứ tự:
- README
- Getting started
- Glossary
- Architecture overview
- Project analysis

Mục tiêu là hiểu hệ thống trước khi đi vào chi tiết kỹ thuật.

### Dev feature
Chọn theo feature:
- Boot / NVS / OTA / sleep: nhóm `03_esp32s3_esp_idf`
- Power / modem / GNSS: nhóm `04_modem_gnss`
- Motion wake / vibration / sensor init: nhóm `05_imu`
- Pin / wiring / board mismatch: nhóm `02_hardware_mapping`

### Dev debug / integration
Ưu tiên đọc:
- [hardware_firmware_crosscheck.md](./02_hardware_mapping/hardware_firmware_crosscheck.md)
- [unresolved_hardware_questions.md](./02_hardware_mapping/unresolved_hardware_questions.md)
- [sim7600_debugging_and_failures.md](./04_modem_gnss/sim7600_debugging_and_failures.md)
- [imu_validation_checklist.md](./05_imu/imu_validation_checklist.md)

## Hai rủi ro lớn nhất
### 1) LIS3DSH vs LIS3DH
Tên sensor gần giống nhau nhưng không nên coi là cùng part nếu chưa kiểm tra kỹ.
- Nếu part name lệch, register map, WHO_AM_I, interrupt config, và datasheet assumptions có thể lệch theo.
- Trước khi sửa driver IMU, hãy xác nhận part thực tế trong tài liệu và trên board.

### 2) Modem power sequence
Đừng đổi thứ tự bật/tắt modem theo cảm tính.
Chuỗi cần nhớ:
- power safe state
- `PWR-KEY` pulse
- rail settle
- AT init / probe
- SIM ready
- registration poll
- PDP activate
- online

Nếu sửa sai chuỗi này, lỗi có thể là modem không boot, attach fail, hoặc current draw bất thường.

## Những gì hiện tại có độ chắc chắn cao
- Boot vào `app_main()` rồi vào state machine.
- NVS có cơ chế load + self-heal.
- OTA có verify hash và confirm sau reboot.
- MQTT / command flow đã có cấu trúc rõ.
- IMU là wake source cho deep sleep.

## Những gì còn cần bench test
- Exact MCU GPIO cho modem side-band pins.
- Polarity và pulse width thực tế của modem control lines.
- Current draw trước/sau sleep.
- Mức ổn định của motion wake trên phần cứng thật.

## Khi bạn sắp sửa code
Trước khi đổi bất kỳ file nào, tự hỏi:
- thay đổi này ảnh hưởng boot path hay runtime path?
- có đụng power rail hoặc modem sequence không?
- có đụng pin map không?
- có phải đổi docs ngay không?

Nếu câu trả lời là có, cập nhật tài liệu cùng lúc để tránh lệch source-of-truth.

## Tài liệu nên mở ngay
- [README](./README.md)
- [Architecture overview](./architecture_overview.md)
- [Project analysis inventory](./01_project_analysis/inventory_project_structure.md)
- [Firmware component map](./01_project_analysis/firmware_component_map.md)
- [SIM7600 power and boot sequence](./04_modem_gnss/sim7600_power_and_boot_sequence.md)
- [LIS3DSH vs LIS3DH comparison](./05_imu/lis3dsh_vs_lis3dh_comparison.md)

## Rule of thumb
Nếu bạn chỉ nhớ 3 điều:
- hiểu boundary trước khi sửa,
- giữ modem power sequence đúng,
- xác nhận đúng IMU part trước khi sửa sensor code.
