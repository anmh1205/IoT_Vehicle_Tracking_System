# Phase 01 — Scope + UI baseline lock

## Mục tiêu
Chốt ranh giới task và baseline UX hiện tại để so sánh trước/sau, tránh trượt scope.

## Files tác động
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/login/page.tsx` (review only)
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/auth/components/login-form.tsx` (review only)
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/lib/api/client.ts` (review only, contract check)

## Step thực thi
1. Xác nhận route `/login` hiện tại chỉ render `LoginForm` giữa màn hình.
2. Xác nhận `LoginForm` đang chứa đầy đủ logic submit/error/reason redirect.
3. Xác nhận `apiClient` interceptor bỏ qua refresh cho login request; không đổi logic này.
4. Chốt danh sách thứ **không làm**: signup, reset password, auth provider mới, thay API schema.
5. Chốt content tối thiểu panel trái (headline + 2-3 benefit bullets + visual block placeholder).

## Tiêu chí done
- Có baseline rõ: layout hiện tại, message states, auth flow invariants.
- Có scope guard để team implement không lấn sang backend/auth contract.
- Có checklist acceptance cho desktop + mobile.

## Rủi ro
- Scope creep từ yêu cầu marketing (thêm nhiều CTA/section).
- Đụng logic login khi refactor UI (regression submit/error).
- Thiếu baseline metric, khó chứng minh hiệu quả UX.
