# Phase 03 — Cross-validation matrix và confidence grading

## Context links
- `./phase-02-evidence-collection-and-normalization.md`
- `./research/researcher-01-vendor-report.md`
- `./research/researcher-02-community-forum-report.md`

## Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-04
- Description: xây matrix đối chiếu claim quan trọng và chấm confidence A/B/C.
- Priority: P1
- Implementation status: pending
- Review status: not-started

## Key Insights
- Claim critical cần dual evidence để giảm false confidence.
- Mâu thuẫn vendor/community phải được ghi explicit, không làm mờ.
- Confidence thấp không phải lỗi; lỗi là không đánh dấu rõ.

## Requirements
- Mỗi claim critical có matrix row gồm: claim, vendor evidence, community/forum evidence, conflict note, confidence.
- Publish gate cho claim critical: tối thiểu 1 vendor evidence + 1 field evidence.
- Confidence policy:
  - A: vendor rõ + community corroboration hoặc vendor đủ mạnh không mâu thuẫn.
  - B: có evidence nhưng còn thiếu context variant/version.
  - C: claim còn mơ hồ variant/version hoặc conflict đáng kể; bắt buộc warning + preconditions rõ khi publish.
- Có unresolved ledger cho câu hỏi chưa đóng.
<!-- Updated: Validation Session 1 - proof floor + confidence-C warning policy -->

## Architecture
- Matrix schema cốt lõi:
  - Claim ID
  - Component
  - Vendor ref
  - Community/forum ref
  - Match type (agree/partial/conflict)
  - Confidence
  - Action needed
- Conflict resolution precedence: vendor > repo issue reproducible > forum anecdotal.

## Related code files
- Files to modify: none.
- Files to create (future docs target):
  - `iot-vehicle-tracking-system-firmware/hardware-specs/programming/92-cross-validation-matrix.md`
  - `iot-vehicle-tracking-system-firmware/hardware-specs/programming/93-unresolved-questions.md`
- Files to delete: none.

## Implementation Steps
1. Lập danh sách claim critical theo component.
2. Điền row matrix từ evidence P02.
3. Đánh dấu agree/partial/conflict.
4. Chấm confidence A/B/C có rationale ngắn.
5. Tạo unresolved ledger với owner + quyết định cần thêm gì.

## Todo list
- [ ] Draft matrix cho toàn bộ claim critical.
- [ ] Apply confidence policy nhất quán.
- [ ] Compile unresolved questions list.
- [ ] Review conflict notes để tránh mơ hồ.

## Success Criteria
- 100% claim critical có confidence grade.
- 100% conflict có note và action rõ.
- Có danh sách unresolved dùng được cho vòng research tiếp theo.

## Risk Assessment
- Risk: over-trust community pattern không có vendor xác nhận.
- Risk: đánh confidence cảm tính.
- Mitigation: bắt buộc rationale ngắn cho từng grade.

## Security Considerations
- Không đưa quy trình bypass protection hay thao tác nguy hiểm ngoài mục đích phòng vệ/debug hợp pháp.

## Next steps
- Qua P04 để map matrix vào kiến trúc bộ tài liệu đích.