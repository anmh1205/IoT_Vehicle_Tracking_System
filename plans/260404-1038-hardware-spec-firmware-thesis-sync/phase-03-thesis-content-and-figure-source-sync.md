# Phase 03 — Thesis content and figure source sync

## Context links
- Baseline gate: `./phase-01-hardware-baseline-and-gap-freeze.md`
- Scout targets: `./scout/scout-01-firmware-thesis-target-files.md`
- Thesis draft: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-readability-draft.md`
- Figure sources:
  - `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`
  - `resources/reports/thesis/final/assets/uml/*.mmd`

## Overview
- Priority: P1
- Status: pending
- Description: Lập kế hoạch đồng bộ narrative luận văn + source diagram theo hardware baseline đã freeze.

## Key Insights
- Draft hiện dùng naming có thể lệch với netlist thực tế.
- Pipeline figure chạy theo markdown-reference và diagram source map.
- Nếu text và source không đồng bộ, regenerate sẽ ra hình đúng cú pháp nhưng sai nội dung.

## Requirements
<!-- Updated: Validation Session 1 - draft+mirror and canonical modem -->
- Functional:
  - Chuẩn hóa thuật ngữ phần cứng xuyên suốt thesis draft + bản mirror (`...readability-draft.md` và `...hoan-chinh.md`).
  - Dùng canonical modem name `SIM7600CE-T`; IMU narrative theo hướng migrate `LIS3DSH`.
  - Cập nhật đoạn mô tả power tree, modem interface, sensor bus.
  - Đồng bộ caption + reference key giữa markdown và mermaid source.
- Non-functional:
  - KISS: chỉ sửa phần liên quan hardware sync.
  - DRY: dùng 1 glossary/canonical naming trong plan execution, tránh nhiều biến thể.

## Architecture
- Nguồn sự thật: baseline table (Phase 01).
- Lớp nội dung:
  - Markdown thesis narrative.
  - Mermaid/uml source cho figures.
- Luồng: update text references -> update diagram definitions -> đảm bảo key match renderer pipeline.

## Related code files
- Modify:
  - `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-readability-draft.md`
  - `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md` (nếu cần mirror bản final)
  - `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`
  - `resources/reports/thesis/final/assets/uml/*.mmd`
  - `resources/reports/thesis/final/assets/mermaid-thesis-config.json` (nếu key/config cần cập nhật)
- Create: none.
- Delete: none.

## Implementation Steps
1. Quét thesis draft để xác định toàn bộ chỗ dùng naming cũ/không canonical.
2. Lập danh sách figure IDs liên quan modem/IMU/power-tree.
3. Cập nhật text/caption theo canonical naming đã freeze.
4. Đồng bộ diagram sources tương ứng (mjs + mmd).
5. Cross-check markdown references với figure source map trước khi render.

## Todo list
- [ ] Chốt glossary tên phần cứng dùng trong thesis.
- [ ] Cập nhật phần mô tả power architecture.
- [ ] Cập nhật phần modem interface và control signals.
- [ ] Cập nhật phần IMU/sensor bus theo model chuẩn.
- [ ] Đảm bảo mọi figure reference có source tương ứng.

## Success Criteria
- Không còn naming conflict high-confidence trong thesis draft.
- Tất cả figure key được tham chiếu trong markdown đều tồn tại trong source.
- Narrative firmware-hardware-thesis nhất quán với baseline.

## Risk Assessment
- Risk: sửa text nhiều gây drift với bản `...hoan-chinh.md`.
  - Mitigation: định nghĩa policy mirror rõ (mirror toàn phần hay chọn lọc).
- Risk: mermaid source đổi tên key gây lỗi render chain.
  - Mitigation: bắt buộc mapping table `old_key -> new_key` trước khi đổi.

## Security Considerations
- Kiểm tra trước khi publish để không lộ thông tin nhạy cảm không cần thiết (serials, nội dung nội bộ ngoài scope).
- Không thêm dữ liệu nhận dạng cá nhân vào thesis assets.

## Next steps
- Chuyển sang Phase 04 để regenerate figure và validate nhất quán output.
- Cung cấp diff summary cho Phase 05 review gate.
