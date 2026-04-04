# Phase 02 - Offline queue, online replay, and backpressure

## Context links
- Research: `./research/researcher-01-report.md`, `./research/researcher-02-report.md`
- Integrations: `main/src/state_machine.c`, `main/src/mqtt_client.c`

## Overview
- Priority: P1
- Status: pending
- Goal: chuẩn hóa record model + internet/GPS matrix + replay engine FIFO.

## Key Insights
- User đã chốt: quota + FIFO GC, fsync mỗi record, ignition-only.
- Publish path hiện tại gọi trực tiếp MQTT; cần thêm abstraction queue-first.
- MQTT wrapper hiện thiếu surface cho ACK pointer events.

## Requirements
<!-- Updated: Validation Session 1 - ACK policy + quota policy -->
- Functional:
  - Mọi record đi qua local queue trước (durable-first).
  - Replay strict FIFO theo `seq` tăng dần.
  - `rawdata` chạy QoS0 best-effort, không giữ ACK pointer riêng.
  - ACK pointer chỉ advance cho records critical (status/event/firmware) khi publish success + broker ACK (QoS1).
  - Retry exponential backoff + jitter; có max retry window.
  - Khi quota đầy, GC ưu tiên xóa rawdata cũ trước, giữ critical records lâu hơn.
- Non-functional:
  - Không block state machine tick.
  - Giữ RAM thấp; metadata chủ yếu ở SD.

## Architecture
<!-- Updated: Validation Session 1 - ACK policy + quota policy -->
- Record envelope (NDJSON mỗi dòng):
  - `seq, ts_ms, session_id, type(rawdata/status/event), gps_state, net_state, payload_json`
- Connectivity matrix:
  1. net up + gps fix: log + publish immediately; chỉ critical records chờ ACK.
  2. net down + gps fix: log only, backlog tăng.
  3. net up + gps no-fix: log trạng thái no-fix; publish theo policy.
  4. net down + gps no-fix: log tối thiểu, không chờ fix.
- Replay engine:
  - Cursor: `write_seq`, `ack_seq_critical`, `replay_seq`.
  - Ordering: giữ strict FIFO theo `seq`; rawdata best-effort, critical theo `ack_seq_critical+1`.
  - Backpressure: khi dùng >80% quota, giảm tần suất non-critical records.
  - GC: khi đầy, ưu tiên xóa rawdata cũ theo FIFO trước; chỉ đụng critical khi không còn lựa chọn.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
  - `iot-vehicle-tracking-system-firmware/main/src/mqtt_client.c`
- Create:
  - `iot-vehicle-tracking-system-firmware/main/inc/offline_queue.h`
  - `iot-vehicle-tracking-system-firmware/main/src/offline_queue.c`
- Delete: none.

## Implementation Steps
1. Thêm `queue_append(record)` trước mọi publish call ở state machine.
2. Thiết kế phân loại record QoS: rawdata=0, status/event/firmware=1.
3. Mở rộng MQTT wrapper callback cho `PUBACK`/publish result.
4. Implement replay worker tick-based (không task phức tạp lúc đầu).
5. Implement retry/backoff+jitter và cooldown khi disconnect dài.
6. Implement quota monitor + FIFO GC trigger.
7. Thêm guard chống duplicate publish sau reboot (dựa ack_seq).

## Todo List
- [ ] Chốt schema record đủ tối thiểu.
- [ ] Chốt ACK semantics theo QoS loại record.
- [ ] Chốt tham số backoff và ngưỡng backpressure.
- [ ] Chốt quota bytes + segment size.

## Success Criteria
- Replay đúng thứ tự với 10k records test offline->online.
- Không duplicate ngoài ngưỡng chấp nhận khi reboot giữa replay.
- Queue không vượt quota; GC chạy ổn định.

## Risk Assessment
- ACK event từ MQTT lib có thể không map 1-1 với logic hiện tại.
- fsync/record + replay đồng thời có thể tăng latency publish.
- GC sai boundary có thể xóa record chưa ack.
- Mitigation: metadata checkpoint atomic + test fault injection.

## Security Considerations
- Payload trước khi log cần redact field nhạy cảm.
- Không log command secrets/credential material.
- Có option tắt log loại payload nhạy cảm theo config.

## Next Steps
- Sau P02, nối session lifecycle với ignition/deep sleep trong P03.

## Unresolved questions
- Có cần replay rate limit để tránh choke broker lúc reconnect?
- Ngưỡng quota soft/hard cụ thể (% hoặc bytes) nên đặt bao nhiêu cho board hiện tại?
