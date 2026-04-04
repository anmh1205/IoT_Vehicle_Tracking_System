# Phase 03 — Cross-validation Matrix

## Context links
- Parent plan: [plan.md](plan.md)
- Source phase: [phase-02-source-acquisition-and-classification.md](phase-02-source-acquisition-and-classification.md)
- Vendor report: [researcher-01-vendor-report.md](research/researcher-01-vendor-report.md)
- Community/forum report: [researcher-02-community-forum-report.md](research/researcher-02-community-forum-report.md)

## Overview
- Date: 2026-04-04
- Description: thiết kế matrix để xác nhận claim quan trọng bằng nhiều lớp nguồn.
- Priority: P1
- Implementation status: pending
- Review status: pending

## Key Insights
- Matrix là lõi chống nhầm lẫn: mỗi claim phải thấy rõ khớp/chênh giữa vendor và field evidence.
- Confidence cần reflect cả quality nguồn và độ phù hợp với variant board thực tế.

## Requirements
- Mỗi claim quan trọng có ít nhất 2 evidence items, ưu tiên 1 vendor + 1 field.
- Matrix columns bắt buộc:
  - claim_id, component, claim_text
  - vendor_evidence, community_evidence, forum_evidence
  - consistency_status (aligned/conflict/partial)
  - confidence (A/B/C)
  - firmware impact
  - action_required

## Architecture
- 3 lớp claim groups:
  1) hard constraints (boot/power/timing/register semantics)
  2) implementation patterns (state machine/retry/parser/sleep flow)
  3) field failure modes (brownout/UART loss/wake miss)

## Related code files
- Modify: none (planning only)
- Create: matrix artifacts in plan reports
- Reference-only:
  - `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
  - `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
  - `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c`

## Implementation Steps
1. Define claim inventory from scope.
2. Attach evidence tuples by source class.
3. Score consistency + confidence.
4. Produce conflict list + resolution actions.

## Todo list
- [ ] Build claim inventory table.
- [ ] Fill evidence mapping for each claim.
- [ ] Resolve/mark conflicting claims.

## Success Criteria
- Claim-critical coverage >= 95% with matrix rows.
- Every row has confidence + action.
- Conflict rows explicitly unresolved or resolved.

## Risk Assessment
- Risk: false confidence from repeated anecdotal posts.
  - Mitigation: confidence cap when vendor evidence missing.
- Risk: overfitting matrix to current code, not hardware truth.
  - Mitigation: label code-derived observations separately.

## Security Considerations
- Cảnh báo rõ các thao tác power/reset có thể gây loop/reset storm nếu áp dụng sai.

## Next steps
- Move to Phase 04: thiết kế information architecture tài liệu đích.
