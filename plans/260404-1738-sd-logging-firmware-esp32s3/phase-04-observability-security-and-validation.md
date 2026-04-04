# Phase 04 - Observability, security/privacy, and validation

## Context links
- Research: `./research/researcher-01-report.md`, `./research/researcher-02-report.md`
- Runtime publish/integration: `main/src/state_machine.c`, `main/src/mqtt_client.c`

## Overview
- Priority: P2
- Status: pending
- Goal: thêm metrics/events tối thiểu đủ vận hành; chốt baseline bảo mật dữ liệu SD.

## Key Insights
- Cần counters nhỏ, không over-engineer.
- SD data-at-rest rủi ro cao; không nên log secret.
- fsync mỗi record tăng độ bền nhưng làm tăng write latency; phải đo.

## Requirements
- Functional:
  - Expose counters nội bộ và event logs chẩn đoán.
  - Báo trạng thái mount/queue/replay/ack/retry.
  - Áp policy redaction trước khi ghi SD.
- Non-functional:
  - Overhead thấp (CPU/RAM).
  - Có thể bật/tắt verbosity theo config build.

## Architecture
- Counters tối thiểu:
  - `sd_write_ok/fail`, `sd_fsync_fail`
  - `queue_depth`, `queue_bytes_used`, `quota_hit`
  - `replay_success/retry/drop`
  - `mqtt_connected/disconnected`, `puback_lag_ms`
  - `gps_fix_ok/no_fix`
- Events tối thiểu:
  - `session_start/stop`, `gc_run`, `queue_full`, `sd_mount_fail`, `sd_card_removed`
- Security baseline:
  - Không lưu secret/token/raw credentials trên SD.
  - Redact fields nhạy cảm trước serialize.
  - Chuẩn bị extension point cho app-level encryption nếu cần.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
  - `iot-vehicle-tracking-system-firmware/main/src/mqtt_client.c`
- Create:
  - `iot-vehicle-tracking-system-firmware/main/inc/telemetry_counters.h`
  - `iot-vehicle-tracking-system-firmware/main/src/telemetry_counters.c`
- Delete: none.

## Implementation Steps
1. Thiết kế struct counters và API increment/get/reset.
2. Cắm counters vào các điểm write/replay/puback/error.
3. Định nghĩa diagnostic events với code ngắn, parse dễ.
4. Áp redaction layer trước queue append.
5. Soạn test matrix: network flap, GPS no-fix, card remove, quota full, power-cut.
6. Chốt tiêu chí pass/fail theo KPI queue integrity + recovery.

## Todo List
- [ ] Chốt danh sách counters/events tối thiểu.
- [ ] Chốt danh sách field cần redact.
- [ ] Chốt test matrix và tiêu chí pass.
- [ ] Chốt cách expose counters (log line, topic status, hoặc cả hai).

## Success Criteria
- Sau test matrix, có đủ tín hiệu để chẩn đoán lỗi trong <10 phút.
- Không có field bí mật xuất hiện trong SD sample dump.
- Overhead quan sát không làm trễ vòng lặp chính đáng kể.

## Risk Assessment
- Quá nhiều counters gây noisy logs và tốn tài nguyên.
- Redaction sai có thể làm mất giá trị debug.
- Mitigation: chỉ giữ tập tối thiểu + review payload samples.

## Security Considerations
<!-- Updated: Validation Session 1 - encryption scope release đầu -->
- Tuân thủ nguyên tắc data minimization.
- Release đầu **chưa bắt buộc record-level encryption**; áp redaction + không log secret.
- Cân nhắc mã hóa record-level ở phase sau khi có compliance trigger rõ ràng.
- Bảo vệ đường publish diagnostics tránh lộ metadata nhạy cảm.

## Next Steps
- Sang P05 để chốt rollout theo file touchpoint + acceptance.

## Unresolved questions
- Counters sẽ đẩy qua topic riêng hay gộp status hiện tại?
- Có retention riêng cho diagnostic events trên SD không?
