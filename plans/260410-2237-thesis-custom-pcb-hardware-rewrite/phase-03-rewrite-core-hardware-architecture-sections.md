# Phase 03 — Rewrite core hardware architecture sections

## Context links
- [Plan overview](./plan.md)
- [Phase 02](./phase-02-thesis-hardware-scope-mapping-and-error-catalog.md)
- [Main schematic](../../iot-vehicle-tracking-system-hardware/Main-Schematic.SchDoc)
- [Power sheet](../../iot-vehicle-tracking-system-hardware/Power.SchDoc)
- [ESP32S3 sheet](../../iot-vehicle-tracking-system-hardware/ESP32S3.SchDoc)
- [SIM7600CE sheet](../../iot-vehicle-tracking-system-hardware/SIM7600CE.SchDoc)
- [LIS3DH sheet](../../iot-vehicle-tracking-system-hardware/LIS3DH.SchDoc)

## Overview
- Priority: P0
- Status: Planned
- Goal: Viết lại phần mô tả kiến trúc hardware cốt lõi đúng theo PCB tự thiết kế.

## Key insights
- Điểm bắt buộc: nhấn mạnh tracker là bo mạch tích hợp tự thiết kế, không phải lắp ghép dev boards.
- Ngoại lệ cần ghi rõ: adapter OBD2 BLE là thiết bị ngoại vi bên ngoài, không phải khối trên PCB.

## Requirements
### Functional
1. Sửa lại narrative phần “kiến trúc tổng thể” và “sơ đồ khối phần cứng”.
2. Đồng bộ mô tả liên kết tín hiệu chính: UART MCU↔SIM7600CE, I2C MCU↔LIS3DSH, GPIO interrupt, ADC battery.
3. Chuẩn hóa cách gọi các khối power rails (5V, 4V modem, 3.3V MCU, charger/backup).

### Non-functional
- Văn phong kỹ thuật nhất quán VN/EN thuật ngữ.
- Không làm hỏng label/ref/caption hiện có.

## Architecture
- Rewrite theo cấu trúc: tổng quan hệ thống → khối MCU → khối modem → khối IMU → khối nguồn.
- Mỗi đoạn phải có dấu vết kiểm chứng từ schematic/netlist.

## Related code files
### Modify
- `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`

## Implementation steps
1. Sửa section kiến trúc tổng thể (chương 3 và chương 4 phần hardware intro).
2. Sửa các đoạn mô tả “module” gây hiểu sai sang “khối phần cứng/khối chức năng”.
3. Sửa mô tả giao tiếp và power path theo đúng sơ đồ.
4. Rà nhanh caption hình 3.x/4.x liên quan.

## Todo list
- [ ] Rewrite phần kiến trúc hardware ở chương 3
- [ ] Rewrite phần triển khai hardware intro ở chương 4
- [ ] Chuẩn hóa thuật ngữ module/khối
- [ ] Soát caption hình liên quan

## Success criteria
- Người đọc hiểu rõ đây là custom PCB integrated design.
- Không còn mô tả lệch thành tư duy “mua module rời ghép lại”.

## Risk assessment
- Rủi ro: sửa narrative lớn có thể lệch với hình hiện có.
- Giảm thiểu: so khớp caption từng hình ngay sau khi rewrite đoạn tương ứng.

## Security considerations
- N/A cho nội dung thesis hardware.

## Next steps
- Sang Phase 04 xử lý phần BOM/triển khai/test liên quan hardware.
