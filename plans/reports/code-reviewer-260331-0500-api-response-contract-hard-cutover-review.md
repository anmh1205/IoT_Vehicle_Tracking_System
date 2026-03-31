## Code Review Summary

### Scope
- Files: backend + frontend contract hard-cutover scope from request
- Focus: RFC7807 error + thin success envelope migration
- Scout findings: dependent frontend hooks still parse legacy `error.message`; backend validation details normalization can drop actionable context

### Overall Assessment
Refactor direction is correct (problem+json, centralized serializers, requestId propagation). However, there are compatibility gaps that can break error UX and potentially mis-unwrap payloads on frontend.

### Critical Issues
- None found.

### High Priority
1. Frontend still reads legacy error envelope (`response.data.error.message`) instead of RFC7807 `detail`
   - Impact: user sees generic fallback errors after backend cutover.
   - Evidence:
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/hooks/mutations/use-create-export.ts:12`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/hooks/use-update-device.ts:7`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/simulator/hooks/use-simulator.ts:133`
   - Minimal fix: shared extractor with fallback order `data.detail -> data.message -> data.error.message -> error.message` and replace all ad-hoc usage.

2. `unwrap` heuristic is too broad (`'data' in payload` only)
   - Impact: any non-envelope object containing `data` key may be incorrectly unwrapped.
   - Evidence:
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/lib/api/client.ts:88`
   - Minimal fix: tighten envelope check to `payload && typeof payload === 'object' && 'requestId' in payload && 'data' in payload`.

### Medium Priority
1. Validation detail normalization drops useful non-string context
   - Impact: diagnostics can degrade (e.g. arrays of ids become repeated `Invalid value`).
   - Evidence:
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/utils/errors.util.ts:53`
   - Minimal fix: stringify primitive non-string items (`String(item)`) before fallback to generic message.

2. API contract hard-cutover incomplete across dependents (scout)
   - Impact: mixed expectations between backend contract and frontend consumers.
   - Evidence: multiple frontend hooks still target legacy shape (same group as high issue #1).
   - Minimal fix: migrate all error extractors to one shared parser.

### Low Priority
1. `sendOk(res, { success: true })` pattern remains in several controllers (payload-level `success`, not envelope-level)
   - Impact: semantic ambiguity after envelope hard-cutover.
   - Evidence example:
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/device.controller.ts:83`
   - Minimal fix: replace payload to explicit domain intent (`{ deleted: true }`, etc.) where practical.

### Edge Cases Found by Scout
- Dependent frontend hooks still parse old error shape and silently downgrade to generic messages.
- Objects with intrinsic `data` field may be misinterpreted as envelope by `unwrap`.
- Validation error arrays with non-string items lose specificity.

### Positive Observations
- ProblemDetails serializer is centralized and reusable.
- `application/problem+json` is correctly set in error middleware and route-specific errors.
- Success envelope is thin and consistent (`data`, `requestId`, optional `meta`).
- Added safeguard against login refresh loop in axios interceptor.

### Recommended Actions
1. Fix frontend error extraction compatibility first (shared parser).
2. Tighten `unwrap` envelope detection by requiring `requestId`.
3. Improve validation normalization to preserve useful detail values.
4. Run focused regression on auth refresh + mutation error toasts.

### Metrics
- Type Coverage: chưa đo trong lượt review này.
- Test Coverage: chỉ thấy cập nhật `error-handler` tests; chưa có coverage cho frontend contract parsing.
- Linting Issues: chưa chạy lint trong lượt review này.

### Unresolved Questions
- Có chấp nhận giai đoạn tương thích ngắn cho frontend (`detail` + legacy `error.message`) hay bắt buộc hard cutover tuyệt đối ngay lập tức?
- Có endpoint nào trả raw object chứa key `data` nhưng không phải envelope không?
