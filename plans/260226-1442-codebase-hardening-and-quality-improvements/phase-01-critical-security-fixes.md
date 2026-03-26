# Phase 01 — Critical security fixes

## Context links
- Research backend: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/research-backend-best-practices-260226-1442.md`
- Findings scope root: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/`
- Plan overview: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260226-1442-codebase-hardening-and-quality-improvements/plan.md`

## Overview
- Date: 2026-02-26
- Priority: P1
- Status: completed
- Goal: đóng các lỗ hổng security impact cao, ít thay đổi nhất.

## Key Insights
- RBAC thiếu ở user-management routes => privilege escalation risk.
- Temp password sinh yếu + trả plaintext => credential compromise risk.
- Metrics route có thể lộ nếu password trống ở production context.
- Fix sớm giúp các phase sau không build trên nền policy sai.

## Requirements
### Functional
- Bắt buộc role guard cho auth/users admin paths.
- Thay flow temp password: token-based reset hoặc one-time secret, không trả plaintext.
- Metrics endpoint fail-closed nếu thiếu auth config trong production.

### Non-functional
- Backward compatible cho API contract chính (trừ điểm bắt buộc security).
- Có audit log cho access denied/sensitive admin actions.

## Architecture
- Security perimeter chuẩn hóa theo tầng route guard + config validation + secret handling.
- Runtime policy:
  - `AuthN` (JWT validity) -> `AuthZ` (role/scope) -> `handler`.
  - Metrics exposure gated bởi explicit secure config; default deny.
- Secret lifecycle: generate strong, hash/store, deliver qua reset channel thay vì API plaintext.

## Related code files
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/auth.routes.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/users.routes.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/auth.controller.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/metrics.routes.ts`

## Implementation Steps
1. Inventory toàn bộ user-management/admin endpoints và map role matrix tối thiểu.
2. Áp guard middleware thống nhất cho routes nêu trên; deny-by-default.
3. Refactor temp-password endpoint sang secure reset contract (no plaintext response).
4. Add config validation startup: production + missing metrics password => disable route hoặc fail start.
5. Add tests: unauthorized/forbidden cases, metrics exposure cases, password flow regression.
6. Add audit/security notes vào docs vận hành.

## Todo list
- [x] Chốt role matrix tối thiểu cho admin/user-manager.
- [x] Thêm guard đồng nhất cho auth/users routes.
- [x] Loại bỏ plaintext temp password khỏi API response.
- [x] Cài fail-closed logic cho metrics in production.
- [x] Bổ sung test security regression.

## Success Criteria
- Tất cả admin-sensitive routes trả 401/403 đúng khi thiếu quyền.
- Không còn endpoint nào trả plaintext credential/tạm mật khẩu.
- Production không thể expose `/metrics` khi thiếu auth config.
- Test security mới pass.

## Risk Assessment
- Risk: break automation cũ phụ thuộc plaintext temp password.
  - Mitigation: cung cấp migration note + fallback window ngắn có feature flag.
- Risk: sai role mapping gây chặn nhầm nghiệp vụ.
  - Mitigation: role matrix review với owner domain trước merge.

## Security Considerations
- Principle of least privilege.
- Fail closed by default.
- Không log secrets/raw token/password.
- Rate-limit cho endpoint nhạy cảm liên quan account management.

## Next Steps
- Bàn giao policy và contract mới cho Phase 02 (frontend refresh/login UX).
- Sync với Phase 03/04 để bảo đảm metrics/auth policy consistent cross services.

## Unresolved questions
- Password reset channel chính thức là email, SMS, hay admin out-of-band?