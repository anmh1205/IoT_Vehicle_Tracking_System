---
title: "Thesis LaTeX deep audit and error mapping"
description: "Plan audit sâu theo line-number để map lỗi citation/layout/assets trước vòng sửa nội dung."
status: completed
priority: P1
effort: 9h
branch: feature/cicd
tags: [thesis, latex, audit, citation, layout]
created: 2026-04-09
---

# Overview
Mục tiêu: tạo bản đồ lỗi đầy đủ, truy vết được, ưu tiên fix rõ ràng cho vòng sửa sau. Không sửa thesis trong plan này.

## Phase roadmap
1. [Phase 01 - Baseline input and audit rulebook](./phase-01-baseline-input-and-audit-rulebook.md) — `completed` (100%)
2. [Phase 02 - Line-index harvesting from tex/log/assets](./phase-02-line-index-harvesting-tex-log-assets.md) — `completed` (100%)
3. [Phase 03 - Cross-matrix mapping and severity triage](./phase-03-cross-matrix-mapping-and-severity-triage.md) — `completed` (100%)
4. [Phase 04 - Double-check gate and prioritized fix queue](./phase-04-double-check-gate-and-prioritized-fix-queue.md) — `completed` (100%)

## Key outputs
- Checklist pass/fail cho citation-caption-source-layout.
- Severity rubric: critical/high/medium/low.
- Quy trình lấy line-number chuẩn, repeatable.
- Ma trận đối chiếu `.tex/.log/.assets` và hàng đợi sửa ưu tiên.

## Dependencies
- Phase 02 consumed Phase 01 output (`audit-rulebook-thesis-latex.md`).
- Phase 03 consumed Phase 02 output (`audit-raw-line-index.md`, `audit-raw-issues.md`).
- Phase 04 consumed Phase 03 output (`audit-cross-matrix.md`, `audit-severity-triage.md`, `audit-pass-fail-checklist.md`).

## Scope boundaries
- In scope: audit, mapping, prioritization, handoff package.
- Out of scope: sửa nội dung thesis, refactor template, render pipeline rewrite.

## Inputs linked
- `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`
- `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.log`
- `resources/reports/thesis/final/assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-38.svg`
- `plans/reports/researcher-260409-1725-latex-figure-caption-citation-audit-checklist.md`
- `plans/reports/planner-260409-1727-thesis-latex-deep-audit-input-synthesis.md`

## Validation Log

### Session 1 — 2026-04-09
**Trigger:** initial plan creation
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Chuẩn trích dẫn nguồn hình bạn muốn chốt cho toàn luận văn là gì?
   - Options: Chuẩn nội bộ + số trang (Recommended) | IEEE style | APA style | Giữ tạm hiện trạng
   - **Answer:** IEEE style
   - **Rationale:** Quyết định này khóa format citation-source thống nhất cho mọi hình và ảnh hưởng trực tiếp rulebook audit.

2. **[Assumptions]** Với hình do chính bạn tự dựng, bạn muốn xử lý ghi nguồn thế nào?
   - Options: Không ghi nguồn (Recommended) | Ghi 'Tác giả tự thực hiện' | Tùy từng chương
   - **Answer:** Không ghi nguồn (Recommended)
   - **Rationale:** Loại bỏ toàn bộ dòng nguồn dư cho hình tự làm, giảm nhiễu và tránh sai chuẩn theo yêu cầu chấm luận văn.

3. **[Scope]** Mục tiêu sửa bìa theo mẫu bạn muốn ở mức nào?
   - Options: Khớp gần như tuyệt đối (Recommended) | Khớp cấu trúc chính | Chỉ sửa lỗi lớn
   - **Answer:** Khớp gần như tuyệt đối (Recommended)
   - **Rationale:** Đặt chất lượng mục tiêu cao cho checklist cover, tránh phải revise nhiều vòng sát deadline.

4. **[Risks]** Bạn muốn ngưỡng fail cho lỗi bảng tràn (Overfull) là mức nào?
   - Options: > 5pt là fail (Recommended) | > 10pt là fail | Chỉ fail khi mất nội dung
   - **Answer:** > 5pt là fail (Recommended)
   - **Rationale:** Siết ngưỡng để bắt sớm lỗi tràn có nguy cơ cắt chữ khi in.

#### Confirmed Decisions
- Citation style: IEEE style — đồng bộ toàn luận văn.
- Self-authored figures: không ghi nguồn — đúng yêu cầu học thuật đã chốt.
- Cover target: khớp gần như tuyệt đối với template mẫu.
- Overfull threshold: >5pt là fail.

#### Action Items
- [x] Cập nhật Phase 01 với policy citation IEEE và quy tắc hình tự dựng không ghi nguồn.
- [x] Cập nhật Phase 02/03 để áp ngưỡng fail overfull >5pt vào harvesting + triage.
- [x] Cập nhật Phase 04 với gate bìa khớp gần như tuyệt đối.

#### Impact on Phases
- Phase 01: khóa chuẩn citation IEEE + rule không ghi nguồn cho hình tự dựng.
- Phase 02: bắt buộc thu và đánh cờ mọi overfull >5pt.
- Phase 03: severity/checklist phải phản ánh ngưỡng >5pt là FAIL layout.
- Phase 04: gate hoàn tất phải gồm cover compliance mức gần như tuyệt đối.
