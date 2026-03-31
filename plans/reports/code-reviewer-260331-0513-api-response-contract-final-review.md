## Code Review Summary

### Scope
- Files:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/utils/response.util.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/utils/errors.util.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/serializers/problem-details.serializer.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/middleware/error-handler.middleware.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/middleware/rate-limit.middleware.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/middleware/__tests__/error-handler.test.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/device.controller.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/firmware.controller.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/telemetry.controller.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/health.routes.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/metrics.routes.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/lib/api/client.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/lib/utils/api-error.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/types/index.ts`
  - các hooks FE đã đổi để dùng parser mới (`use-create-device`, `use-delete-device`, `use-send-command`, `use-update-device*`, `use-mark-all-read`, `use-simulator`, `use-create-export`).
- LOC changed (subset review): +268 / -249
- Focus: API contract + error handling + frontend parser
- Scout findings:
  - `unwrap()` được dùng rộng trong FE API layer, nên thay đổi envelope detection có blast radius cao.
  - `createValidationError()` được gọi ở nhiều controller/service; thay đổi normalize có thể ảnh hưởng data shape lỗi field-level.
  - Luồng 401 refresh đã được chặn cho `/auth/login`, giảm race/loop khi login fail.

### Overall Assessment
Refactor contract theo hướng chuẩn hóa (`requestId`, `data`, RFC7807 `application/problem+json`) là đúng hướng, nhất quán tốt ở backend và parser frontend. Không thấy lỗi blocking về correctness trong phạm vi review.

### Critical Issues
- Không có.

### High Priority
- Không có.

### Medium Priority
1. **Mất extension details trong Problem Details payload**
   - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/serializers/problem-details.serializer.ts:46-55`
   - Liên quan call-site: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/firmware.controller.ts:217-221`
   - Vấn đề: serializer chỉ xuất các field cố định + `errors`, không pass-through các extension fields từ `error.details` (ví dụ `firmwareId` trong `STREAM_ERROR`). Điều này làm mất context debug/forensics ở client.
   - Tác động: giảm khả năng quan sát lỗi, nhất là lỗi runtime cần context định danh tài nguyên.

2. **Thiếu test hồi quy cho parser FE với payload RFC7807 đa biến thể**
   - File parser: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/lib/utils/api-error.ts:59-128`
   - Hiện trạng test đổi trong scope chỉ thấy backend error-handler test (`.../src/middleware/__tests__/error-handler.test.ts`).
   - Vấn đề: parser mới xử lý nhiều shape (`errors`, `detail`, nested details), nhưng chưa có test unit tương ứng trong diff để khóa behavior.
   - Tác động: dễ regress khi backend bổ sung biến thể lỗi mới.

### Low Priority
1. **So sánh Basic Auth password chưa dùng constant-time compare**
   - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/metrics.routes.ts:46-47`
   - Vấn đề: so sánh chuỗi trực tiếp `pwd !== password`.
   - Tác động: low (endpoint nội bộ), nhưng là hardening gap nhỏ về security hygiene.

### Edge Cases Found by Scout
- FE refresh interceptor đã tránh refresh khi request là `/auth/login` (`.../src/lib/api/client.ts:34-42`), giảm edge case loop sau login 401.
- Envelope unwrap chuyển từ check `success` sang check `requestId + data` (`.../src/lib/api/client.ts:88-97`); phù hợp contract mới, nhưng cần giữ tương thích nếu còn endpoint legacy ngoài scope.
- Validation parser FE ưu tiên `errors[]` rồi fallback `details` (`.../src/lib/utils/api-error.ts:59-98`), giúp chuyển tiếp mềm từ contract cũ sang mới.

### Positive Observations
- Chuẩn hóa lỗi RFC7807 được áp dụng đồng bộ ở middleware/rate-limit/routes đặc biệt.
- `requestId` được đưa vào success + error payload nhất quán.
- 202 Accepted cho async jobs (OTA/export) dùng helper thống nhất (`sendAccepted`) hợp lý.
- Test backend error handler pass: `vitest run error-handler` (10/10).

### Recommended Actions
1. (Medium) Quyết định rõ policy cho extension fields trong Problem Details: giữ strict minimal hay cho phép pass-through có kiểm soát; nếu chọn pass-through thì cập nhật serializer + contract docs.
2. (Medium) Bổ sung unit tests cho `api-error.ts` với ít nhất 4 cases: `errors[]`, `detail`, legacy `error.message`, nested `details`.
3. (Low) Hardening `metricsAuth` bằng so sánh constant-time.

### Metrics
- Type Coverage: N/A (chưa chạy full typecheck trong phiên review này)
- Test Coverage: N/A toàn repo; trong scope đã verify `error-handler` tests: 10 passed
- Linting Issues: N/A (không chạy lint full trong phiên review này)

### Merge Decision
- **Go** cho merge nội bộ, với khuyến nghị xử lý 2 mục Medium sớm sau merge hoặc trong follow-up patch nhỏ.

### Unresolved Questions
1. Contract chính thức có cho phép extension fields ngoài RFC7807 core (`code`, `requestId`, `errors`) hay không?
2. Có yêu cầu backward-compat tạm thời cho payload legacy `{ success, data }` ở bất kỳ service/gateway nào ngoài backend hiện tại không?