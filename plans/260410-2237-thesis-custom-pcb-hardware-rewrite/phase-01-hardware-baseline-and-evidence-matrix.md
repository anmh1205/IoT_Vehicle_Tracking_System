# Phase 01 — Hardware baseline and evidence matrix

## Context links
- [Plan overview](./plan.md)
- [Thesis LaTeX](../../resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex)
- [Hardware project](../../iot-vehicle-tracking-system-hardware/iot-vehicle-tracking-system-main.PrjPcb)
- [Netlist](../../iot-vehicle-tracking-system-hardware/Documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET)
- [Hardware specs index](../../iot-vehicle-tracking-system-hardware/Documents/hardware-specs/index/hardware-specs-index.md)

## Overview
- Priority: P0
- Status: Planned
- Goal: Chốt “single source of truth” phần cứng trước khi sửa thesis.

## Key insights
- Main board là PCB tự thiết kế, có project Altium đầy đủ (`*.PrjPcb`, `*.SchDoc`, `*.PcbDoc`).
- Netlist xác nhận linh kiện tích hợp trực tiếp trên board: ESP32-S3, SIM7600CE, LIS3DSH, DS3231M, W25Q128, AP2112, MP2482, TPS54231, TP4056, SX1308.
- OBD2 vgate iCar Pro là ngoại vi BLE ngoài thiết bị tracker (không nằm trong PCB chính).

## Requirements
### Functional
1. Lập bảng mapping “claim hardware trong thesis ↔ chứng cứ hardware”.
2. Chuẩn hóa thuật ngữ: “khối phần cứng” vs “module phần mềm”.
3. Đánh dấu claim thiếu chứng cứ A-level.

### Non-functional
- Bảng mapping phải truy vết nhanh theo keyword + line/range trong thesis.
- Không sửa nội dung thesis ở phase này (chỉ baseline bằng chứng).

## Architecture
- Input A: Altium artifacts (schematic sheets + pcbdoc)
- Input B: Netlist/BOM export
- Input C: Hardware datasheets index
- Output: Evidence matrix dùng xuyên suốt Phase 2–5

## Related code files
### Modify
- `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex` (phase sau)

### Create
- `reports/hardware-evidence-matrix.md` (trong plan folder)

## Implementation steps
1. Liệt kê các khối phần cứng từ schematic: Power, ESP32S3, SIM7600CE, LIS3DH, Main integration.
2. Trích danh sách part chính từ netlist để khóa danh pháp linh kiện.
3. Tạo evidence matrix theo cột: `thesis-claim`, `current-text-location`, `hardware-proof`, `status`.
4. Gắn trust level theo `hardware-specs-index.md`.
5. Freeze baseline để dùng cho rewrite.

## Todo list
- [ ] Trích part list lõi từ netlist
- [ ] Chuẩn hóa tên khối phần cứng theo schematic sheet
- [ ] Tạo evidence matrix bản đầu
- [ ] Chốt danh sách claim thiếu bằng chứng

## Success criteria
- Có evidence matrix dùng được cho mọi chỉnh sửa ở phase sau.
- Không còn mơ hồ giữa linh kiện tích hợp PCB và thiết bị ngoại vi.

## Risk assessment
- Rủi ro: đồng nhất thuật ngữ không tốt gây nhiễu giữa hardware/software module.
- Giảm thiểu: đặt glossary ngắn và cưỡng chế dùng nhất quán trong phase rewrite.

## Security considerations
- Không liên quan trực tiếp bảo mật hệ thống; tập trung tính đúng kỹ thuật và truy vết nguồn.

## Next steps
- Chuyển sang Phase 02 để rà soát toàn file thesis và catalog lỗi theo mức độ.
