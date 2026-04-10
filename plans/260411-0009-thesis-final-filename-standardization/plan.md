---
title: "Plan bulk filename standardization for thesis final"
description: "Safe staged migration to clean thesis final filenames and sync all references/build outputs."
status: completed
priority: P2
effort: 12h
branch: feature/cicd
tags: [planning, thesis, filename-standardization, migration]
created: 2026-04-11
---

# Mục tiêu
Chuẩn hóa tên file trong `resources/reports/thesis/final`, loại prefix bẩn (`99-*`, `thesis-99-*`), giữ build ổn định, không gãy ref.

# Phạm vi
- In-scope: tên file + mọi điểm tham chiếu liên quan (script, markdown, latex, mermaid map, docs lệnh nếu có).
- Out-of-scope: chỉnh nội dung học thuật, đổi kiến trúc pipeline, thêm tool mới không cần thiết.

# Nguyên tắc
- KISS: 1 naming policy, 1 execution flow.
- YAGNI: không thêm abstraction/tooling dài hạn.
- DRY: dùng 1 manifest rename làm nguồn sự thật.

# Canonical policy tóm tắt
- Nguồn học thuật (`.md/.tex/.mmd/.svg/.png/.pdf`): kebab-case sạch, bỏ prefix bẩn.
- Build artifacts (`.log/.aux/.tmp`): đặt theo basename canonical của `.tex` chính hoặc dồn thư mục build.
- Template ngoại lệ: cho phép giữ tên gốc vendor/template; nếu cần dùng nội bộ tạo alias sạch nhưng không phá traceability.

# Phase roadmap
1. [phase-01-inventory-and-naming-freeze.md](./phase-01-inventory-and-naming-freeze.md) — Chốt inventory + policy + cấm drift.
2. [phase-02-dependency-scan-and-manifest-design.md](./phase-02-dependency-scan-and-manifest-design.md) — Quét dependency và thiết kế manifest rename.
3. [phase-03-dry-run-and-conflict-resolution.md](./phase-03-dry-run-and-conflict-resolution.md) — Dry-run, chặn xung đột, chốt cut list.
4. [phase-04-controlled-rename-and-reference-sync.md](./phase-04-controlled-rename-and-reference-sync.md) — Completed: rename có kiểm soát + sync refs.
5. [phase-05-build-basename-alignment-and-validation.md](./phase-05-build-basename-alignment-and-validation.md) — Completed: căn basename build theo `.tex` canonical + validate.
6. [phase-06-rollback-playbook-and-cutover-criteria.md](./phase-06-rollback-playbook-and-cutover-criteria.md) — Completed: rollback theo stage + tiêu chí cutover.

# Dependency trọng yếu cần khóa cứng
- `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`: map `.mmd` -> `.svg` theo filename.
- `resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs`: đọc refs figure từ markdown và fail nếu thiếu map.
- Prefix hiện tại trộn: `99-*`, `thesis-*`, `thesis-build*`.

# Deliverables
- 01 policy rõ ràng + ví dụ before/after theo loại file.
- 01 dependency matrix + method update.
- 01 dry-run manifest có stop criteria.
- 01 execution order + rollback + validation checklist.

# Exit criteria
- Không còn prefix bẩn theo ban-list.
- Figure generation pass, không `Missing Mermaid mapping`.
- LaTeX output basename khớp canonical `.tex`.
- Không broken path/ref/link sau migration.

# Unresolved questions
- None (blocking).

## Validation Log

### Session 1 — 2026-04-11
**Trigger:** Initial plan creation validation before implementation.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Chốt canonical basename cho file `.tex` chính là gì?
   - Options: thesis-final-main (Recommended) | thesis-final-report | Giữ tên 99 hiện tại | Tên khác
   - **Answer:** thesis-final-report
   - **Rationale:** Basename canonical quyết định toàn bộ output PDF/log/aux/tmp, command build, và tiêu chí pass/fail ở phase validation.

2. **[Scope]** Chính sách artifact build (`.aux/.log/.tmp/.pdf`) sau cutover nên là gì?
   - Options: Untracked trừ PDF final (Recommended) | Track tất cả artifacts | Dồn vào build/ và untracked | Giữ như hiện tại
   - **Answer:** Untracked trừ PDF final (Recommended)
   - **Rationale:** Giữ repo sạch, giảm nhiễu validation/grep, vẫn giữ output bàn giao quan trọng.

3. **[Tradeoffs]** Có cần giữ alias/tương thích tạm cho tên file cũ (`99-*`, `thesis-build*`) không?
   - Options: Không giữ alias (Recommended) | Giữ 1 chu kỳ migration | Giữ song song lâu dài | Chỉ alias cho file chính
   - **Answer:** Không giữ alias (Recommended)
   - **Rationale:** One-shot cutover giảm drift và technical debt; tránh phải duy trì hai hệ naming.

4. **[Architecture]** Chuẩn naming cho figure/diagram nên khóa theo hướng nào?
   - Options: chapter-topic-id (Recommended) | figure-id only | Giữ mixed cũ + cleanup | Custom riêng
   - **Answer:** chapter-topic-id (Recommended)
   - **Rationale:** Tăng khả năng truy vết theo chương/chủ đề, vẫn unique và dễ kiểm tra tự động.

#### Confirmed Decisions
- Canonical main tex basename: `thesis-final-report` — làm chuẩn cho build output.
- Artifact policy: untracked tất cả build artifacts, chỉ giữ PDF final cần bàn giao.
- Compatibility strategy: không giữ alias tên cũ.
- Figure naming strategy: `chapter-topic-id`.

#### Action Items
- [ ] Cập nhật phase 01 để khóa canonical basename = `thesis-final-report` và policy naming `chapter-topic-id`.
- [ ] Cập nhật phase 05 để khóa rule build output theo `thesis-final-report` + artifact untracked.
- [ ] Cập nhật phase 06 để loại bỏ nhánh alias, chốt no-alias cutover.
- [ ] Cập nhật checklist phase liên quan để phản ánh quyết định mới.

#### Impact on Phases
- Phase 01: Cập nhật bảng naming rule + exception policy theo quyết định canonical basename, no-alias, chapter-topic-id.
- Phase 02: Khóa manifest schema và token strategy theo `chapter-topic-id`.
- Phase 05: Cập nhật explicit basename/build hygiene theo `thesis-final-report`, artifact untracked trừ PDF final.
- Phase 06: Cập nhật cutover criteria theo no-alias strategy và bỏ unresolved cũ.
