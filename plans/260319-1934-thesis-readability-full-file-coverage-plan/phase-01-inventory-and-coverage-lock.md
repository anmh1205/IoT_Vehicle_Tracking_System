# Phase 01 — Inventory and coverage lock

## Context Links
- Source root: `resources/reports/thesis/chapters/`
- Validation artifact: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`
- Plan entry: [`plan.md`](./plan.md)
- Coverage detail: [`coverage-matrix.md`](./coverage-matrix.md)

## Overview
- Priority: High
- Status: Planned
- Mục tiêu: khóa inventory toàn bộ thesis theo source files 00-14, chia rewrite waves và chặn rủi ro sửa nhầm file final.

## Key Insights
- Resources taxonomy mới đã tách thesis thành source chapters và final artifacts; plan cũ bám file final là không còn đúng source of truth.
- Readability không chỉ nằm ở câu chữ; còn nằm ở mục lục, nhịp chuyển chapter files, bảng, ma trận, checklist và code block.
- Chương 3-4 là P1, nhưng plan vẫn phải assign owner rõ cho `00`, `13`, `14`.

## Requirements
- Lập bản đồ toàn bộ source files `00-14` theo nhóm nội dung.
- Gắn mức ưu tiên readability cho từng file/cụm file.
- Xác định vùng cấm bỏ sót: `00`, `13`, `14`, kết luận chương, install guide, asset paths.
- Khóa quy tắc không dùng `final/` làm source edit chính.

## Architecture
- Wave A: `00-bia-va-phan-dau.md`.
- Wave B: `01-02`.
- Wave C: `03-06`.
- Wave D: `07-10`.
- Wave E: `11-12`.
- Wave F: `13-14` + final assembled QA.

## Related Code Files
- Source of truth: `resources/reports/thesis/chapters/00-bia-va-phan-dau.md` → `resources/reports/thesis/chapters/14-phu-luc.md`
- Validation artifact: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`

## Implementation Steps
1. Trích inventory các source files 00-14 và map vào phases.
2. Xác định phase owner theo chapter source file, không theo line-range của file final.
3. Khóa rewrite rules, non-goals và execution model source → artifact.
4. Dùng assembled artifact để xác nhận continuity, không để nó chi phối ownership.
5. Chốt coverage matrix để không còn dangling file hoặc dangling section.

## Todo List
- [ ] Hoàn tất file map `00-14`.
- [ ] Xác định vùng rủi ro bị sót.
- [ ] Chốt rewrite waves theo source files.
- [ ] Chốt exit criteria coverage.
- [ ] Xác nhận `final/` chỉ là validation artifact.

## Success Criteria
- Không còn source file nào chưa được gán phase.
- Có danh sách rõ các vùng dễ bị quên, gồm `00`, `13`, `14` và continuity QA ở `final/`.
- Scope chỉ tập trung readability, không drift sang sửa pipeline hay artifact packaging.

## Risk Assessment
- Rủi ro lớn nhất là vẫn sửa theo file final cũ rồi lệch workflow mới.
- Rủi ro thứ hai là sửa đúng source files nhưng quên QA assembled continuity.

## Security Considerations
- Khi rà phụ lục/config, không làm lộ hoặc thêm secret thật.
- Chỉ giữ thông tin demo/tài liệu nếu đã nằm trong source gốc.

## Next Steps
- Chuyển sang Phase 02 để làm sạch `00-bia-va-phan-dau.md`.
