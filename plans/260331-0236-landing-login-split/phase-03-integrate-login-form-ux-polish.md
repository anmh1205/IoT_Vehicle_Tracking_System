# Phase 03 — Integrate form + UX polish

## Mục tiêu
Nhúng form login hiện có vào shell mới mà giữ nguyên contract auth, đồng thời polish vi mô cho usability.

## Files tác động
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/auth/components/login-form.tsx`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/login/page.tsx`

## Step thực thi
1. Giữ nguyên toàn bộ call path `authServices.login -> setAuth -> router.replace`.
2. Chuẩn hóa spacing/size input-button để form dễ scan trong cột phải.
3. Giữ nguyên các state message: `session-expired`, `signed-out`, 401/network/5xx.
4. Tinh chỉnh microcopy ngắn gọn theo context landing (không đổi semantics nghiệp vụ).
5. Kiểm tra keyboard flow: tab order, Enter submit, toggle show/hide password accessible.

## Tiêu chí done
- Snapshot hành vi login trước/sau không đổi (chỉ đổi presentation).
- Error/info alert hiển thị đúng và không che CTA chính.
- Form vẫn hoạt động ổn định trên Chrome/Edge mobile viewport phổ biến.

## Rủi ro
- Refactor markup gây lệch register binding của react-hook-form.
- Tăng cognitive load nếu landing copy quá dài.
- Accessibility regression nếu icon button/label bị đổi sai.
