---
title: "Diagram Reference Pack Redesign Plan"
description: "Plan to build a parallel, high-quality diagram reference pack for thesis/technical docs without touching current production assets."
status: pending
priority: P2
effort: 16h
branch: feature/system-coding
tags: [docs, diagrams, thesis, quality-gates]
created: 2026-03-19
---

# Diagram Reference Pack Redesign

## Scope guardrails (pilot bắt buộc)
- Pilot chỉ làm reference pack song song, không thay pack đang dùng.
- Không sửa trực tiếp trong pilot:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/generate-thesis-report-figures.mjs`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/thesis-mermaid-diagrams.mjs`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis-chapters/assets/figures/*`

## Final stack shortlist
- Khuyến nghị chính (validated): Hybrid Mermaid v11 + PlantUML + manifest/schema + visual diff gate.
- Backup 1: Mermaid-first fallback khi cần giảm độ phức tạp rollout.
- Backup 2: draw.io cho sketch/collab nhanh, nhưng artifact publish vẫn đi qua pack manifest + QA gates.

## Phase plan
| Phase | Status | Effort | File |
|---|---|---:|---|
| 01. Selection criteria + target stack | pending | 3h | `./phase-01-establish-selection-criteria-and-target-stack.md` |
| 02. Parallel pack structure + versioning | pending | 3h | `./phase-02-design-parallel-pack-structure-and-versioning.md` |
| 03. Publishing pipeline + quality gates | pending | 4h | `./phase-03-define-publishing-pipeline-and-quality-gates.md` |
| 04. Adoption rollout + rollback | pending | 3h | `./phase-04-define-adoption-rollout-and-rollback.md` |
| 05. Execution checklist + governance | pending | 3h | `./phase-05-execution-checklist-and-governance.md` |

## Main dependencies
- Inputs: researcher reports + scout report trong cùng plan folder.
- Existing assets contract: `resources/reports/thesis-chapters/assets/uml/*.mmd` và `.../figures/*.svg`.
- CI capabilities: `.github/workflows/` hiện chưa có pipeline chuyên render/QA diagram pack.
- Team agreement: tiêu chí quality gate, ngưỡng visual diff, policy release/rollback.

## Done definition
- Có đủ 5 phase files theo chuẩn section order.
- Có checklist triển khai theo phase, risk, security, rollback rõ.
- Có chiến lược adoption không đụng pipeline cũ ở pilot.

## Validation Log

### Session 1 — 2026-03-19
**Trigger:** Initial plan validation before implementation.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Cho giai đoạn pilot, bạn muốn chốt phạm vi stack như thế nào để cân bằng rủi ro và độ phủ UML?
   - Options: Mermaid-first (Recommended) | Hybrid ngay từ đầu | Mermaid + draw.io mix
   - **Answer:** Hybrid ngay từ đầu
   - **Rationale:** Quyết định này đổi baseline kiến trúc từ Mermaid-first sang hybrid, ảnh hưởng trực tiếp Phase 01 (stack decision), Phase 03 (pipeline support), và Phase 04 (rollout complexity).

2. **[Risks]** Bạn muốn ngưỡng visual diff cho quality gate đặt theo mô hình nào?
   - Options: 0.5/2.0 (Recommended) | 1.0/3.0 relaxed | Manual review only
   - **Answer:** 0.5/2.0 (Recommended)
   - **Rationale:** Chốt ngưỡng warning/block giúp giảm mơ hồ khi review và tạo gate CI định lượng, ảnh hưởng trực tiếp quality policy ở Phase 03.

3. **[Tradeoffs]** Bạn muốn cadence release + retention artifact cho diagram pack mới theo phương án nào?
   - Options: Sprint + 90d (Recommended) | Chapter + 180d | Tag-based + 30d
   - **Answer:** Sprint + 90d (Recommended)
   - **Rationale:** Chốt nhịp release và retention giúp thiết kế workflow release, chi phí lưu trữ, và khả năng rollback/audit nhất quán.

4. **[Governance]** Mô hình phê duyệt promote/revert và SLA rollback mục tiêu bạn muốn chốt là gì?
   - Options: Lead+QA, SLA15m (Recommended) | Single owner, SLA30m | Team consensus, SLA60m
   - **Answer:** Lead+QA, SLA15m (Recommended)
   - **Rationale:** Chốt ownership và SLA giúp Phase 04/05 có RACI rõ, giảm rủi ro phản ứng chậm khi sự cố release.

#### Confirmed Decisions
- Pilot stack: Hybrid Mermaid + PlantUML — đảm bảo độ phủ UML ngay từ đầu.
- Visual diff policy: Warning 0.5%, Block 2.0% — cân bằng chặt/chạy thực tế.
- Release cadence: Theo sprint; artifact retention 90 ngày.
- Governance: Tech Lead + QA đồng duyệt; rollback SLA mục tiêu <= 15 phút.

#### Action Items
- [ ] Cập nhật Phase 01 để phản ánh pilot hybrid ngay từ đầu.
- [ ] Cập nhật Phase 03 với ngưỡng visual diff 0.5%/2.0% và release/retention policy.
- [ ] Cập nhật Phase 04/05 với governance Lead+QA và SLA rollback <= 15 phút.

#### Impact on Phases
- Phase 01: Đổi strategy từ Mermaid-first sang hybrid Mermaid + PlantUML ngay pilot.
- Phase 03: Cố định gate visual diff warning 0.5%, block 2.0%; release theo sprint; retention 90 ngày.
- Phase 04: Chốt promote/revert governance (Lead+QA) và rollback SLA <= 15 phút.
- Phase 05: Chèn RACI/sign-off tương ứng governance đã chốt.

## Unresolved questions
- Có cần policy rõ cho `.drawio` trong PR: allowed/review-only/blocked?
- Có cần gate bổ sung cho font license/compliance trước publish?
