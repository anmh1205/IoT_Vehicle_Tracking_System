# Phase 04 — Rewrite implementation, BOM, and hardware-test sections

## Context links
- [Plan overview](./plan.md)
- [Phase 03](./phase-03-rewrite-core-hardware-architecture-sections.md)
- [Main PCB](../../iot-vehicle-tracking-system-hardware/Main.PcbDoc)
- [Netlist](../../iot-vehicle-tracking-system-hardware/Documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET)

## Overview
- Priority: P0
- Status: Planned
- Goal: Sửa các phần implementation hardware chi tiết, BOM, và mô tả test để khớp với board thật.

## Key insights
- BOM và mô tả rail nguồn là nơi dễ “lệch thực tế” nhất nếu không neo theo netlist.
- Phần test phải phân biệt rõ: test board custom vs test ngoại vi (OBD2 adapter, mạng di động, GNSS môi trường).

## Requirements
### Functional
1. Viết lại đoạn BOM/linh kiện lõi theo part list thật.
2. Sửa mô tả power architecture (buck/boost/charger/LDO) theo schematic.
3. Sửa các đoạn test liên quan hardware để tránh claim vượt bằng chứng.

### Non-functional
- Đơn vị đo, ngưỡng, thuật ngữ nhất quán xuyên suốt.
- Không thay đổi ý nghĩa các kết quả đo đã có bằng chứng.

## Architecture
- BOM-first rewrite: part name → chức năng → vị trí khối.
- Test rewrite: điều kiện đo → phương pháp đo → kết quả → giới hạn.

## Related code files
### Modify
- `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`

## Implementation steps
1. Rà tất cả bảng BOM/hardware tables, map với netlist part names.
2. Sửa đoạn mô tả khối nguồn và đường cấp.
3. Sửa phần quy trình test hardware (BLE, GNSS, power, sleep/wake).
4. Kiểm tra tính nhất quán giữa text và bảng.

## Todo list
- [ ] Đồng bộ BOM theo netlist
- [ ] Rewrite mô tả khối nguồn
- [ ] Rewrite test hardware-related
- [ ] Soát chéo text-bảng

## Success criteria
- BOM trong thesis phản ánh đúng linh kiện tích hợp trên PCB.
- Mọi mô tả test hardware không over-claim so với bằng chứng.

## Risk assessment
- Rủi ro: một số part biến thể theo lô linh kiện gây lệch tên.
- Giảm thiểu: dùng naming canonical theo netlist và ghi chú variant nếu cần.

## Security considerations
- Không áp dụng.

## Next steps
- Sang Phase 05 để validation tổng thể và khóa bản thảo.
