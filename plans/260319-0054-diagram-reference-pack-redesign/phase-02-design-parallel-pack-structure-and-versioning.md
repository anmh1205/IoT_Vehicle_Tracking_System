# 1. Context links
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/plan.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/research/researcher-02-report.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/scout/scout-01-thesis-diagram-assets-and-pipeline.md`
- Existing assets root: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/`

# 2. Overview
- Priority: P1
- Status: pending
- Mục tiêu: thiết kế pack song song, versioning rõ, không đụng pack đang vận hành.

# 3. Key Insights
- Pack cũ render thẳng vào `.../assets/figures` và có purge step.
- Muốn pilot an toàn phải tách tuyệt đối source/build/baseline path.
- Cần manifest 1-1 để tránh mismatch giữa source và output.

# 4. Requirements
- Functional:
  - Định nghĩa cấu trúc thư mục mới cho reference pack.
  - Định nghĩa schema manifest và naming convention.
  - Định nghĩa SemVer + trạng thái lifecycle (`candidate/active/deprecated`).
- Non-functional:
  - Backward-safe: không thay consumer hiện tại trong pilot.
  - Truy vết được version + checksum cho từng artifact.

# 5. Architecture
- Đề xuất root mới:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/diagram-reference-packs/diagram-pack-v2/`
  - Bên trong: `src/`, `style/`, `build/`, `baselines/`, `qa/`, `manifest.yaml`.
- Version model:
  - SemVer theo pack release.
  - Artifact naming: `{pack-id}-{version}-{format}-{gitsha}-{date}`.
- Contract model:
  - `manifest.yaml` giữ mapping source -> outputs + metadata render profile.

# 6. Related code files
- Files to modify: không có (phase planning only).
- Files to create/update (khi implement):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/diagram-reference-packs/diagram-pack-v2/manifest.yaml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/diagram-reference-packs/diagram-pack-v2/style/mermaid-theme.json`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/diagram-reference-packs/diagram-pack-v2/qa/gates/manifest.schema.json`
- Files not to touch in pilot:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/generate-thesis-report-figures.mjs`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/thesis-mermaid-diagrams.mjs`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/figures/*`

# 7. Implementation Steps
1. Chốt pack root path và pack-id cố định cho pilot.
2. Thiết kế thư mục chuẩn cho source/build/qa/baselines.
3. Thiết kế schema manifest tối thiểu + metadata bắt buộc.
4. Định nghĩa naming convention file diagram theo chapter/figure-id.
5. Chốt SemVer policy + lifecycle status.

# 8. Todo list
- [ ] Chốt cấu trúc thư mục chuẩn v2.
- [ ] Draft manifest schema bản tối thiểu.
- [ ] Chốt naming convention file + artifact.
- [ ] Chốt version/lifecycle policy.

# 9. Success Criteria
- Có cấu trúc pack rõ, tách biệt hoàn toàn với pack cũ.
- Có contract manifest đủ để tự động render + QA + trace.
- Có policy versioning cho publish và rollback.

# 10. Risk Assessment
- Risk: cấu trúc quá phức tạp cho pilot.
- Mitigation: giữ tối thiểu thư mục bắt buộc; postpone phần không critical.
- Risk: naming không nhất quán gây map lỗi.
- Mitigation: enforce schema + lint rule trước render.

# 11. Security Considerations
- Không cho phép path traversal trong manifest entries.
- Validate input path nằm trong pack root.
- Giới hạn external include/import từ DSL để giảm injection risk.

# 12. Next Steps
- Chuyển contract folder + manifest sang Phase 03 để thiết kế pipeline publish và quality gates.

## Unresolved questions
- Có cần giữ compatibility với naming hiện tại của thesis chapters 100% không?
- Pack-id sẽ cố định `diagram-pack-v2` hay theo issue/release?
