# Phase 02 — Backend response layer refactor

## Context links
- `phase-01-contract-design-and-migration-strategy.md`
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/utils/response.util.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/middleware/error-handler.middleware.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/middleware/request-id.middleware.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/utils/errors.util.ts`

## Overview
- Priority: P1
- Status: pending
- Mục tiêu: refactor tầng response dùng contract mới, tập trung shared layer trước endpoint migration.

## Key Insights
- Current centralized helpers là leverage lớn; refactor ở đây cho hiệu ứng toàn hệ thống.
- `error-handler.middleware.ts` đang là choke point lý tưởng để enforce RFC7807.
- Nếu contract types không tách riêng, controllers sẽ tiếp tục copy-paste shape lỗi.

## Requirements
- Functional:
  - Thêm typed contract cho success/error.
  - Chuẩn hóa serializer cho RFC7807 profile.
  - Bổ sung version gate resolver (header/route based).
- Non-functional:
  - Giữ backward compatibility default.
  - Tránh duplicate serializer logic giữa middleware và helper.
  - Dễ test unit/integration.

## Architecture
<!-- Updated: Validation Session 1 - remove v1/v2 resolver -->
- Components:
  - `ProblemDetailsSerializer`: transform `ApiError|unknown` -> RFC7807 response.
  - `SuccessResponseBuilder`: build envelope mỏng có `data/meta?` + bắt buộc `requestId`.
  - Không dùng `ResponseVersionResolver`; chỉ còn một contract response duy nhất.
- Data flow:
  - Controller throw error -> error middleware -> serializer -> response.
  - Controller success -> response helper -> builder -> response.
- KISS guardrail: không thêm abstraction tầng domain, chỉ tập trung transport layer.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/utils/response.util.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/middleware/error-handler.middleware.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/utils/errors.util.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/types/express.d.ts`
- Create:
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/contracts/api-response.contract.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/serializers/problem-details.serializer.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/serializers/success-response.serializer.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/utils/response-version.util.ts`
- Delete:
  - None

## Implementation Steps
1. Tạo contract interfaces/types cho v1/v2 response.
2. Refactor `errors.util.ts` để luôn có normalized `code` + structured details.
3. Implement problem-details serializer hỗ trợ extension fields + safe fallback 500.
4. Refactor `error-handler.middleware.ts` dùng serializer duy nhất.
5. Refactor `response.util.ts` dùng success builder + version gate.
6. Bổ sung unit test cho serializer và resolver.

## Todo list
- [ ] Hoàn tất typed contracts + exports.
- [ ] Hoàn tất serializer error/success.
- [ ] Hoàn tất middleware integration.
- [ ] Hoàn tất unit tests cho mapping và fallback.

## Success Criteria
- Không còn hardcoded JSON error shape rải rác trong middleware/helpers.
- Error v2 luôn đúng RFC7807 profile với `requestId`.
- V1 behavior vẫn giữ được khi chưa opt-in v2.
- Unit tests cover path: validation, api error, unknown error.

## Risk Assessment
- Risk: regressions do đổi helper signatures.
  - Mitigation: introduce overload/wrapper để giữ call-sites cũ.
- Risk: inconsistent `code` mapping.
  - Mitigation: central enum/registry + test matrix.

## Security Considerations
- Redact nội dung nhạy cảm khỏi `detail` và `errors[]`.
- 500 internal error trả message generic.
- `type` URI không expose internal topology.

## Next steps
- Sau khi shared layer ổn định -> Phase 03 migrate controllers theo priority.
- Chuẩn bị migration checklist endpoint-level.

## Unresolved questions
- Có cần chuẩn hóa `type` thành URI nội bộ cố định theo domain code không?
- V1 compatibility có giữ `timestamp` nguyên trạng hay chỉ v2 mới chuẩn hóa meta?
