# 1. Context links
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/plan.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/phase-01-establish-selection-criteria-and-target-stack.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/phase-02-design-parallel-pack-structure-and-versioning.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/phase-03-define-publishing-pipeline-and-quality-gates.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/phase-04-define-adoption-rollout-and-rollback.md`

# 2. Overview
- Priority: P2
- Status: pending
- Mục tiêu: gom checklist triển khai end-to-end và governance để thực thi nhất quán.

# 3. Key Insights
- Nút thắt chính không nằm ở tool, mà ở kỷ luật release + QA gates + owner rõ.
- Nếu governance mờ, nguy cơ “đụng pack cũ” và drift chất lượng rất cao.
- Checklist theo phase giúp triển khai tuần tự, ít sót.

# 4. Requirements
- Functional:
  - Có master checklist theo 5 phase, bám deliverables cụ thể.
  - Có RACI tối thiểu: owner, reviewer, approver.
  - Có meeting cadence ngắn để unblock.
  - Governance bắt buộc: Tech Lead + QA đồng duyệt promote/revert; rollback SLA <= 15 phút.
- Non-functional:
  - Tài liệu ngắn, rõ, không dư thừa (KISS).
  - Không trùng lặp checklist giữa các phase (DRY).

<!-- Updated: Validation Session 1 - governance requirements fixed to Lead+QA and SLA 15m -->

# 5. Architecture
- Governance layers:
  - Policy: scope guardrails + no-touch legacy rule.
  - Delivery: phase gates + acceptance criteria.
  - Ops: incident/rollback ownership + reporting cadence.
- Master checklist theo phase:
  - Phase 01: chốt rubric + stack decision.
  - Phase 02: chốt pack structure + manifest/versioning.
  - Phase 03: chốt pipeline + quality gates.
  - Phase 04: chốt rollout waves + rollback runbook.
  - Phase 05: ký xác nhận readiness và handoff implement.

# 6. Related code files
- Files to modify: không có (phase planning only).
- Files to create/update (khi implement):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/plan.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-changelog.md` (khi có triển khai thật)
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/development-roadmap.md` (khi có triển khai thật)
- Files frozen during pilot:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/assets/figures/*`

# 7. Implementation Steps
1. Tạo checklist tổng hợp và map mỗi mục vào phase owner.
2. Chốt RACI cho decision stack, gate threshold, promote/rollback.
3. Chốt lịch review ngắn (2-3 checkpoint) theo phase dependencies.
4. Chốt điều kiện vào implement (plan gate: green).
5. Chuẩn bị handoff package cho main agent (path, checklist, unresolved items).

# 8. Todo list
- [ ] Hoàn tất master checklist 5 phase.
- [ ] Chốt RACI và sign-off points.
- [ ] Chốt cadence review/unblock.
- [ ] Chốt tiêu chí “ready for implementation”.
- [ ] Chốt rõ approver matrix: Lead + QA cho promote/revert.
- [ ] Chốt checklist drill rollback định kỳ để đảm bảo SLA <= 15 phút.

<!-- Updated: Validation Session 1 - added governance action checklist -->

# 9. Success Criteria
- Checklist đủ để đội implement làm theo không cần đoán.
- Governance rõ: ai quyết định gì, khi nào rollback.
- Không có mục nào mâu thuẫn với no-touch legacy rule.

# 10. Risk Assessment
- Risk: owner mơ hồ, quyết định chậm.
- Mitigation: assign approver rõ ngay từ đầu.
- Risk: checklist dài quá, khó dùng.
- Mitigation: giữ MVP checklist, tách optional items.

# 11. Security Considerations
- Bảo đảm review quyền truy cập workflow/config trước rollout.
- Không commit thông tin nhạy cảm vào manifest/report artifacts.
- Ghi nhận thay đổi quan trọng trong changelog để audit.

# 12. Next Steps
- Bàn giao plan package cho main agent để vào luồng implement/test/review.

## Unresolved questions
- Người duyệt cuối cho promote pack mới ngoài Lead + QA có cần thêm owner học thuật không?
- Có cần gate bổ sung cho font license/compliance trước publish không?
