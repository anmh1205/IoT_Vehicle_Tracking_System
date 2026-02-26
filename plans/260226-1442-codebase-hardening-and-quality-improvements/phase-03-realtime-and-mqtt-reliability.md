# Phase 03 — Realtime and MQTT reliability

## Context links
- Research backend MQTT note: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/research-backend-best-practices-260226-1442.md`
- Phase 01 dependency: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260226-1442-codebase-hardening-and-quality-improvements/phase-01-critical-security-fixes.md`
- Plan overview: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260226-1442-codebase-hardening-and-quality-improvements/plan.md`

## Overview
- Date: 2026-02-26
- Priority: P1
- Status: pending
- Goal: sửa reliability bug MQTT, đồng bộ device-auth và TLS policy giữa listener/bridge.

## Key Insights
- `endAsync` undefined ở listener shutdown => crash/dirty shutdown risk.
- TLS config có dấu hiệu không được honor đầy đủ ở listener.
- Bridge handlers status/event/firmware chưa validate device auth như rawdata handler.
- Env default `rejectUnauthorized=false` là fail-open behavior.

## Requirements
### Functional
- Shutdown MQTT listener an toàn, idempotent.
- TLS runtime config phải áp đúng theo env và mặc định secure.
- Áp device auth validation thống nhất cho mọi handler ingest.

### Non-functional
- Không tăng latency đáng kể cho publish path.
- Quan sát được connect/disconnect/auth-fail qua metrics/log.

## Architecture
- Unified ingest pipeline:
  - Decode -> authenticate device -> authorize topic/action -> validate payload -> route handler.
- TLS policy centralization:
  - Env parse + schema validation + secure defaults.
- Lifecycle:
  - Start hook, health state, graceful shutdown with timeout + fallback.

## Related code files
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_MqttBridge/src/handlers/status.handler.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_MqttBridge/src/handlers/event.handler.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_MqttBridge/src/handlers/firmware.handler.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_MqttBridge/src/handlers/rawdata.handler.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system/Tracking_MqttBridge/src/config/env.ts`

## Implementation Steps
1. Chuẩn hóa MQTT client wrapper API (connect/end) và shutdown contract.
2. Sửa listener teardown: gọi đúng API, handle promise/reject, timeout safeguard.
3. Xác thực TLS options end-to-end; default secure (`rejectUnauthorized=true`).
4. Refactor auth pre-check thành shared middleware/util cho tất cả handlers.
5. Add integration tests: unauthorized device trên từng topic class; shutdown regression test.
6. Thêm observability fields: auth_fail_count, reconnect_count, graceful_shutdown_duration.

## Todo list
- [ ] Sửa bug undefined `endAsync` và bảo đảm graceful shutdown.
- [ ] Đồng bộ TLS config parse/apply với secure defaults.
- [ ] Áp device auth check cho status/event/firmware handlers.
- [ ] Viết integration tests cho ingest auth parity.
- [ ] Bổ sung metrics/log cho reliability.

## Success Criteria
- Service shutdown sạch, không throw unhandled errors.
- TLS reject unauthorized mặc định bật; chỉ tắt khi explicit override hợp lệ.
- Không có handler ingest nào bỏ qua device auth.
- Realtime regression tests pass.

## Risk Assessment
- Risk: strict TLS làm fail kết nối môi trường cũ self-signed.
  - Mitigation: migration guide + explicit trusted CA config.
- Risk: auth check thêm vào làm giảm throughput.
  - Mitigation: cache lightweight device auth metadata theo TTL ngắn.

## Security Considerations
- mTLS/TLS policy ưu tiên an toàn mặc định.
- Không xử lý payload trước auth check.
- Log deny events nhưng không dump payload nhạy cảm.

## Next Steps
- Đồng bộ runtime config checklist với infra hardening ở Phase 04.
- Chuyển shared handler contract sang coding standards ở Phase 05.

## Unresolved questions
- Có bắt buộc hỗ trợ broker nội bộ dùng cert self-signed lâu dài không?