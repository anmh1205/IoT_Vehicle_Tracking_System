# Phase 04 — Information Architecture for Programming Docs

## Context links
- Parent plan: [plan.md](plan.md)
- Cross-validation design: [phase-03-cross-validation-matrix.md](phase-03-cross-validation-matrix.md)

## Overview
- Date: 2026-04-04
- Description: định nghĩa cấu trúc file khoa học cho thư mục đích `hardware-specs/programming`.
- Priority: P1
- Implementation status: pending
- Review status: pending

## Key Insights
- IA phải tách rõ component-specific facts và integration behavior.
- Người đọc cần đi từ “constraint” -> “pattern” -> “failure/debug” -> “citation”.

## Requirements
- File set đích bắt buộc:
  - `00-overview-and-scope.md`
  - `10-esp32-s3-programming-constraints.md`
  - `11-sim7600-programming-and-at-flow.md`
  - `12-imu-lis3dsh-vs-lis3dh-programming-notes.md`
  - `13-w25q128jv-storage-and-ota-considerations.md`
  - `14-ds3231m-rtc-programming-notes.md`
  - `15-power-sequencing-and-brownout-handling.md`
  - `20-integration-patterns-state-machine-uart-retry-sleep-wake.md`
  - `30-failure-modes-and-debug-playbook.md`
  - `40-citation-index-and-confidence-matrix.md`
  - `50-glossary.md`

## Architecture
- Layer 1: foundational constraints (per-component)
- Layer 2: integration patterns (cross-component)
- Layer 3: operations/debug playbook
- Layer 4: traceability index + glossary

## Related code files
- Modify: none (planning only)
- Create: IA spec in plan artifacts
- Reference-only:
  - `iot-vehicle-tracking-system-firmware/hardware-specs/programming/*` (target to be created in implementation phase)

## Implementation Steps
1. Define file naming and chapter responsibilities.
2. Define per-file mandatory sections template.
3. Define cross-link strategy between files.
4. Define citation anchor format used across all files.

## Todo list
- [ ] Freeze target file inventory.
- [ ] Freeze per-file template and section order.
- [ ] Freeze cross-link and citation anchor standard.

## Success Criteria
- IA đầy đủ, không overlap lớn giữa files.
- Mỗi file có purpose rõ và boundary rõ.
- Có đường dẫn đọc từ quick onboarding tới deep troubleshooting.

## Risk Assessment
- Risk: file structure quá sâu gây khó maintain.
  - Mitigation: giữ 4-layer IA, không phân mảnh quá mức.
- Risk: trùng lặp claim giữa component files.
  - Mitigation: “single owner file” policy cho từng claim class.

## Security Considerations
- Với lệnh modem/flash nhạy cảm, section phải có warning preconditions rõ.

## Next steps
- Move to Phase 05: drafting plan cho core guides theo IA đã chốt.
