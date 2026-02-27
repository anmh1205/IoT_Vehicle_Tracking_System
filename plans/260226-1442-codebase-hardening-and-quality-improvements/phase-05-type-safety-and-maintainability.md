# Phase 05 — Type safety and maintainability

## Context links
- Plan overview: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260226-1442-codebase-hardening-and-quality-improvements/plan.md`
- Phase 02 auth/session: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260226-1442-codebase-hardening-and-quality-improvements/phase-02-auth-and-session-hardening.md`
- Phase 03 realtime: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260226-1442-codebase-hardening-and-quality-improvements/phase-03-realtime-and-mqtt-reliability.md`
- Phase 04 infra config: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260226-1442-codebase-hardening-and-quality-improvements/phase-04-mobile-and-infra-config-hardening.md`

## Overview
- Date: 2026-02-26
- Priority: P2
- Status: completed
- Goal: giảm debt kiểu dữ liệu và chuẩn hóa maintainability guardrails sau hardening.

## Key Insights
- `any` hotspots làm suy yếu compile-time guarantees ở API/hooks.
- `next/image` remotePatterns quá rộng làm tăng risk tải ảnh không kiểm soát.
- Các phase trước tạo policy mới, cần consolidate để tránh drift.

## Requirements
### Functional
- Giảm `any` theo thứ tự risk cao: auth/session API contracts, telemetry payload contracts.
- Thu hẹp `next/image` remotePatterns về allowlist thật sự dùng.
- Chuẩn hóa shared types/helpers để tránh lặp.

### Non-functional
- Tăng readability/testability.
- Giảm regression qua typing chặt hơn.

## Architecture
- Type boundary strategy:
  - External input -> runtime validation -> typed domain object.
  - Shared contract package/module (hoặc shared folder) cho frontend/backend bridge points.
- Maintainability guardrails:
  - ESLint/TS rules định hướng cấm `any` mới ở khu vực critical.
  - Config centralization cho image domains/security-sensitive constants.

## Related code files
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/lib/api/**/*.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/lib/hooks/**/*.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/next.config.ts`
- Các module type liên quan auth/telemetry contracts trong backend/bridge/frontend.

## Implementation Steps
1. Lập inventory `any` hotspots theo impact (auth > telemetry > UI phụ).
2. Thay thế dần bằng explicit interfaces/types + generic constraints tối thiểu.
3. Bổ sung runtime guards tại boundary nơi dữ liệu external đi vào typed layer.
4. Thu hẹp `remotePatterns` về domain/protocol/path cần thiết.
5. Cập nhật lint/type checks để ngăn debt quay lại ở vùng critical.
6. Rà soát trùng lặp helper/types sau khi chuẩn hóa.

## Todo list
- [x] Chốt danh sách `any` ưu tiên cao.
- [x] Refactor types cho API/hooks critical.
- [x] Siết `next/image` remotePatterns.
- [x] Thiết lập guardrails lint/type cho vùng nhạy cảm.
- [x] Dọn duplicate type/helper.

## Success Criteria
- `any` giảm rõ rệt ở auth/session + telemetry flows.
- `next/image` chỉ cho phép domain/pattern cần thiết.
- Type/lint checks phát hiện sớm contract mismatch.
- Không phát sinh duplicate type definitions chính.

## Risk Assessment
- Risk: thay type gây lỗi dây chuyền compile.
  - Mitigation: incremental refactor theo module + CI typecheck mỗi bước.
- Risk: siết remotePatterns làm hỏng ảnh hợp lệ.
  - Mitigation: thống kê domain thực dùng trước khi chặn.

## Security Considerations
- Runtime validation vẫn bắt buộc; type-only không đủ bảo mật.
- Domain allowlist giảm SSRF/content injection qua image loading.

## Next Steps
- Chuyển checklist hardening thành quy ước thường trực trong docs/rules.
- Theo dõi lỗi production 2 tuần để đánh giá hiệu quả plan.

## Unresolved questions
- Có muốn bật rule cứng `no-explicit-any` toàn repo hay chỉ vùng critical trước?