# Programming Knowledge Index

Trang mục lục để tra cứu nhanh toàn bộ tài liệu kỹ thuật firmware. Dùng trang này như entry point nếu bạn chưa biết bắt đầu từ đâu.

## Tình trạng phạm vi

- Đã có nội dung tổng hợp cho: `01_project_analysis` đến `08_validation`
- Đã có đầy đủ các thư mục `06_storage`, `07_rtc`, `08_validation`
- Độ chắc chắn cao ở phần runtime/source; trung bình ở phần wiring phần cứng chưa bench test

## Điều hướng nhanh theo vai trò

### Dev mới

1. [README](./README.md)
2. [Getting started](./getting_started_for_firmware_devs.md)
3. [Glossary](./glossary.md)
4. [Architecture overview](./architecture_overview.md)

### Dev muốn tự code lại từ đầu

- [Build From Scratch](./build-from-scratch/README.md) — tutorial tuyến tính dựng lại toàn bộ firmware theo từng lớp (component), mỗi bước build được.

### Dev feature

- Thay đổi boot/runtime/OTA/NVS: `03_esp32s3_esp_idf/`
- Thay đổi modem/GNSS/power: `04_modem_gnss/`
- Thay đổi motion wake/IMU: `05_imu/`
- Rà lại mapping phần cứng trước khi đổi pin: `02_hardware_mapping/`

### Dev debug / integration

- [Hardware / firmware cross-check](./02_hardware_mapping/hardware_firmware_crosscheck.md)
- [Unresolved hardware questions](./02_hardware_mapping/unresolved_hardware_questions.md)
- [SIM7600 debugging and failures](./04_modem_gnss/sim7600_debugging_and_failures.md)
- [IMU validation checklist](./05_imu/imu_validation_checklist.md)

## Mục lục theo nhóm

### 01. Project analysis

- `inventory_project_structure.md` — cấu trúc firmware thực tế
- `firmware_component_map.md` — map tương tác giữa các module
- `undocumented_assumptions.md` — giả định còn thiếu bằng chứng

### 02. Hardware mapping

- `netlist_parsed_summary.md` — tổng hợp netlist đã parse
- `hardware_pin_mapping.md` — pin map và tín hiệu liên quan
- `hardware_firmware_crosscheck.md` — so khớp phần cứng với firmware
- `unresolved_hardware_questions.md` — câu hỏi chưa xác nhận trên board thật

### 03. ESP32-S3 + ESP-IDF

- `esp32s3_esp_idf_programming_guide.md` — guide boot/runtime tổng quan
- `esp_idf_project_architecture.md` — kiến trúc runtime và boundary
- `esp_idf_best_practices.md` — best practices theo code hiện tại
- `esp_idf_common_pitfalls.md` — lỗi hay gặp và cách tránh

### 04. Modem + GNSS

- `sim7600_overview.md` — tổng quan modem và phân loại claim
- `sim7600_at_command_architecture.md` — kiến trúc AT command
- `sim7600_power_and_boot_sequence.md` — chuỗi bật/tắt nguồn và recovery
- `sim7600_gnss_guide.md` — GNSS flow và điểm cần test
- `sim7600_driver_design_for_esp_idf.md` — thiết kế driver theo ESP-IDF
- `sim7600_debugging_and_failures.md` — failure matrix và debug path

### 05. IMU

- `lis3dsh_programming_guide.md` — hướng dẫn dùng sensor
- `lis3dsh_register_walkthrough.md` — walkthrough register
- `lis3dsh_vs_lis3dh_comparison.md` — rủi ro nhầm part LIS3DSH/LIS3DH
- `imu_driver_design_notes.md` — thiết kế driver và state integration
- `imu_validation_checklist.md` — checklist test trên hardware

### 06. Storage

- `w25q128jv_guide.md` — hướng dẫn flash W25Q128JV
- `flash_memory_usage_notes.md` — ghi chú dùng flash trong dự án
- `microsd_sdmmc_4bit_guide.md` — hướng dẫn SDMMC 4-bit
- `sdmmc_esp32s3_pitfalls.md` — lỗi thường gặp SDMMC trên ESP32-S3
- `storage_debugging_checklist.md` — checklist debug storage

### 07. RTC

- `ds3231m_programming_guide.md` — hướng dẫn DS3231M
- `ds3231m_register_reference.md` — bảng register DS3231M
- `rtc_driver_design_notes.md` — notes thiết kế driver RTC

### 08. Validation

- `source_matrix.md` — ma trận nguồn và mức tin cậy
- `claims_requiring_attention.md` — claim cần rà soát
- `documentation_quality_report.md` — báo cáo chất lượng tài liệu
- `open_questions_and_validation_needed.md` — câu hỏi mở và bài test cần làm

## Rủi ro cần đọc sớm

- Sensor naming mismatch: LIS3DSH vs LIS3DH
- Modem power sequence sai thứ tự
- Pin map firmware có thể chưa bao phủ toàn bộ signal trên netlist

## Độ hoàn thiện / certainty

| Nhóm                  | Hoàn thiện     | Certainty      |
| --------------------- | -------------- | -------------- |
| 01 Project analysis   | Cao            | Cao            |
| 02 Hardware mapping   | Trung bình-khá | Trung bình     |
| 03 ESP32-S3 + ESP-IDF | Cao            | Cao            |
| 04 Modem + GNSS       | Cao            | Trung bình-khá |
| 05 IMU                | Cao            | Trung bình-khá |
| 06 Storage            | Cao            | Trung bình-khá |
| 07 RTC                | Khá            | Trung bình     |
| 08 Validation         | Cao            | Cao            |

## Nếu bạn chỉ có 10 phút

- Đọc `getting_started_for_firmware_devs.md`
- Đọc `architecture_overview.md`
- Nếu làm hardware change, mở ngay `02_hardware_mapping/hardware_firmware_crosscheck.md`
- Nếu làm modem change, mở ngay `04_modem_gnss/sim7600_power_and_boot_sequence.md`
- Nếu làm IMU change, mở ngay `05_imu/lis3dsh_vs_lis3dh_comparison.md`
