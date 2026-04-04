# Phase 05 — Review docs and release readiness

## Context links
- Firmware alignment: `./phase-02-firmware-alignment-with-netlist.md`
- Thesis sync: `./phase-03-thesis-content-and-figure-source-sync.md`
- Asset validation: `./phase-04-regenerate-assets-and-consistency-validation.md`
- Project docs to update when implementation xong:
  - `docs/project-changelog.md`
  - `docs/development-roadmap.md` (nếu milestone/status đổi)

## Overview
- Priority: P2
- Status: pending
- Description: Lập kế hoạch review cuối, đóng tài liệu, và xác nhận release-readiness cho đợt sync phần cứng.

## Key Insights
- Sync này chạm 3 miền (firmware, thesis text, figures) nên cần gate review chéo.
- Nếu thiếu changelog/docs update thì knowledge sẽ drift nhanh ở sprint sau.
- Cần checklist “đủ để merge” thay vì kiểm tra cảm tính.

## Requirements
- Functional:
  - Review chéo tính nhất quán firmware ↔ thesis ↔ assets.
  - Chuẩn bị nội dung cập nhật changelog/roadmap theo quy tắc docs management.
  - Chốt release checklist: build/test/docs/assets.
- Non-functional:
  - YAGNI: không thêm cải tiến ngoài scope sync.
  - KISS: một checklist ngắn, rõ, có owner theo nhóm việc.

## Architecture
- Review pipeline:
  1) Technical review (firmware mapping/sequencing),
  2) Documentation review (thesis terminology + diagrams),
  3) Release gate (build/test/render/changelog).
- Dependency: Phase 05 chỉ mở khi Phase 04 pass.

## Related code files
- Modify:
  - `docs/project-changelog.md`
  - `docs/development-roadmap.md` (nếu phase status đổi)
  - `docs/system-architecture.md` (nếu narrative hardware bị ảnh hưởng)
  - `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-readability-draft.md` (chỉnh nhỏ sau review nếu cần)
- Create: none.
- Delete: none.

## Implementation Steps
1. Tổng hợp diff theo 3 miền từ các phase trước.
2. Chạy review checklist: compile/test firmware, figure integrity, thesis consistency.
3. Ghi decision log: accepted issues, deferred issues, rationale.
4. Soạn mục changelog/roadmap tương ứng với thay đổi thực tế.
5. Chốt release-readiness verdict và danh sách follow-up.

## Todo list
- [ ] Hoàn thành review checklist liên miền.
- [ ] Chốt các issue deferred (nếu có) kèm owner.
- [ ] Cập nhật changelog theo thay đổi đã xác nhận.
- [ ] Cập nhật roadmap/status nếu milestone thay đổi.
- [ ] Xuất release-readiness verdict (go/no-go).

## Success Criteria
<!-- Updated: Validation Session 1 - review must include 4 validated decisions -->
- Có verdict go/no-go dựa trên checklist rõ ràng.
- Review checklist xác nhận đã phản ánh đủ 4 quyết định validation session 1 (modem canonical, IMU migrate full, modem full control lines, draft+mirror impacted-only).
- Docs tracking (changelog/roadmap) phản ánh đúng thay đổi.
- Không còn blocker critical mở liên quan hardware sync.

## Risk Assessment
- Risk: thiếu review liên miền dẫn tới mismatch âm thầm.
  - Mitigation: review matrix bắt buộc đủ 3 miền trước verdict.
- Risk: scope creep vì phát hiện lỗi cũ không liên quan.
  - Mitigation: ghi vào deferred list, không kéo vào release hiện tại.

## Security Considerations
- Kiểm soát nội dung public-facing trong thesis/docs, tránh lộ thông tin không cần thiết.
- Không đưa thông số nội bộ ngoài phạm vi học thuật/kỹ thuật đã duyệt.

## Next steps
- Nếu go: chuyển execution cho implementation workflow (dev -> test -> code review -> docs finalize).
- Nếu no-go: mở mini-plan remediation tập trung đúng blocker.
