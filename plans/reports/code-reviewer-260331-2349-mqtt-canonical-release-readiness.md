## Code Review Summary

### Scope
- Files:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/simulator/services/simulator.service.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/device/services/device-crud.service.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/device/repositories/device.repository.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/services/device-auth.service.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/infrastructure/database.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/components/device-detail-modal/modal-container.tsx`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/openapi/spec.ts`
- Focus: final focused release-readiness review for simulator token race/start-failure fixes.
- Scout findings (edge-case focus):
  - Start-failure rollback path now exists and is conditionally safe.
  - Stop-time restore no longer overwrites freshly regenerated token.
  - Frontend realtime event subscriptions are aligned with canonical colon-style events.

### Overall Assessment
Các lỗi ship-blocking đã nêu ở vòng review trước (rollback khi start fail và race regenerate-token khi stop) đã được xử lý đúng hướng, với guard điều kiện trong DB update để tránh ghi đè token mới. Trong phạm vi file được yêu cầu, không còn ship-blocking issue.

### Severity Table (file:line refs)
| Severity | Status | File:Line | Finding | Impact |
|---|---|---|---|---|
| Critical | Resolved | `.../simulator.service.ts:650-662` | Có try/catch cho start handshake, rollback token khi connect/publish fail (`restoreSimulatorAuthTokens(..., 'start_failed')`). | Đóng lỗ hổng token bị kẹt khi start fail. |
| Critical | Resolved | `.../simulator.service.ts:362-366`, `435`; `.../device-crud.service.ts:75-77` | Restore token dùng điều kiện `WHERE auth_token = simulatorAuthTokenHash`, nên không ghi đè token vừa regenerate. | Loại bỏ race gây rollback sai token mới. |
| High | Resolved | `.../device.repository.ts:74-90`, `134-138`; `.../device-auth.service.ts:25-27`; `.../database.ts:41-43` | Token lifecycle hash-at-rest nhất quán: create/regenerate hash token, verify bằng `sha256(input)` so với DB. | Giảm rủi ro lộ token thô trong DB. |
| Medium | Resolved | `.../modal-container.tsx:60-88` | Subscription đã chuyển sang `device:status`, `device:session_start`, `device:session_end`. | Tránh regression realtime do mismatch tên event. |
| Low | Resolved | `.../spec.ts:57-76`, `77+` | OpenAPI không còn IoT tag/path legacy trong scope đã kiểm. | Tránh docs drift với runtime surface mới. |
| Medium | Open (non-blocking) | `.../simulator.service.ts:358-375` | `restoreSimulatorAuthTokens` nuốt lỗi từng device (chỉ log), nên có thể partial-restore nếu DB lỗi cục bộ. | Có thể để lại trạng thái token không đồng nhất sau sự cố DB. |

### Critical Issues
- Không phát hiện critical đang mở trong phạm vi review.

### High Priority
- Không phát hiện high đang mở trong phạm vi review.

### Medium Priority
1. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/simulator/services/simulator.service.ts:358-375`
   Khi DB lỗi, restore token có thể partial-success (log-only). Đây là rủi ro vận hành, chưa phải ship-blocker cho bản fix race/start-failure hiện tại.

### Low Priority
- Không có.

### Edge Cases Found by Scout
- Start thất bại sau token swap: đã có rollback bù trừ.
- Regenerate token trong lúc simulator chạy: restore có điều kiện nên không overwrite token mới.
- Event drift frontend/backend ở modal detail: đã align.

### Positive Observations
- Fix giữ KISS/YAGNI: không thêm abstraction dư thừa, giải quyết trực tiếp vào lifecycle simulator.
- Guard `WHERE auth_token = simulatorAuthTokenHash` là điểm then chốt để chống lost-update ở token.
- Luồng auth của MqttBridge và backend device CRUD đã nhất quán theo hash-at-rest.

### Recommended Actions
1. Ship được cho scope “simulator token race/start-failure fixes”.
2. Sau release, cân nhắc bổ sung monitoring/alert cho log `Failed to restore device auth token...` để phát hiện partial-restore sớm.

### Metrics
- Type Coverage: N/A (không có báo cáo coverage trong phiên này).
- Test Coverage: N/A (không chạy test trong phiên review này).
- Linting Issues: N/A (không chạy lint trong phiên review này).

### Ship Verdict
**SHIP (GO)** cho phạm vi fix hiện tại; không còn blocker từ các phát hiện critical trước đó.

### Unresolved Questions
- Có muốn nâng `restoreSimulatorAuthTokens` từ best-effort sang cơ chế retry/compensation ở tầng job-ops sau release không?
