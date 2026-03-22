# 1. Context links
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/plan.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/research/researcher-02-report.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/scout/scout-01-thesis-diagram-assets-and-pipeline.md`
- Protected legacy pipeline:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/assets/figures/*`

# 2. Overview
- Priority: P2
- Status: pending
- Mục tiêu: đưa ra lộ trình adoption có kiểm soát và rollback nhanh cho pack mới.

# 3. Key Insights
- Pack cũ phải luôn sống song song trong pilot để bảo toàn khả năng phát hành luận văn.
- Chuyển đổi an toàn nhất qua config toggle pack-id/version, không edit script cũ ngay.
- Rollback tốt cần artifact cũ + metadata release đầy đủ.

# 4. Requirements
- Functional:
  - Định nghĩa rollout theo wave (internal preview -> reviewer pilot -> wider adoption).
  - Định nghĩa cơ chế chọn pack qua biến cấu hình duy nhất.
  - Định nghĩa runbook rollback dưới 15 phút.
  - Promote/revert bắt buộc đồng duyệt bởi Tech Lead + QA (validated).
- Non-functional:
  - Không gián đoạn tiến độ tài liệu đang dùng pack cũ.
  - Có audit trail cho mọi quyết định promote/revert.

<!-- Updated: Validation Session 1 - governance model fixed to Lead+QA with SLA 15m -->

# 5. Architecture
- Rollout model:
  - Wave 0: chạy song song, không consumer nào dùng mặc định.
  - Wave 1: reviewer chọn pack mới qua config override.
  - Wave 2: default chuyển sang pack mới sau khi đạt gate ổn định.
- Toggle model:
  - `DIAGRAM_PACK_REF={pack-id}@{version}` (single source of truth).
- Rollback model:
  - Quay về version cũ bằng đổi `DIAGRAM_PACK_REF` + redeploy pipeline docs.

# 6. Related code files
- Files to modify: không có (phase planning only).
- Files to create/update (khi implement):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/diagram-reference-packs/diagram-pack-v2/qa/gates/release-log.jsonl`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-changelog.md` (khi rollout thật)
- Files explicitly unchanged in pilot:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/assets/figures/*`

# 7. Implementation Steps
1. Định nghĩa rollout waves + entry/exit criteria mỗi wave.
2. Định nghĩa toggle contract `DIAGRAM_PACK_REF`.
3. Định nghĩa runbook rollback chi tiết (trigger, steps, owner, SLA).
4. Định nghĩa canary sample diagrams hoặc figure groups để validate trước full adoption.
5. Định nghĩa acceptance sign-off trước khi promote default.

# 8. Todo list
- [ ] Chốt wave plan và gate cho từng wave.
- [ ] Chốt config toggle contract.
- [ ] Chốt rollback runbook + owner trực.
- [ ] Chốt sign-off checklist trước promote.

# 9. Success Criteria
- Rollout plan có thể chạy thử mà không động pack cũ.
- Rollback thao tác ít bước, có owner rõ, kiểm chứng được.
- Có minh chứng chất lượng trước khi đổi default.

# 10. Risk Assessment
- Risk: thiếu đồng bộ version giữa markdown thesis và diagram outputs.
- Mitigation: pin theo `pack-id@version`, cấm `latest`.
- Risk: rollback chậm do thiếu artifact.
- Mitigation: giữ artifact releases + release log bắt buộc; mô phỏng rollback định kỳ để giữ SLA <= 15 phút.

<!-- Updated: Validation Session 1 - rollback risk mitigation aligned with SLA 15m -->

# 11. Security Considerations
- Chỉ maintainers được quyền promote/revert release ref.
- Audit log bắt buộc cho thay đổi config promote/rollback.
- Không expose internal paths hoặc metadata nhạy cảm ra public artifact.

# 12. Next Steps
- Chuyển thành checklist vận hành + governance controls trong Phase 05.

## Unresolved questions
- Có cần dual-publish (pack cũ + pack mới) trong một giai đoạn cố định không?
- Config toggle sẽ nằm ở đâu để ít chạm nhất vào pipeline hiện hành?
