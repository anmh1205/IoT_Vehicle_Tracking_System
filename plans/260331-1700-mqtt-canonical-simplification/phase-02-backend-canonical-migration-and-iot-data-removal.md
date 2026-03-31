# Phase 02 — Backend canonical migration + `/iot/data` removal

## Context links
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260331-1700-mqtt-canonical-simplification/phase-01-baseline-and-contract-freeze.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/simulator/services/simulator.service.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/iot.routes.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/iot.controller.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/index.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/openapi/spec.ts`

## Overview
- Priority: P1
- Status: completed
- Estimate: 1.5d
- Mục tiêu: simulator publish theo MQTT contract; backend bỏ triệt để nhánh `/iot/data`.

## Key Insights
- `simulator.service.ts` đang gọi trực tiếp `ingestDeviceData`, tạo nhánh bypass broker.
- `/iot/data` xuất hiện trong routes + OpenAPI; giữ lại sẽ tiếp tục gây hiểu nhầm canonical path.
- Có thể tái dùng MQTT client pattern từ `device-command.service.ts`, không cần service mới.

## Requirements
- Functional:
  - Simulator gửi telemetry/status/event qua MQTT `v1/{device_id}/rawdata|status|events`.
  - Bỏ route/controller `/iot/data` khỏi runtime và khỏi OpenAPI.
  - Không đổi status enum nghiệp vụ (`online/offline/running/stopped`).
- Non-functional:
  - Không thêm microservice/module kiến trúc mới.
  - Thay đổi nhỏ, có thể review nhanh, rollback rõ.

## Architecture
<!-- Updated: Validation Session 1 - one PR removal + status source-of-truth -->
- Trước: Simulator → `ingestDeviceData` (HTTP-style service path) + Device thật → MQTT.
- Sau: Simulator + Device thật cùng publish MQTT vào broker; ingest downstream đi cùng một đường.
- Backend giữ vai trò API + realtime; không còn endpoint ingest trực tiếp.
- Status source-of-truth: topic `status` (retained) + broker LWT cho `offline`; telemetry chỉ bổ sung context.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/simulator/services/simulator.service.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/index.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/openapi/spec.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/config/env.ts` (chỉ khi cần dùng lại MQTT env đã có)
- Delete:
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/iot.controller.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/iot.routes.ts`

## Implementation Steps
<!-- Updated: Validation Session 1 - one PR removal + real-device token -->
1. Refactor simulator tick loop để publish MQTT payload theo canonical topic contract, dùng đúng `device_id` + `auth_token` của thiết bị thật trong DB.
2. Đảm bảo simulator phát status/event cần thiết; status dùng retained + LWT semantics cho online/offline.
3. Trong cùng một PR: gỡ import/use `/iot` route trong `routes/index.ts`.
4. Trong cùng một PR: xóa `iot.controller.ts` và `iot.routes.ts`.
5. Trong cùng một PR: xóa path `/iot/data` và tag/phần liên quan trong OpenAPI spec.
6. Chạy build/typecheck để xác nhận không còn dead import/reference.

## Todo list
- [x] Refactor simulator publish path sang MQTT.
- [x] Verify topic/payload parity với device thật.
- [x] Remove `/iot/data` route registration.
- [x] Delete iot route/controller files.
- [x] Update OpenAPI bỏ `/iot/data`.
- [x] Run backend lint/typecheck/build.

## Success Criteria
- Không còn endpoint `/api/v1/iot/data` trong runtime + API docs.
- Simulator data xuất hiện downstream qua cùng đường MQTT như device thật.
- Backend compile/test pass với nhánh ingest duy nhất.

## Risk Assessment
- Risk: simulator publish sai payload keys làm mất dữ liệu downstream.
- Mitigation: so khớp payload với contract README + test bằng sample message thực.

## Security Considerations
- Giữ auth/ACL MQTT hiện có; simulator identity phải theo scope topic device.
- Không ghi log lộ auth token.

## Rollback strategy
- Nếu migration gây lỗi ingest diện rộng:
  1) revert commit Phase 02,
  2) restore `iot.routes.ts` + `iot.controller.ts` + route mount,
  3) restore OpenAPI `/iot/data`,
  4) tạm chuyển simulator về mode cũ trong 1 hotfix window.
- Rollback chỉ dùng ngắn hạn, sau đó phải quay lại canonical MQTT path.

## Next steps
- Chuyển sang Phase 03 để dọn contract drift realtime/event naming sau khi ingest path đã hợp nhất.
