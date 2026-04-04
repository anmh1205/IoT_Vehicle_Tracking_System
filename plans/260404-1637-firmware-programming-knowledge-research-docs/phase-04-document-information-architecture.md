# Phase 04 — Thiết kế information architecture cho bộ programming docs

## Context links
- `./phase-03-cross-validation-matrix-and-confidence.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`

## Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-04
- Description: thiết kế cấu trúc file tài liệu đích và mapping claim -> tài liệu.
- Priority: P2
- Implementation status: pending
- Review status: not-started

## Key Insights
- Tách theo component + integration flow giúp maintain dễ hơn.
- Citation index và glossary phải là artifact first-class, không phụ lục nhẹ.
- Cần phân tách clearly: normative guidance vs troubleshooting heuristics.

## Requirements
- Định nghĩa bộ file đích tại `iot-vehicle-tracking-system-firmware/hardware-specs/programming`:
  - `00-overview.md`
  - `01-esp32-s3-programming-guide.md`
  - `02-sim7600-sim7600ce-programming-guide.md`
  - `03-lis3dsh-vs-lis3dh-programming-guide.md`
  - `04-w25q128jv-programming-guide.md`
  - `05-ds3231m-programming-guide.md`
  - `06-power-ic-and-sequencing-guide.md`
  - `07-integration-patterns.md`
  - `08-failure-and-debug-playbook.md`
  - `98-glossary.md`
  - `99-citation-index.md`
- Có rule link chéo giữa guide và citation index.

## Architecture
- IA layers:
  1) Platform overview + scope
  2) Per-component programming guides
  3) Cross-component integration patterns
  4) Failure/debug playbook
  5) Governance artifacts (citation index, glossary, unresolved)
- Navigation pattern: mỗi file có “Inputs / Claims / Evidence refs / Open issues”.

## Related code files
- Files to modify: none.
- Files to create: danh sách file đích ở trên.
- Files to delete: none.

## Implementation Steps
1. Khóa danh sách file và vai trò từng file.
2. Định nghĩa template section thống nhất cho per-component guide.
3. Định nghĩa convention link citation (`[CLM-...]`, `[SRC-...]`).
4. Định nghĩa quy tắc cập nhật glossary.

## Todo list
- [ ] Approve file taxonomy final.
- [ ] Approve section templates.
- [ ] Approve citation link convention.
- [ ] Approve glossary convention.

## Success Criteria
- IA rõ, không chồng chéo trách nhiệm file.
- Team mới vào đọc hiểu flow trong 1 lần.
- Mọi claim trong guide có đường trace về index.

## Risk Assessment
- Risk: file taxonomy quá sâu gây khó maintain.
- Risk: trùng lặp nội dung giữa guide và integration.
- Mitigation: đặt ownership rõ theo layer.

## Security Considerations
- Tránh đưa lệnh thao tác module có thể gây mất an toàn phần cứng mà không cảnh báo điều kiện nguồn/điện áp.

## Next steps
- Qua P05 để lên chiến lược biên soạn từng component guide.