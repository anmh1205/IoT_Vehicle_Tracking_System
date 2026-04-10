# Context Links
- Root plan: `./plan.md`
- Phase 03: `./phase-03-dry-run-and-conflict-resolution.md`
- Scripts:
  - `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`
  - `resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs`

# Overview
- Priority: P1
- Status: completed
- Brief: Rename + sync refs hoàn tất; scope giữ nguyên.

# Key Insights
- Rename source trước, generated sau (hoặc regenerate) là đường an toàn nhất.
- `assets/figures/*` là output; không rename thủ công từng file generated.
- Update refs phải theo manifest token map, không replace tự phát.

# Requirements
- Functional:
  - Apply rename theo `manifest-approved` đúng thứ tự.
  - Sync refs ở `.md/.tex/.mjs/docs commands`.
  - Regenerate figures sau khi source+refs đã sync.
- Non-functional:
  - Atomic theo stage; fail ở stage nào rollback stage đó.
  - Log đầy đủ record thành công/thất bại.

# Architecture
- Stage S1: rename nguồn tài liệu (`.md/.tex/.mmd`), chưa đụng artifacts.
- Stage S2: sync references trong script/docs.
- Stage S3: regenerate figures (`.svg/.png`) từ source canonical.
- Stage S4: dọn legacy generated/temporary theo policy.

# Related Code Files
- Modify (kế hoạch):
  - `resources/reports/thesis/final/*.md`
  - `resources/reports/thesis/final/*.tex`
  - `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`
  - `resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs`
  - `docs/**/*.md` (nếu có command/path cứng)
- Create (kế hoạch): execution logs theo phase
- Delete (kế hoạch): legacy generated files không còn tham chiếu

# Implementation Steps
1. Snapshot trước execution (git checkpoint/tag nhẹ).
2. Apply Stage S1 theo manifest-approved: rename `.mmd`, `.md`, `.tex`, `.pdf source` nếu thuộc policy.
3. Apply Stage S2 token replacement trong `.md/.tex/.mjs/docs`.
4. Sync/verify `diagramByFileName` coverage sau rename `.mmd`.
5. Chạy regenerate figures để xuất `.svg/.png` mới theo basename canonical.
6. Xóa generated legacy không còn ref sau khi verify regenerate pass.
7. Ghi execution log theo `manifest.id` + status.

# Todo List
- [x] Create execution checkpoint.
- [x] Run S1 rename source set.
- [x] Run S2 reference sync set.
- [x] Run S3 figure regeneration.
- [x] Run S4 legacy cleanup and logging.

# Success Criteria
- Tất cả record trong manifest-approved được apply hoặc có exception approved.
- Không còn token ref cũ trong `.md/.tex/.mjs`.
- Figures regenerate đủ theo danh sách refs.

# Risk Assessment
- Rủi ro: rename source xong quên regenerate -> missing figures.
- Mitigation: S3 là gate bắt buộc trước qua phase 5.

# Security Considerations
- Chỉ thao tác trong whitelist path `resources/reports/thesis/final` (+ docs nếu có ref path).
- Không chạy batch rename recursive ngoài manifest.

# Next Steps
- Sang phase 5 để alignment basename build + validation đầy đủ.

## Execution order (hard)
1. `.mmd` source rename
2. `.md/.tex` filename rename
3. cập nhật refs nội dung `.md/.tex`
4. cập nhật script mapping `.mjs`
5. regenerate `assets/figures/*.svg/*.png`
6. cleanup legacy generated assets

## Stop criteria during execution
- Bất kỳ rename command trả lỗi path/collision.
- Mapping coverage mismatch sau cập nhật `.mjs`.
- Figure regeneration fail (`Missing Mermaid mapping` hoặc render fail).
- Ref verify sau S2 còn token cũ critical.
