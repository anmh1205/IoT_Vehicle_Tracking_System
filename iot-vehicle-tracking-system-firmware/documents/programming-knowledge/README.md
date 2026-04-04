# Firmware Programming Knowledge Hub

Tài liệu trung tâm để tra cứu nhanh các ghi chú kỹ thuật cho firmware ESP32-S3 của dự án. Nội dung được tổng hợp từ các thư mục con `01_...` đến `08_...` trong `documents/programming-knowledge/`.

## Mục tiêu
- Giúp dev mới đọc đúng thứ tự.
- Giúp dev feature tìm đúng vùng liên quan nhanh.
- Giúp dev debug/integration khoanh vùng lỗi theo subsystem.
- Ghi rõ mức độ hoàn thiện và độ chắc chắn của từng nhóm tài liệu.

## Mức độ hoàn thiện
| Mục | Trạng thái |
|---|---|
| Nguồn tổng hợp hiện có | Hoàn chỉnh cho các nhóm `01` đến `08` |
| Phần 06..08 | Đã có đầy đủ tài liệu storage/rtc/validation |
| Độ chắc chắn tổng thể | Cao cho runtime/source; trung bình cho các mapping cần bench test phần cứng |

## Điểm cần nhớ trước khi đọc
- Đây là tài liệu hướng dẫn tra cứu, không phải API reference đầy đủ.
- Một số claim là **project inference** từ source + netlist, không phải xác nhận bằng đo đạc phần cứng.
- Hai rủi ro lớn cần giữ trong đầu:
  1. **LIS3DSH vs LIS3DH**: source/docs hiện có dấu hiệu lệch tên sensor giữa ghi chú và code, cần kiểm tra đúng part trước khi chốt thay đổi.
  2. **Modem power sequence**: chuỗi `PWR-KEY`, rail settle, DTR, AT probe, registration, PDP phải giữ đúng thứ tự.

## Cách đọc theo vai trò
### 1) Dev mới
Đọc theo thứ tự này:
1. [getting_started_for_firmware_devs.md](./getting_started_for_firmware_devs.md)
2. [glossary.md](./glossary.md)
3. [architecture_overview.md](./architecture_overview.md)
4. Mở từng nhóm con:
   - `01_project_analysis/`
   - `02_hardware_mapping/`
   - `03_esp32s3_esp_idf/`
   - `04_modem_gnss/`
   - `05_imu/`

### 2) Dev feature
Đọc theo mục tiêu tính năng:
- Power / sleep / battery: `02_hardware_mapping/`, `04_modem_gnss/`
- ESP-IDF runtime / boot / OTA: `03_esp32s3_esp_idf/`
- IMU / motion wake: `05_imu/`
- Cross-check mapping trước khi đổi pin hoặc flow: `02_hardware_mapping/hardware_firmware_crosscheck.md`

### 3) Dev debug / integration
Ưu tiên:
- `architecture_overview.md`
- `02_hardware_mapping/hardware_firmware_crosscheck.md`
- `02_hardware_mapping/unresolved_hardware_questions.md`
- `04_modem_gnss/sim7600_debugging_and_failures.md`
- `05_imu/imu_validation_checklist.md`

## Điều hướng nhanh
- [Index](./index.md)
- [Glossary](./glossary.md)
- [Architecture overview](./architecture_overview.md)
- [Getting started](./getting_started_for_firmware_devs.md)

## Nguồn tổng hợp
- `01_project_analysis/`: cấu trúc project, component map, assumptions
- `02_hardware_mapping/`: netlist, pin map, mismatch, câu hỏi chưa xác nhận
- `03_esp32s3_esp_idf/`: boot/runtime, OTA, NVS, sleep, pitfalls, best practices
- `04_modem_gnss/`: SIM7600CE, AT flow, power boot sequence, GNSS, failure modes
- `05_imu/`: LIS3DSH programming, register flow, driver notes, validation checklist
- `06_storage/`: W25Q128JV + SDMMC 4-bit + FATFS guideline và pitfalls
- `07_rtc/`: DS3231M programming guide, register reference, driver design notes
- `08_validation/`: source matrix, claim audit, quality report, open questions

## Ghi chú độ tin cậy
- **High**: module runtime đã đối chiếu source rõ ràng.
- **Medium**: pin map / board routing còn cần bench test.
- **Low**: claim phụ thuộc vào phần cứng chưa trace hoặc chưa đo dòng/logic level.

## Lưu ý bảo trì
Khi thêm/chỉnh sửa tài liệu theo module mới, cập nhật lại README này và `index.md` để giữ đường đọc không đứt mạch.
