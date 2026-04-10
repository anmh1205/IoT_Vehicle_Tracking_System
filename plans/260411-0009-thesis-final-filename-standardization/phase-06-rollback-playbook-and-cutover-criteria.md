# Context Links
- Root plan: `./plan.md`
- Phase 03: `./phase-03-dry-run-and-conflict-resolution.md`
- Phase 04: `./phase-04-controlled-rename-and-reference-sync.md`
- Phase 05: `./phase-05-build-basename-alignment-and-validation.md`

# Overview
- Priority: P1
- Status: pending
- Brief: Định nghĩa rollback theo stage và tiêu chí go/no-go để cutover an toàn.

# Key Insights
- Rename bulk không có rollback rõ là không deploy được.
- Rollback phải theo stage để giảm blast radius.
- Cutover chỉ khi validation pass đầy đủ, không có “known broken”.

# Requirements
- Functional:
  - Có playbook rollback S1-S4 cụ thể.
  - Có tiêu chí go/no-go và owner quyết định cutover.
  - Có checklist hậu cutover (smoke).
- Non-functional:
  - Rollback thực thi nhanh, không cần tool mới.
  - Log đủ để audit quyết định.

# Architecture
- Checkpoints:
  - CP0: trước mọi thay đổi.
  - CP1: sau rename source.
  - CP2: sau ref sync.
  - CP3: sau regenerate figures.
  - CP4: sau build+validation pass.
- Rollback target: quay về checkpoint gần nhất an toàn.

# Related Code Files
- Modify (kế hoạch): none (playbook/process)
- Create (kế hoạch): rollback report + cutover decision note
- Delete (kế hoạch): artifact sinh ra trong run thất bại

# Implementation Steps
1. Định nghĩa checkpoint strategy (git snapshot/stash/tag nội bộ).
2. Viết rollback steps cho từng stage S1-S4.
3. Định nghĩa go/no-go gates dựa trên checklist phase 5.
4. Định nghĩa smoke checks ngay sau cutover.
5. Chốt owner phê duyệt cutover + rollback authority.

# Todo List
- [ ] Freeze checkpoint strategy.
- [ ] Freeze stage-by-stage rollback steps.
- [ ] Freeze go/no-go criteria.
- [ ] Freeze post-cutover smoke checklist.

# Success Criteria
- Có rollback rõ cho mọi điểm fail chính.
- Có decision table go/no-go, không nhập nhằng.
- Team có thể phục hồi về CP0 trong thời gian ngắn.

# Risk Assessment
- Rủi ro: cleanup artifact không triệt để làm validate giả pass/fail.
- Mitigation: rollback kèm cleanup list bắt buộc.

# Security Considerations
- Không dùng force-delete ngoài scope manifest/artifact list.
- Không ghi đè file template ngoại lệ không có phê duyệt.

# Next Steps
- Khi go-live: thực thi theo phase 1->5, dùng phase 6 làm guardrail vận hành.

## Rollback by stage
| Stage | Trigger fail | Rollback action |
|---|---|---|
| S1 rename source | rename collision / missing path | restore checkpoint CP0; bỏ mọi rename đã apply |
| S2 ref sync | grep còn token cũ critical / replace sai | restore CP1 hoặc CP0 tùy mức độ; re-run mapping |
| S3 regenerate figures | mapping/render fail | restore CP2; purge generated files mới của run |
| S4 cleanup/build | build fail / basename drift | restore CP3; phục hồi artifact cần thiết để debug |

## Cutover criteria (go/no-go)
<!-- Updated: Validation Session 1 - no-alias cutover -->
- GO khi tất cả đúng:
  1) Dry-run checks A-F pass.
  2) Execution stages S1-S4 hoàn tất không lỗi.
  3) Validation checklist phase 5 pass 100%.
  4) Không unresolved question blocking.
  5) Không còn alias tên cũ (`99-*`, `thesis-build*`) trong phạm vi active.
- NO-GO nếu 1 điều kiện fail; rollback về checkpoint gần nhất.

## Post-cutover smoke checks
1. Mở markdown chính, verify image render đầy đủ.
2. Chạy figure generator lại 1 lần, không lỗi mapping.
3. Build LaTeX lại 1 lần, output basename đúng canonical.
4. Grep nhanh prefix bẩn trong scope `thesis/final`, đảm bảo không tái xuất.

## Unresolved questions
- None (blocking).
