## Code Review Summary

### Scope
- Files: 11 file trọng tâm theo yêu cầu + kiểm tra phụ thuộc trực tiếp trong Bridge/Backend/Frontend.
- LOC: ~260 dòng diff chính (ước lượng theo patch của nhóm file mục tiêu).
- Focus: recent changes (MQTT canonical simplification).
- Scout findings:
  - Auth token flow đang lệch giữa “hash-at-rest” và “token dùng để publish simulator”.
  - Event contract colon-style đã đồng nhất ở backend core, nhưng còn consumer frontend dùng event key cũ.
  - `/iot/data` đã gỡ khỏi router/runtime + OpenAPI path, nhưng artifact/metadata cũ vẫn còn trong codebase.

### Overall Assessment
Hướng đi đúng: ingest canonical qua MQTT, envelope nội bộ được chuẩn hóa, và event-bus/socket đã align colon-style. Tuy nhiên có 1 lỗi bảo mật/kiến trúc quan trọng ở luồng token simulator có thể làm hash trong DB trở thành credential dùng trực tiếp. Mức hiện tại chưa nên ship nếu chưa chốt cách xử lý token flow.

### Critical Issues
1) **[CRITICAL][Ship-blocking] Hash token trong DB đang dùng được như bearer token qua simulator + bridge compatibility query**
- **Impact:** Phá vỡ mục tiêu hash-at-rest; nếu hash bị lộ (DB/log/snapshot) thì có thể replay MQTT auth như token thật.
- **Evidence:**
  - Simulator lấy trực tiếp `auth_token` từ DB rồi publish vào MQTT payload:
    `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/simulator/services/simulator.service.ts:557-559, 589-592, 162-164, 188-190, 216-218`
  - Device create/regenerate đang lưu hash vào DB (không còn plaintext):
    `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/device/repositories/device.repository.ts:74-76, 82-85`
    `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/device/services/device-crud.service.ts:34-36, 75-77`
  - Bridge auth chấp nhận cả `auth_token = $2` **hoặc** `sha256($2)`:
    `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/services/device-auth.service.ts:24-29`
    `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/infrastructure/database.ts:38-43`
- **Why ship-blocking:** Mâu thuẫn trực tiếp với security intent của hash token và mở replay surface cho dữ liệu hash.

### High Priority
1) **[HIGH][Ship-blocking] Frontend device detail vẫn subscribe event key cũ `device.sessions.updated`**
- **Impact:** Modal có thể không refresh khi session start/end sau khi chuẩn hóa colon-style; gây regression realtime.
- **Evidence:**
  `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/components/device-detail-modal/modal-container.tsx:71`
- **Context:** Backend hiện phát `device:session_start` / `device:session_end`:
  `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts:112-120`

### Medium Priority
1) **[MEDIUM][Non-blocking] OpenAPI còn tag `IoT` dù đã xóa `/iot/data` path**
- **Impact:** Docs drift nhẹ, gây hiểu nhầm API surface hiện hữu.
- **Evidence:**
  `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/openapi/spec.ts:76`

2) **[MEDIUM][Non-blocking] Dead legacy ingest artifact còn tồn tại (`iot-ingestion.service`) và metadata source cũ `api/iot/data`**
- **Impact:** Dễ gây nhầm canonical path trong bảo trì/debug về sau.
- **Evidence:**
  `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/iot/services/iot-ingestion.service.ts:139`

### Low Priority
1) **[LOW][Non-blocking] `mqtt-event-listener` cast numeric bằng `Number(...)` không guard NaN**
- **Impact:** Payload xấu có thể đẩy `NaN` ra realtime consumer.
- **Evidence:**
  `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts:79-85`

### Edge Cases Found by Scout
- **Boundary/token mode:** thiết bị mới (token hashed-at-rest) + simulator lấy token từ DB => simulator publish hash thay vì raw token.
- **Consumer drift:** event contract đã đổi colon-style nhưng consumer cũ không theo kịp (`device.sessions.updated`).
- **Data-flow trust:** listener parse theo `event_type` trong envelope; topic suffix không còn là source-of-truth, cần đảm bảo ACL internal topic chặt.
- **Malformed numeric fields:** chuyển kiểu Number cho payload không hợp lệ có thể tạo NaN.

### Positive Observations
- `/iot/data` đã được gỡ khỏi runtime router:
  `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/index.ts:29-33`
- OpenAPI path `/iot/data` đã remove đúng hướng canonical MQTT.
- Envelope nội bộ đã chuẩn hóa `payload` (tránh collision top-level):
  `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/publishers/internal-event.publisher.ts:33-38`
- Realtime event map/socket bridge đã đồng nhất colon-style, không còn dot-style trong core path.

### Recommended Actions
1. **Fix trước khi ship (bắt buộc):** chốt lại mô hình token cho simulator để không dùng trực tiếp giá trị hash-at-rest làm credential phát MQTT.
2. **Fix trước khi ship (bắt buộc):** cập nhật frontend device-detail subscription từ event cũ sang canonical session events.
3. Dọn OpenAPI tag IoT và artifact ingest cũ để tránh docs/code drift.
4. Bổ sung guard số liệu realtime (`Number.isFinite`) ở listener để tránh NaN lan ra UI.

### Metrics
- Type Coverage: Chưa đo trong phiên review (N/A).
- Test Coverage: Chưa chạy trong phiên review (N/A).
- Linting Issues: Chưa chạy lint trong phiên review (N/A).

### Unresolved Questions
- Với yêu cầu “simulator dùng token thiết bị thật”, team muốn giữ plaintext token retrievable ở đâu (nếu DB chỉ lưu hash)?
- Có policy migration rõ ràng để bỏ hẳn mode `auth_token = $2` sau khi dữ liệu plaintext cũ được dọn không?
- Có consumer ngoài frontend hiện tại vẫn phụ thuộc event key legacy hoặc endpoint `/iot/data` không?
