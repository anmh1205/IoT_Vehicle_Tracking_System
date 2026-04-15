# Phase 02 — Thesis hardware scope mapping and error catalog

## Context links
- [Plan overview](./plan.md)
- [Phase 01](./phase-01-hardware-baseline-and-evidence-matrix.md)
- [Thesis LaTeX](../../resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex)

## Overview
- Priority: P0
- Status: Planned
- Goal: Quét toàn bộ thesis, lập catalog đầy đủ các đoạn hardware sai hoặc dễ gây hiểu nhầm “mua module sẵn”.

## Key insights
- Thesis chứa nhiều cụm “module” hợp lệ cho software, nhưng hardware phải chuyển sang “khối phần cứng/khối chức năng” khi nói về PCB tích hợp.
- Các vùng rủi ro cao: chương 3, chương 4, phần tóm tắt kết quả, BOM, mô tả test phần cứng.

## Requirements
### Functional
1. Khoanh vùng tất cả section hardware liên quan.
2. Gắn nhãn từng lỗi: `terminology`, `architecture-mismatch`, `component-mismatch`, `figure-caption-mismatch`, `bom-mismatch`.
3. Ưu tiên sửa theo mức ảnh hưởng: High/Medium/Low.

### Non-functional
- Không bỏ sót section hardware ngoài chương 3-4.
- Mỗi lỗi phải có line reference trong file tex.

## Architecture
- Input: file tex full + evidence matrix
- Processing: grep theo keyword + đọc theo cụm section
- Output: error catalog theo nhóm lỗi

## Related code files
### Modify
- `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex` (phase sau)

### Create
- `reports/thesis-hardware-error-catalog.md`

## Implementation steps
1. Dò section có từ khóa phần cứng (MCU, modem, IMU, power, schematic, PCB, BOM, antenna).
2. Đọc full các đoạn trọng điểm, đánh dấu claim lệch với hardware baseline.
3. Lập catalog theo format: `id`, `line-range`, `current-text`, `issue-type`, `rewrite-direction`, `proof-link`.
4. Chốt backlog rewrite cho Phase 03/04.

## Todo list
- [ ] Quét full thesis theo từ khóa hardware
- [ ] Lập catalog lỗi có line-range
- [ ] Gán mức ưu tiên
- [ ] Chốt backlog rewrite

## Success criteria
- Có danh sách lỗi đầy đủ, đủ chi tiết để rewrite không mò lại từ đầu.

## Risk assessment
- Rủi ro: line drift khi sửa lớn làm lệch tham chiếu line.
- Giảm thiểu: dùng anchor theo section label + cụm text nhận diện, không phụ thuộc line tuyệt đối.

## Security considerations
- Không có thao tác nhạy cảm; chỉ phân tích nội dung học thuật nội bộ repo.

## Next steps
- Bắt đầu rewrite lõi kiến trúc phần cứng ở Phase 03.
