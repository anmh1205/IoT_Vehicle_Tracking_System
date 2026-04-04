# Phase 05 - Integration rollout and acceptance

## Context links
- Core plan: `./plan.md`
- Integration points:
  - `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
  - `iot-vehicle-tracking-system-firmware/main/src/mqtt_client.c`
  - `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
  - `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`
  - `iot-vehicle-tracking-system-firmware/main/main.c`

## Overview
- Priority: P2
- Status: pending
- Goal: rollout theo từng bước nhỏ, giảm regression, chốt acceptance cuối.

## Key Insights
- Điểm chạm đã rõ, có thể làm incremental.
- Rủi ro lớn nhất là phần cứng SD signal + behavior khi power/network dao động.
- Cần gate rõ giữa unit/integration/bench test.

## Requirements
- Functional:
  - Tích hợp đầy đủ SD logging + replay vào luồng publish hiện hữu.
  - Không phá contract MQTT topics hiện tại.
  - Giữ behavior command/OTA hiện có.
- Non-functional:
  - Build pass, boot pass, không tăng crash/reboot rate.

## Architecture
- Rollout theo feature flags compile-time:
  - `CONFIG_SD_LOG_ENABLE`
  - `CONFIG_SD_REPLAY_ENABLE`
  - `CONFIG_SD_DIAG_ENABLE`
- Sequence rollout:
  1. Mount + append only.
  2. Replay with ACK pointer.
  3. Session lifecycle + recovery.
  4. Counters/security hardening.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
  - `iot-vehicle-tracking-system-firmware/main/src/mqtt_client.c`
  - `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
  - `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt`
  - `iot-vehicle-tracking-system-firmware/main/main.c`
- Create:
  - Các module đã nêu P01-P04.
- Delete:
  - Không xóa file runtime hiện hữu ở release đầu.

## Implementation Steps
1. Merge P01 artifacts, compile + smoke test mount path.
2. Merge P02 queue/replay path, test offline/online transitions.
3. Merge P03 session/recovery path, test reboot/deep sleep/power-cut.
4. Merge P04 counters/security path, test observability + redaction.
5. Chạy end-to-end bench test với ignition script + network flap script.
6. Chốt acceptance report, open issues backlog cho non-blocker.

## Todo List
- [ ] Chốt flag strategy cho rollout an toàn.
- [ ] Chốt bench scripts và test duration.
- [ ] Chốt acceptance checklist với owner ký nhận.
- [ ] Chốt backlog items cho phase sau release.

## Success Criteria
- Build pass ổn định trên nhánh tích hợp.
- End-to-end: offline log -> online replay đúng thứ tự và đúng ack.
- Không mất dữ liệu critical trong test power-loss theo tiêu chí đã định.
- Không regression OTA/command channel.

## Risk Assessment
- Regression ở publish path làm mất dữ liệu runtime.
- Test bench không mô phỏng đủ edge case thực tế.
- Mitigation: rollout cờ, test theo lớp, giữ rollback path.

## Security Considerations
- Verify không lộ secret trong SD dumps và MQTT diagnostics.
- Confirm quyền topic ACL server-side vẫn giữ theo device scope.

## Next Steps
- Nếu pass acceptance: chuyển implementation agent theo phase checklist.
- Đồng thời chuẩn bị cập nhật docs roadmap/changelog khi hoàn tất implementation.

## Unresolved questions
- Ai là owner sign-off cho hardware risk R29 sau bench test?
- Ngưỡng chấp nhận replay lag tối đa là bao nhiêu giây?
- Có yêu cầu release canary theo % thiết bị hay deploy toàn bộ?
