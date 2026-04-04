# Phase 02 — Thu thập evidence và chuẩn hóa dữ liệu nguồn

## Context links
- `./phase-01-scope-and-source-governance.md`
- `./research/researcher-01-vendor-report.md`
- `./research/researcher-02-community-forum-report.md`

## Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-04
- Description: thu thập evidence theo component, normalize thành format thống nhất để cross-validate.
- Priority: P1
- Implementation status: pending
- Review status: not-started

## Key Insights
- Vendor docs mạnh về correctness; community mạnh về failure mode thực địa.
- Evidence không normalize sẽ gây conflict giả.
- Cần tách rõ fact vs interpretation ngay từ bước nhập liệu.

## Requirements
- Mỗi evidence record có: source type, URL/path, version/date, snippet, component, claim mapping.
- Bắt buộc cover đủ 6 nhóm linh kiện.
- Mỗi nhóm phải có ít nhất: 1 vendor evidence + 1 community/forum evidence (nếu có).

## Architecture
- Data model chuẩn:
  - `SRC-xxx`: metadata nguồn
  - `EVD-xxx`: bằng chứng trích xuất
  - `CLM-xxx`: claim
  - `MAP`: EVD -> CLM
- Chuẩn hóa thuật ngữ: boot strap, power sequencing, sleep/wake, flow control, brownout.

## Related code files
- Files to modify: none.
- Files to create (future docs target):
  - `iot-vehicle-tracking-system-firmware/hardware-specs/programming/90-source-registry.md`
  - `iot-vehicle-tracking-system-firmware/hardware-specs/programming/91-claim-registry.md`
- Files to delete: none.

## Implementation Steps
1. Tạo source registry theo taxonomy P01.
2. Trích evidence snippets quan trọng theo component.
3. Normalize metadata version/date/variant.
4. Gắn evidence vào claim tạm thời.
5. Đánh dấu lỗ hổng evidence để feed P03.

## Todo list
- [ ] Build source registry draft.
- [ ] Build evidence table cho từng component.
- [ ] Tag evidence theo variant/SKU.
- [ ] Flag evidence gaps.

## Success Criteria
- Evidence table đủ 6 nhóm linh kiện.
- Mỗi claim critical có ít nhất một evidence candidate.
- Không còn evidence thiếu version context.

## Risk Assessment
- Risk: link community chết hoặc nội dung thay đổi.
- Risk: vendor doc nhiều revision gây lẫn phiên bản.
- Mitigation: lưu version/ref-id rõ trong metadata.

## Security Considerations
- Chỉ dùng nguồn công khai hợp lệ.
- Không trích dữ liệu nhạy cảm từ môi trường deploy nội bộ.

## Next steps
- Chuyển sang P03 để dựng cross-validation matrix và confidence grade.