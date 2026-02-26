# Phase 02 — Auth and session hardening

## Context links
- Research frontend/mobile: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/research-frontend-mobile-practices-260226-1442.md`
- Phase 01 dependency: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260226-1442-codebase-hardening-and-quality-improvements/phase-01-critical-security-fixes.md`
- Plan overview: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260226-1442-codebase-hardening-and-quality-improvements/plan.md`

## Overview
- Date: 2026-02-26
- Priority: P1
- Status: pending
- Goal: ổn định auth/session boundary SSR-CSR, giảm logout sai, vá open redirect nội bộ.

## Key Insights
- Axios interceptor lấy token trực tiếp từ global store có risk boundary SSR/CSR.
- 401 handler hiện clear auth + hard redirect ngay, bỏ qua refresh flow đã tồn tại.
- Login redirect query param chưa validate internal path.
- Page-level RBAC chưa nhất quán giữa các dashboard pages.

## Requirements
### Functional
- Chuẩn hóa token source theo môi trường (server/client) rõ ràng.
- Thực thi refresh-first strategy trước khi logout cứng.
- Validate redirect target: chỉ cho internal safe paths.
- Áp dụng RBAC guard đồng nhất cho các trang dashboard nhạy cảm.

### Non-functional
- UX: giảm forced logout không cần thiết.
- Security: loại bỏ open redirect class issue.

## Architecture
- Session flow target:
  1) Request thất bại 401.
  2) Single refresh attempt (debounced/locked).
  3) Retry request nếu refresh thành công.
  4) Logout có kiểm soát nếu refresh thất bại.
- Redirect policy: `returnTo` phải match whitelist prefix nội bộ (`/dashboard`, `/profile`, ...).
- RBAC: shared guard utility tái dùng cho page/server loader, tránh copy logic.

## Related code files
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/lib/api/client.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/lib/stores/auth-store.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/lib/api/auth.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/features/auth/components/login-form.tsx`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/users/page.tsx`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/firmware/page.tsx`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/exports/page.tsx`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/system-admin/page.tsx`

## Implementation Steps
1. Thiết kế auth-boundary matrix: server-only, client-only, shared-safe.
2. Chuẩn hóa interceptor dùng refresh queue/lock để tránh refresh storm.
3. Đổi 401 handling sang refresh-first + fallback logout.
4. Thêm helper validate `returnTo` và thay thế mọi parse trực tiếp query param.
5. Trích RBAC check thành module dùng chung, áp vào pages chưa guard.
6. Viết test cho redirect validation, refresh race, RBAC route gating.

## Todo list
- [ ] Chốt boundary cho token/session access.
- [ ] Implement refresh-first 401 flow.
- [ ] Validate login redirect internal path.
- [ ] Đồng bộ RBAC guard across dashboard pages.
- [ ] Bổ sung tests cho auth/session regressions.

## Success Criteria
- 401 không logout ngay khi refresh còn hợp lệ.
- Không redirect tới external/unsafe path từ login query.
- Pages users/firmware/exports enforce role tương đương chuẩn system-admin.
- Regression tests pass.

## Risk Assessment
- Risk: dead loop refresh khi token invalid liên tục.
  - Mitigation: hard cap retry=1 + circuit breaker.
- Risk: RBAC over-restrict khiến user hợp lệ bị chặn.
  - Mitigation: test matrix role x page trước merge.

## Security Considerations
- Không expose refresh token qua JS-readable channel nếu tránh được.
- Normalize auth error handling để không leak reason chi tiết.
- Ghi log security events mức vừa đủ, không chứa PII nhạy cảm.

## Next Steps
- Feed refresh/session behavior cho mobile alignment ở Phase 04.
- Reuse RBAC utility pattern cho maintainability work ở Phase 05.

## Unresolved questions
- Có yêu cầu hỗ trợ deep-link redirect ngoài domain chính (subdomain trusted) không?