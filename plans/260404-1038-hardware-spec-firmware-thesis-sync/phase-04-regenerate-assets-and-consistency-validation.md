# Phase 04 — Regenerate assets and consistency validation

## Context links
- Firmware plan: `./phase-02-firmware-alignment-with-netlist.md`
- Thesis plan: `./phase-03-thesis-content-and-figure-source-sync.md`
- Renderer scripts:
  - `resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs`
  - `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`

## Overview
- Priority: P2
- Status: pending
- Description: Lập kế hoạch regenerate assets và kiểm tra tính nhất quán giữa text, source, output figures.

## Key Insights
- Chuỗi render phụ thuộc reference trong markdown; sai key sẽ fail hoặc thiếu hình.
- Rủi ro chính không phải syntax mà là semantic mismatch sau khi đổi naming.
- Cần validation theo checklist thay vì eyeballing rời rạc.

## Requirements
<!-- Updated: Validation Session 1 - impacted-only + mirror consistency -->
- Functional:
  - Regenerate figures theo phạm vi impacted-only cho nhóm hardware naming/power tree/modem control.
  - Validate asset tồn tại, không broken reference, và caption khớp nội dung.
  - Kiểm tra consistency giữa thesis text và figure labels trên cả `...readability-draft.md` và `...hoan-chinh.md`.
- Non-functional:
  - DRY: một checklist validation dùng cho tất cả figure nhóm hardware.
  - KISS: không thêm pipeline mới, tận dụng script hiện có.

## Architecture
- Input: markdown references + diagram sources.
- Process: `generate-thesis-report-figures.mjs` gọi nguồn diagram và render SVG.
- Validation layers:
  1) existence check,
  2) reference integrity check,
  3) semantic consistency check theo canonical table.

## Related code files
- Modify:
  - `resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs` (nếu cần fix mapping logic)
  - `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`
  - `resources/reports/thesis/final/assets/figures/*.svg` (regenerated artifacts)
  - `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-readability-draft.md` (nếu chỉnh lại reference)
- Create: none (ngoài artifact được script tạo lại trong thư mục figures hiện có).
- Delete: chỉ xóa artifact stale nếu không còn reference.

## Implementation Steps
1. Liệt kê danh sách figure impacted từ Phase 03 diff plan.
2. Chạy regenerate theo script hiện hữu.
3. Đối chiếu output SVG với danh sách references trong markdown.
4. Chạy consistency pass theo canonical naming table.
5. Ghi nhận mismatch và route fix về đúng nguồn (markdown hoặc diagram source).

## Todo list
- [ ] Tạo checklist impacted figures.
- [ ] Regenerate toàn bộ figure trong phạm vi impacted.
- [ ] Validate không còn missing/broken references.
- [ ] Validate semantic labels khớp canonical naming.
- [ ] Chốt danh sách artifact stale cần loại bỏ.

## Success Criteria
- Tất cả figure impacted được render thành công.
- Không còn missing references trong thesis draft.
- Label/caption của figure nhất quán với nội dung text và baseline.

## Risk Assessment
- Risk: script render phụ thuộc môi trường local (font/path/package).
  - Mitigation: ghi rõ prereq và giữ command chuẩn trong checklist release.
- Risk: figure regenerate đè file cũ làm mất dấu thay đổi quan trọng.
  - Mitigation: bắt buộc diff review theo nhóm figure trước khi chốt.

## Security Considerations
- Không nhúng metadata nhạy cảm vào file SVG output.
- Giới hạn update trong thư mục thesis assets đã chỉ định.

## Next steps
- Bàn giao báo cáo validation cho Phase 05.
- Nếu còn mismatch semantic, quay lại Phase 03 theo vòng lặp ngắn.
