# Phase 01 — Baseline & contract freeze

## Context links
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/codebase-summary.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-overview-pdr.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260331-1700-mqtt-canonical-simplification/research/researcher-01-mqtt-canonical-migration.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260331-1700-mqtt-canonical-simplification/research/researcher-02-event-contract-simplification.md`

## Overview
- Priority: P2
- Status: completed
- Estimate: 0.5d
- Mục tiêu: chốt baseline kỹ thuật và contract migration trước khi sửa code.

## Key Insights
- Hiện simulator ghi DB qua `ingestDeviceData` nên bypass MQTT canonical.
- `/iot/data` đang là nhánh ingest song song gây branch flow trùng lặp.
- Event bridge hiện có rename/alias event giữa internal bus và Socket.IO.

## Requirements
- Functional:
  - Chốt canonical topic + payload cho simulator giống device thật.
  - Chốt mapping status enum `online/offline/running/stopped` theo payload semantics.
  - Chốt danh sách file phải sửa/xóa để bỏ `/iot/data`.
- Non-functional:
  - Không mở rộng scope, không thêm service mới.
  - Tối thiểu hóa breaking surface bằng migration checklist rõ ràng.

## Architecture
- Giữ kiến trúc hiện tại: Device/Simulator → EMQX → MqttBridge → Backend realtime/API → Frontend.
- Thay đổi chỉ ở flow wiring và contract, không thêm tầng mới.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/simulator/services/simulator.service.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/publishers/internal-event.publisher.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/openapi/spec.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/simulator/hooks/use-simulator.ts`
- Delete:
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/iot.controller.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/iot.routes.ts`

## Implementation Steps
1. Khóa migration rules: MQTT-only ingest, remove `/iot/data`, status enum giữ nguyên.
2. Lập bảng mapping “current flow → target flow” cho simulator telemetry + status.
3. Lập bảng mapping event names/envelope Bridge→Backend→Frontend.
4. Chốt checklist impact cho API docs, route registry, frontend subscriptions.

## Todo list
- [x] Chốt canonical topic/payload table.
- [x] Chốt event contract table (name + envelope).
- [x] Chốt danh sách breaking changes.
- [x] Chốt danh sách file sửa/xóa.

## Success Criteria
- Tài liệu phase có bảng flow target rõ, không mâu thuẫn với quyết định đã chốt.
- Danh sách file tác động đủ để triển khai, không phát sinh scope mới.

## Risk Assessment
- Risk: bỏ sót consumer đang gọi `/iot/data`.
- Mitigation: grep toàn repo + xác nhận runtime logs trước phase 2.

## Security Considerations
- Không thay auth/ACL model.
- Giữ device auth token check trong luồng ingest canonical hiện hữu.

## Next steps
- Bắt đầu Phase 02 để thực thi breaking changes ở backend theo checklist đã khóa.
