## Code Review Summary

### Scope
- Files:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/simulator/services/simulator.service.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/device/services/device-crud.service.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/device/repositories/device.repository.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/event-bus.util.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/openapi/spec.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/index.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/publishers/internal-event.publisher.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/services/device-auth.service.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/hooks/use-realtime-subscription.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/providers/socket-provider.tsx`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/types/index.ts`
- LOC: tập trung theo diff trong scope MQTT canonical post-fix
- Focus: recent/specific
- Scout findings: có 2 edge case nghiêm trọng ở lifecycle token simulator (không rollback khi start fail, và ghi đè token mới regenerate khi stop)

### Overall Assessment
Hướng chuẩn hóa canonical MQTT + event contract đã đi đúng hướng (event name parity backend/frontend tốt hơn, `/iot/data` đã được remove khỏi routes/spec). Tuy nhiên hiện còn 2 lỗi ship-blocking trong luồng token simulator có thể làm hỏng xác thực thiết bị thực tế.

### Critical Issues
1. **Token bị “kẹt” nếu start simulator fail sau khi đã rotate token**
   - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/simulator/services/simulator.service.ts:623-632,637,639-647`
   - Vấn đề: service update `devices.auth_token` sang token simulator trước khi đảm bảo MQTT client connect/publish status thành công. Nếu `createSimulatorMqttClient()` fail hoặc publish `running` fail, hàm throw và **không có rollback token**.
   - Tác động: thiết bị thật không còn auth bằng token cũ, simulator cũng không chạy -> trạng thái mồ côi, mất kết nối ingest.

2. **Stop simulator có thể ghi đè token vừa regenerate trong lúc simulator đang chạy**
   - File:
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/simulator/services/simulator.service.ts:611-615,410-418`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/device/services/device-crud.service.ts:75-77`
   - Vấn đề: simulator giữ `originalAuthToken` snapshot lúc start, sau đó stop luôn restore snapshot này. Nếu admin gọi regenerate token trong thời gian simulator chạy, token mới sẽ bị restore ngược về token cũ.
   - Tác động: invalidate token mới vừa cấp, gây sai lệch bảo mật và lỗi thiết bị sau thao tác regenerate.

### High Priority
- Không có thêm high mới ngoài 2 lỗi critical trên trong phạm vi review.

### Medium Priority
- `iot-ingestion.service.ts` vẫn ghi metadata `source: 'api/iot/data'` (không còn endpoint này). Không block release nhưng gây nhiễu truy vết vận hành.
  - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/iot/services/iot-ingestion.service.ts:139`

### Low Priority
- Không thấy vấn đề style/format đáng kể trong scope.

### Edge Cases Found by Scout
- Start fail sau token swap mà không rollback.
- Concurrent admin regenerate token trong lúc simulator chạy, stop sẽ restore snapshot cũ.
- Partial failure khi restore token trong `Promise.all` đã được log nhưng vẫn trả trạng thái stop thành công (đã có log, nhưng cần chính sách consistency rõ ràng).

### Positive Observations
- MQTT Bridge auth verification dùng hash check DB (`encode(sha256(...), 'hex')`) nhất quán với backend hash token storage.
- Event contract đã align theo canonical naming (`device:status`, `device:position`, `command:ack`, ...), frontend subscriptions đã theo namespace/event mới.
- OpenAPI tag cleanup parity tốt: đã remove tag/path `/iot/data` khỏi spec và route registration.

### Recommended Actions
1. **Chặn release** cho đến khi xử lý 2 critical token lifecycle issues ở simulator.
2. Đưa token swap + start handshake vào transactional/compensating flow (commit khi start thành công, rollback khi fail).
3. Bảo vệ concurrent regenerate bằng cơ chế version/check-before-restore hoặc restore có điều kiện (không ghi đè nếu token đã đổi sau thời điểm start).
4. Dọn metadata source cũ `api/iot/data` để thống nhất audit trail.

### Metrics
- Type Coverage: N/A (không có số đo coverage type chính thức trong artefact)
- Test Coverage: N/A (tester report chỉ có pass/fail test count)
- Linting Issues: 0 (theo `tester-260331-2349-post-fix-validation.md`)

### Unresolved Questions
- Có chấp nhận policy “regen token bị khóa khi simulator đang chạy” không, hay cần hỗ trợ đầy đủ concurrent-safe?
- Team muốn ưu tiên fix theo hướng transaction DB hay hướng compensating rollback idempotent cho simulator lifecycle?
