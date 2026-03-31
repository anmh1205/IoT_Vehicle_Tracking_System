# Phase 03 — Endpoint adoption and compatibility rollout

## Context links
- `phase-01-contract-design-and-migration-strategy.md`
- `phase-02-backend-response-layer-refactor.md`
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/lib/api/client.ts`

## Overview
<!-- Updated: Validation Session 1 - single-contract rollout -->
- Priority: P2
- Status: pending
- Mục tiêu: migrate endpoint usage theo wave domain, áp dụng một contract response mới thống nhất, không duy trì format cũ.

## Key Insights
- Số lượng controllers lớn; cần wave rollout theo traffic + business criticality.
- Frontend/mobile consume pattern khác nhau; cần compatibility contract rõ trước khi migrate wave 2+.
- Migrate all-at-once là high risk, không phù hợp branch hiện tại.

## Requirements
- Functional:
  - Áp dụng response layer mới cho nhóm endpoint ưu tiên.
  - Bật compatibility gate để client chọn v1/v2.
  - Công bố migration docs/examples cho frontend/mobile.
- Non-functional:
  - Không downtime.
  - Có rollback nhanh theo feature flag/config.
  - Tracking adoption rate theo client version.

## Architecture
- Rollout model:
  - Wave 1: auth + health/system + nhóm endpoint low-coupling.
  - Wave 2: dashboard/statistics + CRUD chính.
  - Wave 3: long-tail endpoints + cleanup deprecated responses.
- Gating:
  - Request vào resolver -> chọn serializer v1/v2.
  - Response headers include active contract version cho observability.
- Decision gates:
  - Gate A: sau Wave 1, xác nhận frontend parse ổn.
  - Gate B: sau Wave 2, xác nhận mobile parse ổn.
  - Gate C: trước deprecate v1.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/auth.controller.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/system.controller.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/dashboard.controller.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/device.controller.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/vehicle.controller.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/**/*.ts` (theo wave)
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/lib/api/client.ts`
- Create:
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/docs/api-response-migration-matrix.md`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/docs/api-response-versioning-guide.md`
- Delete:
  - None (deprecation cleanup làm sau gate C)

## Implementation Steps
1. Define endpoint inventory + phân loại wave theo criticality/traffic.
2. Migrate Wave 1 controllers sang helper mới; verify contract bằng smoke tests.
3. Cập nhật frontend client parser để tolerant với v1/v2.
4. Migrate Wave 2 và chạy integration tests cross-team.
5. Migrate Wave 3, bật adoption telemetry và chuẩn bị deprecation notice.
6. Chốt date freeze cho v1 retirement (nếu adoption đạt threshold).

## Todo list
- [ ] Hoàn tất endpoint inventory + wave map.
- [ ] Hoàn tất Wave 1 và gate A.
- [ ] Hoàn tất frontend/mobile compatibility patch.
- [ ] Hoàn tất Wave 2, Wave 3 và gate B/C.
- [ ] Phát hành deprecation notice v1.

## Success Criteria
- Tất cả endpoint mục tiêu trả đúng format theo version gate.
- Frontend/mobile không phát sinh parsing incident Sev1/Sev2.
- Adoption v2 đạt threshold đã chốt trước deprecate v1.
- Có rollback playbook đã test.

## Risk Assessment
- Risk: client hardcode `success` boolean gây lỗi với v2 error payload.
  - Mitigation: parser tolerant + rollout opt-in + canary.
- Risk: drift giữa tài liệu và triển khai thực tế endpoint.
  - Mitigation: migration matrix + contract tests per wave.

## Security Considerations
- Không leak internal diagnostics khi migrate endpoint.
- Giữ auth/permission errors nhất quán, không tăng information disclosure.
- Validate `requestId` propagation qua reverse proxy/API gateway.

## Next steps
- Sau khi adoption ổn định -> vào Phase 04 để khóa governance + CI gates.
- Chuẩn bị post-migration retrospective.

## Unresolved questions
- Threshold adoption v2 bao nhiêu thì cho phép deprecate v1 (80/90/95%)?
- Ai có quyền final go/no-go ở Gate C?
- Mobile release cadence có đáp ứng timeline rollout không?
