---
title: "Thesis figure and table audit plan"
description: "Plan to audit canonical LaTeX figure/table numbering, asset mapping, and safe rename scope without editing thesis sources yet."
status: pending
priority: P2
effort: "12-16h"
branch: feature/cicd
tags: [thesis, latex, assets, figures, tables]
created: 2026-04-11
---

# Thesis figure and table audit

## Goal
Use `resources/reports/thesis/final/thesis-final-report.tex` as canonical source, then inventory figures/tables, normalize numbering rules, audit duplicate/orphan/mapping risk, plan safe renames, and define validation/regeneration gates.

## Inputs
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/codebase-summary.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-overview-pdr.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/thesis-final-report.tex`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/research/researcher-01-naming-index-audit.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/research/researcher-02-duplicate-risk-audit.md`

## Confirmed findings
- Canonical source is `.tex`, not markdown.
- Thesis uses `\thesisfigurecaption` and `\thesistabletitle`, not standard float/label/ref flow.
- Caption/index are hand-authored; LoF/LoT can drift from body.
- Ch4 cloud captions `Hình 4.18..4.28` map against asset names `4.15..4.25`.
- Ch4 results captions `Hình 4.29..4.47` map against asset names `4.20..4.38`.
- Table numbering is inconsistent: `1.2A`, `1.3.1A`, `2.3.4A`, `3.2.2A..K`, `4.1.1A`, plus unnumbered titles.
- Need duplicate semantic audit between Ch3 solution and Ch4 implementation/results.
- Need orphan asset review and Mermaid render dependency check before any rename.

## Phases
1. `phase-01-thesis-source-and-asset-inventory.md` — canonical source map, asset classes, counter/macro inventory.
2. `phase-02-numbering-and-caption-normalization.md` — target numbering grammar and caption policy.
3. `phase-03-duplicate-orphan-and-mapping-audit.md` — semantic overlap, orphan assets, caption-to-asset mapping gaps.
4. `phase-04-safe-rename-and-latex-rewire-plan.md` — safe rename sequence, LaTeX rewiring rules, rollback points.
5. `phase-05-validation-and-regeneration-checklist.md` — compile, render, diff, and acceptance checklist.

## Dependencies
- P2 depends on P1 inventory.
- P3 depends on P1 inventory and P2 normalization rules.
- P4 depends on P3 audited mapping and dependency list.
- P5 depends on P4 proposed changes and pipeline knowledge.

## Decision rules
- Keep scope to planning only; no thesis/assets edits.
- Treat `.tex` as canonical source for the migration design and execution ledger.
- Standardize the approved full asset taxonomy in rollback-safe batches; avoid extra renames outside that taxonomy.
- Do not assume scripts are safe to rename around until mapping is proven.

<!-- Updated: Validation Session 1 - decision rules aligned to approved migration scope -->

## Deliverables
- This overview plan.
- Five executable phase plans for a later implementation pass.

## Unresolved questions
- Whether LoF/LoT are fully hand-written or partially macro-generated.
- Whether some Ch4 assets live outside `assets/figures`.
- Whether thesis formatting rules require preserving suffix forms like `A/B/C` in visible captions.

## Validation Log

### Session 1 — 2026-04-11
**Trigger:** Initial plan creation validation before any implementation work.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Bạn muốn scope chỉnh sửa sau này dừng ở mức chuẩn hóa numbering/mapping trên nền macro hiện tại, hay nâng luôn sang figure/table float + label/ref chuẩn của LaTeX?
   - Options: Giữ macro hiện tại (Recommended) | Migrate chuẩn LaTeX | Chưa chốt
   - **Answer:** Migrate chuẩn LaTeX
   - **Rationale:** Quyết định này đổi hướng Phase 02/04/05 từ “ổn định trên macro cũ” sang chuẩn hóa numbering + mapping đồng thời thiết kế đường chuyển sang float, caption, label, ref, LoF/LoT chuẩn hơn.

2. **[Assumptions]** Với các chỉ mục kiểu `1.2A`, `3.2.2A`, `4.1.1A`, bạn muốn quy tắc hiển thị sau cùng như thế nào?
   - Options: Chỉ giữ suffix cho sibling (Recommended) | Giữ nguyên suffix legacy | Renumber phẳng toàn bộ
   - **Answer:** Chỉ giữ suffix cho sibling (Recommended)
   - **Rationale:** Quy tắc này chốt grammar hiển thị cho numbering, giúp phân biệt biến thể cùng gốc với mục mới và giảm ambiguity khi migrate caption/index.

3. **[Scope]** Khi gặp hình/caption Chương 3 và Chương 4 gần trùng nghĩa, bạn muốn xử lý theo hướng nào?
   - Options: Giữ cả hai, tách vai trò (Recommended) | Ưu tiên gộp bớt | Chỉ flag, chưa đụng
   - **Answer:** Giữ cả hai, tách vai trò (Recommended)
   - **Rationale:** Quyết định này giữ semantic coverage của luận văn nhưng bắt buộc caption policy phải phân tách rõ design/solution ở Ch3 với implementation/result ở Ch4.

4. **[Tradeoffs]** Mức độ rename asset nào là chấp nhận được cho đợt sửa sau?
   - Options: Rename tối thiểu (Recommended) | Chuẩn hóa toàn bộ taxonomy | Không rename asset
   - **Answer:** Chuẩn hóa toàn bộ taxonomy
   - **Rationale:** Quyết định này mở rộng Phase 04 từ rename tối thiểu sang taxonomy cleanup có kiểm soát, đòi hỏi ledger, batching, regeneration, và rollback chặt hơn.

#### Confirmed Decisions
- LaTeX migration scope: Migrate chuẩn LaTeX — chấp nhận mở rộng scope để đưa figure/table về float + label/ref chuẩn.
- Numbering policy: Chỉ giữ suffix cho sibling — suffix chỉ dành cho biến thể cùng hình/bảng gốc.
- Duplicate semantic handling: Giữ cả hai, tách vai trò — Ch3 nhấn mạnh thiết kế, Ch4 nhấn mạnh triển khai/kết quả.
- Rename scope: Chuẩn hóa toàn bộ taxonomy — đổi tên assets rộng hơn nhưng phải có ledger và rollback.

#### Action Items
- [x] Update Phase 02 to include standard LaTeX float/label/ref migration target.
- [x] Update Phase 02 numbering rules to preserve suffixes only for true sibling variants.
- [x] Update Phase 04 to plan full taxonomy standardization instead of minimal rename.
- [x] Update Phase 05 validation gates to cover float/label/ref and generated LoF/LoT integrity.

#### Impact on Phases
- Phase 02: Replace macro-compatible target with standard LaTeX migration target; preserve suffix only for sibling variants; strengthen Ch3 vs Ch4 caption-role separation.
- Phase 04: Expand rename scope from smallest viable set to full taxonomy standardization with batched rollback-safe migration.
- Phase 05: Add validation gates for float/caption/label/ref integrity and generated LoF/LoT consistency after migration.
