## Code Review Summary

### Scope
- Files: 34 modified files under `Tracking_Backend`, `Tracking_Frontend`, `Tracking_MqttBridge`, `Tracking_Mobile`, `Tracking_EMQX`, `Tracking_Grafana`, `Tracking_NPM`, `Tracking_PostgreSQL`
- LOC: ~310 insertions / ~85 deletions
- Focus: uncommitted hardening changes only
- Scout findings: edge cases manually validated from diff + call paths (auth refresh recursion, password-reset delivery gap, MQTT handler parity, config boundary checks)

### Overall Assessment
Hardening direction đúng (RBAC, MQTT auth parity, infra tightening), nhưng còn 2 lỗi mức Critical có thể gây outage chức năng auth/reset. Một số mục plan đã done một phần nhưng chưa hoàn tất theo acceptance (đặc biệt tests và reset contract hoàn chỉnh).

### Critical Issues

1) Password reset flow bị “success but unusable” (regression nghiệp vụ nghiêm trọng)
- Impact: API reset password trả thành công nhưng không trả/không gửi temporary credential hoặc reset token; tài khoản bị đổi mật khẩu mà không có kênh lấy mật khẩu mới -> lockout.
- Evidence:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Backend/src/api/controllers/auth.controller.ts:224-233`
  - Snippet:
    ```ts
    const temporaryPassword = `Tmp${randomBytes(12).toString('base64url')}!`;
    const newHash = await hashPassword(temporaryPassword);
    ...
    sendOk(res, { message: 'Password reset successfully. Share temporary password via secure channel.' });
    ```
- Why critical: thay đổi này phá contract vận hành reset và có thể khóa user hàng loạt nếu được dùng production.

2) Axios refresh flow có thể tự chờ chính nó khi `/auth/refresh` trả 401 (deadlock/hang)
- Impact: request chain có thể treo vô hạn khi refresh fail; UI stuck, request queue không thoát.
- Evidence:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/lib/api/client.ts:39-55`
  - Snippet:
    ```ts
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = apiClient.post('/auth/refresh')...
    }
    ...
    await refreshPromise;
    ```
  - Với chính request `/auth/refresh` bị 401: interceptor của request đó vào nhánh `await refreshPromise` trong khi `refreshPromise` chính là promise của nó.
- Why critical: gây kẹt luồng auth failure handling toàn frontend.

### High Priority
- Không có issue High độc lập sau khi tách 2 critical ở trên.

### Medium / Low Risks

1) Plan conformance chưa đủ ở Phase 01/02/03 (Medium)
- Thiếu bằng chứng test regression cho security paths (todo của plan chưa được tick).
- Chưa thấy audit log deny cho admin-sensitive actions như plan yêu cầu.
- References:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260226-1442-codebase-hardening-and-quality-improvements/phase-01-critical-security-fixes.md:48-57`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260226-1442-codebase-hardening-and-quality-improvements/phase-02-auth-and-session-hardening.md:56-64`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260226-1442-codebase-hardening-and-quality-improvements/phase-03-realtime-and-mqtt-reliability.md:51-59`

2) Frontend image allowlist có risk regression hiển thị ảnh (Low)
- `next.config.ts` chỉ allow `https://localhost|*.localhost|tracking.local|*.tracking.local`.
- Nếu hệ thống dùng CDN hoặc domain ảnh khác, ảnh sẽ fail runtime.
- Reference: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/next.config.ts:6-11`

3) Mobile secure-config check dùng `contains('localhost')` (Low)
- Có thể cho qua vài host string không mong muốn nếu chỉ kiểm tra substring, không parse hostname chuẩn.
- Reference: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Mobile/lib/core/config/app_config.dart:28-42`

### Edge Cases Found by Scout
- Auth-failure path khi refresh endpoint cũng fail -> interceptor recursion/deadlock.
- Password reset workflow không có delivery channel sau khi loại plaintext response.
- MQTT auth parity đã phủ status/event/firmware; cần test unauthorized trên từng topic để tránh silent drop regressions.

### Positive Observations
- RBAC backend cho admin routes đã được siết đúng hướng:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Backend/src/api/routes/users.routes.ts:13-18`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Backend/src/api/routes/auth.routes.ts:20-24`
- Metrics đã fail-closed khi production thiếu mật khẩu:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Backend/src/api/routes/metrics.routes.ts:15-22`
- Open redirect ở login đã được chặn bằng internal-path check:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Frontend/src/features/auth/components/login-form.tsx:19-23`
- MQTT bridge auth parity tốt hơn (status/event/firmware đều verify token):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_MqttBridge/src/handlers/status.handler.ts:46-50`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_MqttBridge/src/handlers/event.handler.ts:55-59`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_MqttBridge/src/handlers/firmware.handler.ts:41-45`

### Previously Identified Risks: Fixed Status
- RBAC thiếu ở user-management routes: **Fixed**.
- Metrics production thiếu password có thể lộ endpoint: **Fixed** (trả 503 fail-closed).
- Open redirect từ login redirect param: **Fixed**.
- MQTT listener `endAsync` undefined shutdown bug: **Fixed**.
- MQTT ingest auth parity thiếu ở status/event/firmware: **Fixed**.
- Temp password yếu + plaintext response: **Partially fixed** (randomness tăng, plaintext bỏ) nhưng **phát sinh Critical regression** do không có delivery/reset-token contract.

### Recommended Actions
1. Chặn merge cho đến khi xử lý 2 critical (reset delivery contract + refresh deadlock guard).
2. Bổ sung tests bắt buộc cho auth refresh fail path, reset-password flow, unauthorized MQTT topics.
3. Cập nhật trạng thái/todo plan theo thực tế done/chưa done để đúng conformance.

### Metrics
- Type Coverage: N/A (chưa chạy typecheck trong review này)
- Test Coverage: N/A (chưa chạy test suite trong review này)
- Linting Issues: N/A (chưa chạy lint trong review này)

### Unresolved Questions
- Kênh chính thức để phát hành reset credential/token là gì (email OTP/link hay admin out-of-band có audit)?
- Refresh endpoint dự kiến hoạt động không cần `requireAuth` hay dùng cơ chế session khác?
