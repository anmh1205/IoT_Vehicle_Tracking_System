# Phase 01 — Hardware baseline and gap freeze

## Context links
- Research 01: `./research/researcher-01-pcb-pdf-analysis.md`
- Research 02: `./research/researcher-02-netlist-analysis.md`
- Scout: `./scout/scout-01-firmware-thesis-target-files.md`
- Hardware inputs:
  - `iot-vehicle-tracking-system-firmware/hardware-specs/iot-vehicle-tracking-system-main.pdf`
  - `iot-vehicle-tracking-system-firmware/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET`

## Overview
- Priority: P1
- Status: pending
- Description: Chốt baseline tín hiệu/phần tử phần cứng làm nguồn sự thật duy nhất trước khi đụng firmware + thesis.

## Key Insights
<!-- Updated: Validation Session 1 - canonical modem name locked -->
- Canonical modem name được khóa là `SIM7600CE-T` cho toàn bộ firmware/thesis/assets.
- Netlist gọi IMU là `LIS3DSH`, trong khi firmware đang theo naming `lis3dh`.
- Modem control path có `PWR-KEY`, `RESET`, `SIM-DTR`, `STATUS`, `NET-LIGHT`; nhiều net đi qua transistor stage.
- Thesis có rủi ro lệch naming nếu alias policy không ghi rõ trong baseline.

## Requirements
- Functional:
  - Tạo bảng mapping canonical cho component, net, rail, signal.
  - Tạo gap list cho 3 miền: firmware, thesis text, thesis figures.
  - Đóng băng quyết định naming để phase sau bám theo.
- Non-functional:
  - Không suy diễn quá mức từ PDF text extract; chỗ mơ hồ phải gắn cờ.
  - YAGNI: chỉ freeze các tín hiệu ảnh hưởng code/docs hiện hữu.

## Architecture
- Nguồn dữ liệu: PDF + netlist -> bảng chuẩn hóa (`component`, `signal`, `rail`, `confidence`).
- Luồng quyết định: baseline -> gap matrix -> dependency gate cho Phase 02/03.
- Output artifact dự kiến: baseline matrix + decision log trong chính phase doc.

## Related code files
- Modify (planning target):
  - `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
  - `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
  - `iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
  - `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dh.c`
  - `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-readability-draft.md`
  - `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`
- Create: none (implementation phase ưu tiên update file sẵn có).
- Delete: none.

## Implementation Steps
1. Tổng hợp tất cả tên linh kiện/net/rail quan trọng từ 2 research reports.
2. Tạo bảng canonical naming (modem, IMU, rail, control signals).
3. Đánh dấu từng mục theo confidence: high/medium/low.
4. Lập gap matrix firmware vs netlist, thesis vs netlist.
5. Đưa ra freeze decision cho các mục high-confidence; mục low-confidence thành blocker question.
6. Khóa dependency gate: chỉ cho Phase 02/03 chạy khi freeze xong.

## Todo list
- [ ] Chuẩn hóa tên modem canonical cho branch hiện tại.
- [ ] Chuẩn hóa tên IMU canonical + compatibility note.
- [ ] Chốt danh sách modem control lines bắt buộc có trong docs/code comments.
- [ ] Chốt mapping rail names dùng xuyên suốt thesis figures.
- [ ] Ghi rõ câu hỏi chưa đủ dữ liệu.

## Success Criteria
- Có baseline matrix đầy đủ cho modem/IMU/power rails/control lines.
- Có gap matrix tách 3 miền (firmware/thesis text/thesis assets).
- Có quyết định freeze + danh sách blocker rõ ràng, testable.

## Risk Assessment
- Risk: nhầm mapping GPIO do netlist không ghi trực tiếp pin ESP32-S3.
  - Mitigation: đánh dấu pending mapping, không hard-commit giả định trong plan implementation.
- Risk: trộn revision modem (`E`, `CE`, `CE-T`) gây lệch luận văn.
  - Mitigation: thêm policy “canonical + alias note”.

## Security Considerations
- Không có xử lý secret mới.
- Tránh đưa thông tin nội bộ phần cứng nhạy cảm ngoài phạm vi repo công khai.

## Next steps
- Dependency output cho Phase 02: baseline pin/control/rail decisions.
- Dependency output cho Phase 03: canonical naming table cho text + figure captions.
- Nếu blocker chưa gỡ: escalte câu hỏi mapping trước khi sửa code thực tế.
