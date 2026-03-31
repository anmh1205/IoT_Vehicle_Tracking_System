# Phase 03 — Realtime/frontend contract alignment

## Context links
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260331-1700-mqtt-canonical-simplification/research/researcher-02-event-contract-simplification.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/publishers/internal-event.publisher.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/simulator/hooks/use-simulator.ts`

## Overview
- Priority: P2
- Status: completed
- Estimate: 1.0d
- Mục tiêu: đồng nhất event naming/envelope Bridge→Backend→Socket→Frontend, giảm branching/alias.

## Key Insights
- Bridge đang spread payload vào top-level, dễ đụng field envelope.
- Backend socket bridge đang rename `device.status.changed` → `device:status`, tạo drift.
- Frontend hooks dễ subscribe event string tùy ý, khó kiểm soát contract.

## Requirements
<!-- Updated: Validation Session 1 - cut alias immediately -->
- Functional:
  - Chốt một canonical event key style xuyên suốt (ưu tiên dot-style nội bộ nhất quán).
  - Chốt envelope ổn định: `correlation_id`, `event_type`, `timestamp`, `payload`.
  - Frontend subscription dùng danh sách event được chuẩn hóa, không wildcard alias tùy ý.
  - Loại toàn bộ compatibility alias event ngay trong migration này.
- Non-functional:
  - Không đổi namespace auth model.
  - Không thêm tầng event bus mới.

## Architecture
- Namespace/room chỉ dùng cho audience scoping.
- Event key không đổi giữa layer; giảm translate map xuống mức tối thiểu cần thiết.
- Payload business luôn nằm trong `payload` để tránh key collision.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/publishers/internal-event.publisher.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/event-bus.util.ts` (nếu cần typing align)
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/simulator/hooks/use-simulator.ts`
- Delete:
  - Không bắt buộc; ưu tiên bỏ alias mapping dư thừa trong file hiện hữu.

## Implementation Steps
<!-- Updated: Validation Session 1 - remove aliases now -->
1. Chuẩn hóa envelope publisher ở MqttBridge thành `{correlation_id,event_type,timestamp,payload}`.
2. Backend listener parse envelope mới, map trực tiếp event key canonical.
3. Loại bỏ toàn bộ alias rename ở socket server ngay trong phase này; chỉ giữ canonical event set.
4. Cập nhật frontend hook/listener để chỉ dùng canonical event set.
5. Chạy smoke test cho status, position, session start/end, alert.

## Todo list
- [x] Chuẩn hóa envelope publisher.
- [x] Chuẩn hóa listener parser.
- [x] Dọn alias map không cần thiết ở socket bridge.
- [x] Cập nhật frontend subscription keys.
- [x] Smoke test end-to-end event delivery.

## Success Criteria
- Cùng một event key observable xuyên suốt từ publish đến frontend handler.
- Không còn payload metadata collision do spread.
- Không phát sinh event mất do mismatch tên.

## Risk Assessment
- Risk: cắt alias quá sớm làm frontend cũ mất realtime event.
- Mitigation: giữ compatibility alias ngắn hạn nếu cần, có cờ/timeline remove rõ trong Phase 04.

## Security Considerations
- Không giảm auth gate của namespaces.
- Chỉ allow subscribe vào danh sách sự kiện hợp lệ, tránh lộ event nội bộ không cần thiết.

## Next steps
- Sang Phase 04 để test/regression/doc update và đóng migration.
