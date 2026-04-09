# Phase 06 - Reliability and offline buffering

## Context links
- `../plan.md`
- `./phase-04-firmware-publish-pipeline.md`
- `./phase-05-cloud-ingestion-and-mapping.md`
- `../research/researcher-01-firmware-security-mqtts-report.md`

## Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-09
- Description: Chốt reliability policy cho mạng thực tế: offline queue, retry, dedup, ordering behavior.
- Priority: P1
- Implementation status: pending
- Review status: pending

## Key Insights
- QoS1 không loại duplicate, nên dedup phải ở cloud-side và metadata phải có từ firmware.
- Queue không giới hạn sẽ giết RAM/flash và kéo dài recovery bất kiểm soát.
- Ordering chỉ nên cam kết best-effort theo stream nhỏ (device+topic).

## Requirements
- Bounded queue theo cả count và bytes.
- Priority policy: giữ status/events/commands; rawdata có thể drop theo ngưỡng.
- Reconnect exponential backoff + jitter + cap.
- Replay logic có ACK correlation và timeout rõ.

## Architecture
- Reliability policy:
  - Inflight cap thấp, ổn định.
  - Queue tiers: critical (QoS1) vs lossy (QoS0 rawdata).
  - Replay scheduler theo fairness, tránh starve status/events.
- Ordering policy:
  - best-effort in-order theo `device_id+topic`.
  - detect out-of-order bằng `seq_no`, không block toàn pipeline.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
  - `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
  - `iot-vehicle-tracking-system-firmware/main/src/sd_log_store.c`
  - `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/*`
- Create:
  - Không tạo file markdown ngoài plan dir
- Delete:
  - Không

## Implementation Steps
1. Định mức queue/inflight cap theo RAM budget thực đo.
2. Áp policy drop/degrade cho rawdata khi backlog vượt ngưỡng.
3. Áp replay window và ACK timeout theo class dữ liệu.
4. Áp cloud dedup window 24h + metrics hit-rate.
5. Viết runbook xử lý reconnect storm và backlog drain.

## Todo list
- [ ] Chốt thông số queue/inflight/retry cap cho firmware.
- [ ] Chốt policy degrade khi mạng kém kéo dài.
- [ ] Chốt tiêu chí drop rawdata an toàn.
- [ ] Chốt dashboard theo dõi backlog + dedup hit-rate.

## Success Criteria
- Thiết bị recover ổn sau mất mạng dài mà không crash.
- Dữ liệu critical không mất sau reconnect trong ngưỡng thiết kế.
- Duplicate được khử đúng trong dedup window mục tiêu.

## Risk Assessment
- Risk: backlog lớn gây delay dữ liệu stale.
- Mitigation: TTL/drop policy cho rawdata, ưu tiên flush critical trước.

## Security Considerations
- Replay protection dựa message_id/seq_no, tránh xử lý lặp command nhạy cảm.
- Giới hạn retry để tránh bị lợi dụng thành traffic amplification.

## Next steps
- Cung cấp chỉ số reliability cho phase 07 và acceptance cho phase 08.
