# Phase 01 — Scope & Baseline Lock

## Context links
- Parent plan: [plan.md](plan.md)
- Scout baseline: [scout-01-firmware-programming-scope.md](scout/scout-01-firmware-programming-scope.md)
- Vendor research: [researcher-01-vendor-report.md](research/researcher-01-vendor-report.md)
- Community/forum research: [researcher-02-community-forum-report.md](research/researcher-02-community-forum-report.md)

## Overview
- Date: 2026-04-04
- Description: khóa scope kỹ thuật và variant baseline trước khi viết tài liệu.
- Priority: P1
- Implementation status: pending
- Review status: pending

## Key Insights
- Lỗi lớn nhất là variant drift (SIM7600 SKU/manual, LIS3DH vs LIS3DSH).
- Code hiện tại dùng `imu_lis3dsh.*`, không còn `imu_lis3dh.*`; tài liệu phải nói rõ.
- Nhiều modem pins đang `GPIO_NUM_NC`; cần ghi rõ assumptions/caveats theo board variant.

## Requirements
- Chốt canonical component list (part number + variant scope).
- Chốt boundaries: tài liệu programming, không sửa runtime code.
- Chốt audience và expected depth cho mỗi nhóm nội dung.

## Architecture
- Artifact `scope-baseline` chứa:
  - component registry
  - variant assumptions
  - out-of-scope list
  - unresolved baseline questions

## Related code files
- Modify: none (planning only)
- Create: baseline notes under plan reports if needed
- Reference-only:
  - `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
  - `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
  - `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
  - `iot-vehicle-tracking-system-firmware/main/src/power_mgr.c`
  - `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c`

## Implementation Steps
1. Extract component/variant facts from scout + research inputs.
2. Build scope table: component, variant, evidence owner, confidence floor.
3. Record hard exclusions (no runtime code edit, no speculative hardware claims).
4. Publish unresolved baseline questions list.

## Todo list
- [ ] Lock component registry and variants.
- [ ] Lock documentation boundaries and deliverables.
- [ ] Lock unresolved baseline questions.

## Success Criteria
- Scope table complete, no ambiguous component naming.
- Variant assumptions explicit and reviewable.
- Baseline questions documented for later closure.

## Risk Assessment
- Risk: nhầm LIS3DH/LIS3DSH semantics.
  - Mitigation: tách section riêng, cấm reuse register claims không evidence.
- Risk: SIM7600 manual version mismatch.
  - Mitigation: mọi AT claim gắn manual version.

## Security Considerations
- Không đưa secrets, private credentials, provisioning data vào docs.
- Không đưa thao tác có thể phá hủy thiết bị khi thiếu guardrails.

## Next steps
- Move to Phase 02: thu thập/chuẩn hóa nguồn và classification.
