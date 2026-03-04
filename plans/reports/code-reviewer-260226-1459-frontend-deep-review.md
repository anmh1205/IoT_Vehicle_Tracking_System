## Code Review Summary

### Scope
- Files: Frontend scope `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/**`
- LOC: large (multi-module), sampled trọng tâm auth, routing, API client, admin pages, realtime
- Focus: deep review frontend hiện trạng (không sửa code)
- Scout findings: có rủi ro kiểm soát truy cập theo UI-only, redirect boundary, type-safety rộng (`any`), và state realtime có thể phình

### Overall Assessment
- Kiến trúc tổng thể rõ (feature-based, tách hooks/services/components tốt).
- Tuy nhiên có vài điểm bảo mật và quyền truy cập cần ưu tiên xử lý trước khi release production.

### Critical Issues
- Không phát hiện lỗi mức Critical có bằng chứng chắc chắn từ frontend-only.

### High Priority
1) Thiếu chặn quyền ở page-level cho route nhạy cảm (chỉ ẩn ở navigation)
- Impact: user có thể truy cập trực tiếp URL nhạy cảm; nếu backend guard thiếu/không đồng bộ sẽ thành lộ chức năng quản trị.
- Evidence:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/users/page.tsx:165`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/firmware/page.tsx:95`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/exports/page.tsx:129`
  - So sánh với page có guard đúng:
    - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/system-admin/page.tsx:15`
    - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/system-status/page.tsx:12`

2) Redirect sau login chưa ràng buộc internal path
- Impact: nguy cơ open-redirect/phishing flow nếu attacker mồi URL `/login?redirect=...`.
- Evidence:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/features/auth/components/login-form.tsx:19`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/features/auth/components/login-form.tsx:46`

3) Token auth được giữ trong global client store
- Impact: tăng blast-radius khi có XSS (token đọc được từ JS runtime), trong khi app đã dùng cookie session (`withCredentials`).
- Evidence:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/lib/stores/auth-store.ts:15`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/lib/stores/auth-store.ts:29`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/lib/api/client.ts:12`

### Medium Priority
1) Cấu hình ảnh remote quá rộng (`hostname: '**'`)
- Impact: mở rộng bề mặt tấn công và khó kiểm soát nguồn ảnh.
- Evidence:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/next.config.ts:6`

2) Type-safety yếu do `any` xuất hiện ở service + page quan trọng
- Impact: giảm khả năng bắt lỗi compile-time, tăng bug runtime khi backend thay đổi schema.
- Evidence (mẫu):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/users/page.tsx:45`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/users/page.tsx:181`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/lib/api/users.ts:5`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/lib/api/customers.ts:5`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/lib/api/system-status.ts:4`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/lib/api/export.ts:26`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/types/index.ts:4`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/config/nav-config.ts:26`

3) State tiến độ export có thể tăng không giới hạn theo thời gian
- Impact: phiên dài + nhiều job sẽ tăng memory footprint trên client.
- Evidence:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/exports/page.tsx:131`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/exports/page.tsx:142`

### Low Priority
1) Inconsistency quyền giữa nav filter và page guard
- Impact: UX không nhất quán (mục thấy nhưng vào bị chặn, hoặc ngược lại).
- Evidence:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/hooks/use-nav.ts:6`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/app/dashboard/simulator/page.tsx:13`

2) Kiểm chứng chất lượng chưa chạy được trong môi trường hiện tại (thiếu deps cài đặt)
- Impact: chưa có bằng chứng lint/build pass cho phiên review này.
- Evidence:
  - `npm run lint` fail: `'eslint' is not recognized`
  - `npm run build` fail: `'next' is not recognized`

### Edge Cases Found by Scout
- Direct URL access bypass nav filtering cho route quản trị nếu page không tự check quyền.
- Redirect param boundary: giá trị redirect do query có thể bị set ngoài luồng middleware.
- Realtime progress map không có cơ chế dọn trạng thái cũ.
- Data contract backend/frontend lỏng do `any`, dễ vỡ khi response shape thay đổi.

### Positive Observations
- Tổ chức thư mục theo feature rõ ràng, dễ mở rộng.
- Socket listeners có cleanup (`off`) đúng pattern.
- Một số khu vực đã có guard quyền tốt (system-admin/system-status/simulator).

### Recommended Actions (ưu tiên, theo YAGNI/KISS/DRY)
1. KISS + Security: chuẩn hóa guard quyền ở page-level cho mọi route nhạy cảm (users/firmware/exports) trước release.
2. KISS + Security: ràng buộc `redirect` chỉ nhận internal path hợp lệ.
3. DRY + Security: gom policy auth (token/cookie/redirect/401) thành một chuẩn duy nhất để giảm sai lệch liên module.
4. YAGNI + Type-safety: thay `any` ở đường dữ liệu nóng (users, firmware, exports, system-status) bằng type tối thiểu đủ dùng trước.
5. KISS: giới hạn/cleanup `progressMap` theo job active gần đây.
6. Ops gate: cài dependencies và chạy lại lint/build để có bằng chứng pass.

### Metrics
- Type Coverage: chưa đo tự động; ước tính thấp-trung bình do mật độ `any` cao ở service/page.
- Test Coverage: không có số liệu trong phiên review này.
- Linting Issues: chưa xác định vì chưa chạy được lint (thiếu deps runtime trong env review).

### Unresolved Questions
- Backend đã enforce RBAC cứng cho `/users`, `/firmware`, `/exports` chưa?
- Chính sách auth mục tiêu là cookie-only hay hybrid cookie+bearer?
- Có yêu cầu cho phép redirect sang domain ngoài sau login không?