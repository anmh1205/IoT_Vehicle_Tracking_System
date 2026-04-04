# Phase 07 — Quality gates, review, publish readiness

## Context links
- `./phase-03-cross-validation-matrix-and-confidence.md`
- `./phase-04-document-information-architecture.md`
- `./phase-06-integration-failure-debug-playbook.md`

## Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-04
- Description: định nghĩa gate cuối để bảo đảm correctness, consistency, traceability trước publish.
- Priority: P1
- Implementation status: pending
- Review status: not-started

## Key Insights
- Thiếu traceability là fail nặng dù nội dung “đúng cảm giác”.
- Confidence distribution giúp team biết phần nào cần nghiên cứu tiếp.
- Unresolved questions phải tách riêng để tránh bị quên sau publish.

## Requirements
- Áp quality gates:
  - Correctness
  - Consistency
  - Traceability
  - Confidence A/B/C coverage
  - Unresolved questions completeness
  - Proof floor gate cho claim critical (vendor + 1 field)
  - Confidence-C warning completeness gate
  - Production-checklist completeness gate cho debug playbook
- Có risk register chính thức cho:
  - vendor/community conflict
  - version drift
  - hardware variant mismatch
- Có publish checklist và rollback notes cho tài liệu.
<!-- Updated: Validation Session 1 - publish gates aligned with validated decisions -->

## Architecture
- Review pipeline:
  1) Structural lint (đủ section/file)
  2) Citation lint (critical claim có refs)
  3) Consistency pass (term/variant naming)
  4) Risk & unresolved audit
  5) Final readiness sign-off
- Artifacts cuối:
  - Citation index
  - Glossary
  - Unresolved ledger
  - Risk register

## Related code files
- Files to modify: none.
- Files to create (future docs target):
  - `iot-vehicle-tracking-system-firmware/hardware-specs/programming/97-risk-register.md`
  - `iot-vehicle-tracking-system-firmware/hardware-specs/programming/98-glossary.md`
  - `iot-vehicle-tracking-system-firmware/hardware-specs/programming/99-citation-index.md`
- Files to delete: none.

## Implementation Steps
1. Chạy review checklist theo thứ tự pipeline.
2. Đối chiếu toàn bộ claim critical với citation index.
3. Tổng hợp confidence distribution và unresolved list.
4. Rà risk register + mitigation owner.
5. Chốt publish readiness report.

## Todo list
- [ ] Finalize quality gate checklist.
- [ ] Finalize citation traceability audit.
- [ ] Finalize confidence distribution summary.
- [ ] Finalize risk register.
- [ ] Finalize unresolved questions ledger.

## Success Criteria
- 100% claim critical trace được về evidence.
- Không conflict chưa xử lý mà bị ẩn.
- Có danh sách unresolved rõ để vòng sau xử lý.

## Risk Assessment
- Risk: review thiên về hình thức, bỏ qua sai lệch kỹ thuật.
- Risk: confidence A bị lạm dụng.
- Mitigation: bắt buộc rationale ngắn và peer review chéo.

## Security Considerations
- Tài liệu publish không lộ thông tin nhạy cảm dự án.
- Nội dung chỉ phục vụ vận hành, debug, phát triển hợp pháp.

## Next steps
- Khi P07 pass, mới chuyển sang task biên soạn nội dung thực tế trong `hardware-specs/programming`.