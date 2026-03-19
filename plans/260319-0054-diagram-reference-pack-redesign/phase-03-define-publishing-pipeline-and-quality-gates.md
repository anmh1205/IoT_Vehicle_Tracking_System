# 1. Context links
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/plan.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260319-0054-diagram-reference-pack-redesign/research/researcher-02-report.md`
- Workflow root: `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/`
- Existing thesis assets: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/`

# 2. Overview
- Priority: P1
- Status: pending
- Mục tiêu: định nghĩa pipeline publish độc lập cho pack mới, có quality gates đủ chặt.

# 3. Key Insights
- Repo chưa có workflow chuyên cho render/QA diagram pack.
- Visual regression cần gate riêng; chỉ render thành công là chưa đủ.
- Metadata/checksum là nền tảng để audit và rollback nhanh.

# 4. Requirements
- Functional:
  - Pipeline local + CI: validate -> render svg/png/pdf -> QA -> publish artifact.
  - Quality gates: schema lint, render pass, visual diff threshold, metadata/checksum report.
  - Output report chuẩn máy đọc (`json/jsonl`) cho truy vết.
  - Chốt threshold visual diff: warning 0.5%, block 2.0% (validated).
  - Chốt release cadence + retention: sprint-based releases, artifact retention 90 ngày (validated).
- Non-functional:
  - Deterministic build (pin version CLI/toolchain).
  - Không ghi đè output pack cũ.

<!-- Updated: Validation Session 1 - fixed diff thresholds and release retention policy -->

# 5. Architecture
- Pipeline stages:
  1) Preflight: manifest/schema/path checks.
  2) Build: Mermaid CLI (và PlantUML nếu enabled) xuất SVG/PNG/PDF.
  3) QA: baseline compare + static style checks.
  4) Release: upload artifacts + QA report.
- Gate policy:
  - Hard fail: schema lỗi, render fail, missing mapping, hoặc visual diff >= 2.0%.
  - Soft/Manual review: visual diff >= 0.5% và < 2.0%.

<!-- Updated: Validation Session 1 - gate policy quantized with 0.5/2.0 thresholds -->
- Suggested workflow files (khi implement):
  - `.github/workflows/diagram-pack-ci.yml`
  - `.github/workflows/diagram-pack-release.yml`

# 6. Related code files
- Files to modify: không có (phase planning only).
- Files to create/update (khi implement):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/diagram-pack-ci.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/diagram-pack-release.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/diagram-reference-packs/diagram-pack-v2/qa/gates/report.jsonl` (artifact output)
- Files explicitly out-of-scope pilot:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/generate-thesis-report-figures.mjs`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/thesis-mermaid-diagrams.mjs`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/figures/*`

# 7. Implementation Steps
1. Định nghĩa contract report (fields: file, version, checksum, diff score, status).
2. Định nghĩa gate thresholds (warning/block) cho visual diff.
3. Thiết kế pipeline CI trigger cho PR và branch chính.
4. Thiết kế release job tạo artifact có naming chuẩn.
5. Thiết kế quy trình approve/reject dựa QA report.

# 8. Todo list
- [ ] Chốt stages + gate matrix.
- [ ] Chốt report schema cho QA output.
- [ ] Chốt threshold visual diff.
- [ ] Chốt CI trigger + retention policy artifact.

# 9. Success Criteria
- Pipeline spec rõ, đủ để implement không mơ hồ.
- Gate policy giảm false pass cho quality regression.
- Artifact/reports tái lập được, traceable theo commit/version.

# 10. Risk Assessment
- Risk: visual diff nhiễu do môi trường render khác nhau.
- Mitigation: pin fonts, pin CLI versions, normalize render env.
- Risk: thời gian CI tăng cao.
- Mitigation: cache dependency, chỉ render file impacted ở PR.

# 11. Security Considerations
- CI secrets không nhúng vào artifact/report.
- Không chạy lệnh shell từ nội dung manifest không kiểm soát.
- Giới hạn quyền workflow theo nguyên tắc least privilege.

# 12. Next Steps
- Đưa policy gate sang Phase 04 để gắn với rollout/rollback decision points.

## Unresolved questions
- Threshold block visual diff nên bắt đầu từ bao nhiêu (% pixel)?
- Release artifacts giữ bao lâu để cân bằng chi phí và truy vết?
