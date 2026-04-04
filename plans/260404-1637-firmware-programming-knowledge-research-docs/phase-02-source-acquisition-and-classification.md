# Phase 02 — Source Acquisition & Classification

## Context links
- Parent plan: [plan.md](plan.md)
- Vendor baseline: [researcher-01-vendor-report.md](research/researcher-01-vendor-report.md)
- Community/forum baseline: [researcher-02-community-forum-report.md](research/researcher-02-community-forum-report.md)
- Hardware index: `iot-vehicle-tracking-system-firmware/hardware-specs/index/hardware-specs-index.md`

## Overview
- Date: 2026-04-04
- Description: chuẩn hóa nguồn tài liệu theo taxonomy và trust level để làm đầu vào cross-validation.
- Priority: P1
- Implementation status: pending
- Review status: pending

## Key Insights
- Vendor sources đã mạnh cho constraints cứng; community/forum mạnh cho failure modes.
- Cần tách evidence class để tránh “forum anecdote” lấn át vendor facts.

## Requirements
- Mỗi source phải có metadata tối thiểu: title, URL, version/date, source class, trust level.
- Source classes: `vendor-primary`, `vendor-secondary`, `community-repo`, `forum-qa`.
- Gắn preliminary confidence A/B/C cho từng source item.

## Architecture
- Source catalog schema:
  - source_id
  - component
  - claim domains (boot/power/sleep/AT/GNSS/interrupt/storage/rtc)
  - class + trust + freshness
  - usage note

## Related code files
- Modify: none (planning only)
- Create: source-catalog plan artifacts (reports)
- Reference-only:
  - `iot-vehicle-tracking-system-firmware/hardware-specs/components/**`
  - `iot-vehicle-tracking-system-firmware/hardware-specs/index/hardware-specs-index.md`

## Implementation Steps
1. Import known sources từ 2 report đã có.
2. Normalize metadata format.
3. Tag claims domains per source.
4. Flag stale/variant-risky sources.

## Todo list
- [ ] Create source taxonomy map.
- [ ] Annotate trust/freshness for all primary sources.
- [ ] Mark sources needing re-check before publish.

## Success Criteria
- 100% source items có metadata đầy đủ.
- Không có source “unknown class”.
- Có danh sách risky sources cần extra validation.

## Risk Assessment
- Risk: version drift làm stale citation.
  - Mitigation: thêm freshness check trước final publish.
- Risk: vendor-secondary bị dùng như vendor-primary.
  - Mitigation: enforce class policy trong matrix.

## Security Considerations
- Chỉ dùng nguồn công khai, không đưa private links cần auth.

## Next steps
- Move to Phase 03: xây cross-validation matrix theo claim.
