# 1. Context links
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/plan.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/research/researcher-01-report.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/research/researcher-02-report.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/scout/scout-01-thesis-diagram-assets-and-pipeline.md`

# 2. Overview
- Priority: P1
- Status: pending
- Mục tiêu: chốt tiêu chí chọn công cụ và stack pilot cho reference pack mới, bám YAGNI/KISS/DRY.

# 3. Key Insights
- Diagrams-as-code cho diff/review/version tốt nhất; phù hợp tài liệu kỹ thuật + luận văn.
- Pack hiện tại có purge flow, không thể dùng chung output path nếu muốn chạy song song.
- Nhu cầu học thuật cần export SVG/PDF chất lượng cao, font/label ổn định.

# 4. Requirements
- Functional:
  - Định nghĩa rubric chấm tool (maintainability, output quality, CI fit, learning cost, collaboration).
  - Chốt stack shortlist: 1 primary + 2 backup.
  - Chốt tiêu chí pass/fail cho pilot.
  - Pilot bắt buộc hybrid Mermaid + PlantUML ngay từ đầu (validated).
- Non-functional:
  - Không ảnh hưởng asset production hiện tại.
  - Quy tắc đánh giá rõ, đo được, review được.

<!-- Updated: Validation Session 1 - pilot stack switched to hybrid Mermaid+PlantUML -->

# 5. Architecture
- Decision layer:
  - Input: report nghiên cứu + ràng buộc pipeline hiện tại.
  - Scoring: weighted matrix (điểm + lý do).
  - Output: target stack profile (`primary`, `backup`, `not-selected`).
- Khuyến nghị (validated):
  - Primary: Hybrid Mermaid v11 + PlantUML + manifest/schema + CI gates.
  - Backup A: Mermaid-first fallback nếu cần giảm độ phức tạp rollout.
  - Backup B: draw.io cho brainstorm, không làm source-of-truth publish.

<!-- Updated: Validation Session 1 - architecture baseline changed to hybrid -->

# 6. Related code files
- Files to modify: không có (phase planning only).
- Files to create/update:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/phase-01-establish-selection-criteria-and-target-stack.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/phase-05-execution-checklist-and-governance.md` (tham chiếu checklist)
- Files explicitly protected in pilot:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/assets/figures/*`

# 7. Implementation Steps
1. Tổng hợp tiêu chí từ 2 researcher reports.
2. Định trọng số tiêu chí theo mục tiêu luận văn (quality + maintainability > speed).
3. Chấm Mermaid/PlantUML/draw.io theo rubric.
4. Chốt stack primary + backup + điều kiện chuyển stack.
5. Ghi rõ “non-interference rule” vào governance checklist.

# 8. Todo list
- [ ] Chốt rubric 6-8 tiêu chí có trọng số.
- [ ] Chốt stack primary và 2 backup.
- [ ] Chốt acceptance gate cho pilot.
- [ ] Chốt rule không sửa trực tiếp pipeline cũ.

# 9. Success Criteria
- Có decision record ngắn, rõ vì sao chọn/không chọn từng tool.
- Có 1 stack chính + 2 fallback với trigger chuyển đổi.
- Team thống nhất được quality baseline cho phase sau.

# 10. Risk Assessment
- Risk: tranh luận tool kéo dài, chậm phase sau.
- Mitigation: dùng weighted matrix, deadline quyết định 1 phiên.
- Risk: chọn stack quá nặng cho pilot.
- Mitigation: giữ pilot hybrid nhưng giới hạn rõ loại UML/layout bắt buộc trong wave đầu; hoãn integration không critical.

# 11. Security Considerations
- Ưu tiên `securityLevel: strict` cho Mermaid config.
- Không dùng source diagram từ nguồn không tin cậy trong pipeline publish.
- Pin version CLI để giảm supply-chain drift.

# 12. Next Steps
- Bàn giao output stack decision sang Phase 02 để thiết kế pack structure/versioning.

## Unresolved questions
- PlantUML coverage tối thiểu ở pilot cần đến mức activity/class/sequence hay full UML set?
- Có cần policy cho draw.io file trong PR (allowed/blocked/review-only)?
