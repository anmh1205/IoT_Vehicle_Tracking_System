# Phase 04 — Validation, rollout, docs update

## Context links
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/development-roadmap.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-changelog.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/codebase-summary.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-overview-pdr.md`

## Overview
- Priority: P2
- Status: completed
- Estimate: 1.5d
- Mục tiêu: xác nhận chất lượng, hoàn tất rollout low-risk, cập nhật tài liệu sống.

## Key Insights
- Đây là breaking cleanup vì `/iot/data` bị xóa.
- Rủi ro chính nằm ở hidden consumer và regress realtime event naming.
- Docs hiện chưa phản ánh rõ simulator canonical MQTT-only.

## Requirements
- Functional:
  - Verify backend/frontend/mqtt-bridge build + test pass.
  - Verify smoke flow: simulator start/stop/pause/resume + realtime data.
  - Cập nhật đầy đủ roadmap/changelog/architecture/summary/PDR.
- Non-functional:
  - Báo cáo rollout ngắn gọn, có checklists và kết quả rõ pass/fail.

## Architecture
- Không thay đổi kiến trúc; chỉ xác nhận trạng thái sau refactor:
  - Một ingest path MQTT.
  - Một event contract chuẩn hóa.
  - Một bộ status enum giữ nguyên.

## Related code files
- Modify:
  - `docs/development-roadmap.md`
  - `docs/project-changelog.md`
  - `docs/system-architecture.md`
  - `docs/codebase-summary.md`
  - `docs/project-overview-pdr.md`
  - (nếu cần) test files hiện hữu ở Backend/Frontend/MqttBridge
- Delete:
  - Không dự kiến.

## Implementation Steps
<!-- Updated: Validation Session 1 - retained/LWT checks + no alias compatibility -->
1. Chạy quality gates theo README cho Backend, Frontend, MqttBridge.
2. Chạy smoke test manual/automation cho simulator MQTT canonical flow.
3. Kiểm tra logs/realtime để xác nhận status enum và event contract đúng.
4. Bổ sung kiểm thử retained status + LWT offline behavior và xác nhận không còn alias compatibility event.
5. Cập nhật docs sống theo thay đổi thực tế.
6. Viết release note ngắn: breaking removal `/iot/data` + migration note.

## Todo list
<!-- Updated: Validation Session 1 - retained/LWT + alias removal regression -->
- [x] Backend lint/typecheck/test/build pass.
- [x] Frontend lint/typecheck/build pass.
- [x] MqttBridge typecheck/build pass.
- [x] Smoke test simulator + device parity pass.
- [x] Test retained status + LWT offline behavior pass.
- [x] Xác nhận không còn alias compatibility event trong FE/BE subscriptions.
- [x] Cập nhật đầy đủ 5 tài liệu docs.
- [x] Chốt release note + deployment notes.

## Success Criteria
- Tất cả quality gates pass.
- Không còn reference `/iot/data` trong runtime/docs chính.
- Docs phản ánh đúng canonical MQTT-only và event contract sau cleanup.

## Risk Assessment
- Risk: test pass local nhưng fail ở UAT do env/topic ACL.
- Mitigation: thêm checklist UAT-specific env verify trước deploy.

## Security Considerations
- Re-check secret handling sau refactor (không log token, không hardcode credential).
- Verify ACL topic vẫn giới hạn theo device scope.

## Next steps
- Đóng plan khi UAT xác nhận ổn định.
- Nếu còn alias compatibility, đặt deadline remove ở sprint kế tiếp.
