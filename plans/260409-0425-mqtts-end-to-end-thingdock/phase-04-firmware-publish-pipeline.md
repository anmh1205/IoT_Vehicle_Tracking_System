# Phase 04 - Firmware publish pipeline

## Context links
- `../plan.md`
- `./phase-02-security-and-tls-foundation.md`
- `./phase-03-schema-and-topic-contract.md`
- `../research/researcher-01-firmware-security-mqtts-report.md`

## Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-09
- Description: Thiết kế pipeline publish phía firmware: connect, auth, serialize, publish, retry.
- Priority: P1
- Implementation status: pending
- Review status: pending

## Key Insights
- Firmware phải là nguồn tạo idempotency fields ổn định (`message_id`, `seq_no`, `boot_id`).
- Backoff + jitter là bắt buộc để tránh reconnect storm khi mạng LTE chập chờn.
- Inflight cap + bounded queue là bắt buộc để không bùng RAM.

## Requirements
- Kết nối MQTT qua TLS với clock hợp lệ trước handshake.
- Publish theo QoS đã chốt, không override ad-hoc theo module.
- Hỗ trợ offline queue policy theo loại dữ liệu.
- Log đủ để debug, nhưng không lộ secret.

## Architecture
- Pipeline đề xuất:
  1) Collect telemetry -> 2) Build envelope -> 3) Assign `message_id/seq_no`
  4) Push queue -> 5) Publish by QoS/topic -> 6) ACK handling -> 7) Retry/backoff.
- State machine integration:
  - Network down: queue policy active.
  - TLS/auth fail: retry bounded + escalation log.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
  - `iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
  - `iot-vehicle-tracking-system-firmware/main/inc/modem_at.h`
  - `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- Create:
  - Không tạo file markdown ngoài plan dir
- Delete:
  - Không

## Implementation Steps
1. Chuẩn hóa hàm build payload JSON versioned dùng chung các publisher.
2. Thêm generator `message_id` + `seq_no` + `boot_id`.
3. Gắn QoS/retained policy theo topic classification cố định.
4. Gắn reconnect backoff exponential + jitter + reset condition.
5. Gắn redaction rules cho AT/MQTT logs.

## Todo list
- [ ] Chốt payload builder chung.
- [ ] Chốt queue/inflight cap cho RAM footprint mục tiêu.
- [ ] Chốt retry budget theo tình huống lỗi.
- [ ] Chốt tiêu chí health cho MQTT task watchdog.

## Success Criteria
- Firmware publish ổn định qua MQTTS dưới điều kiện mạng xấu.
- Không thấy crash/reset do queue overflow hoặc reconnect storm.
- Payload phát ra luôn hợp lệ với schema v1.

## Risk Assessment
- Risk: tăng CPU/RAM do JSON + retry logic.
- Mitigation: tối giản field, reuse buffer, benchmark peak load trước rollout.

## Security Considerations
- Không in username/password/cert blob ra log.
- Chặn publish khi TLS verify fail, không có bypass runtime.

## Next steps
- Bàn giao contract publish đã ổn định cho phase 05/06 để ingest và dedup chính xác.
