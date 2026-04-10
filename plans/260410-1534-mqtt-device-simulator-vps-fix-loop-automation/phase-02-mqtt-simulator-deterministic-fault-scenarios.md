# Context links
- Plan overview: `./plan.md`
- Research A: `./research/researcher-01-mqtt-simulator-design-report.md`
- README MQTT contract: `../../README.md`
- Architecture constraints: `../../docs/system-architecture.md`

# Overview
- Priority: P1
- Status: completed
- Mục tiêu: thiết kế simulator deterministic, replayable, fault-injection theo scope nâng cao đã chốt.

# Key Insights
- Contract bridge validate metadata chặt, simulator phải bám bridge contract thay vì backend API contract.
- Fault injection nên deterministic (seed + event_index), tránh random mù khó debug.
- `message_id + seq_no + boot_id` là bộ khóa chính để kiểm duplicate/reorder/reconnect.

# Requirements
- Functional:
  - Hỗ trợ mode `generate+publish`, `replay`, `dry-run`.
  - Hỗ trợ fault types: jitter, duplicate, out-of-order, spike, reconnect, invalid payload.
  - Hỗ trợ multi-topic policy theo QoS chuẩn.
- Non-functional:
  - Deterministic 100% với cùng seed/config.
  - Throughput đủ cho smoke + stress vừa phải (không benchmark cực hạn).
  - Log structure có run_id/event_index để trace.

# Architecture
- Modules tối thiểu:
  1. Scenario loader (yaml/json).
  2. Event planner (seeded RNG + timeline).
  3. Payload builder (topic-specific).
  4. Fault injector (deterministic transforms).
  5. MQTT publisher (qos/topic routing, reconnect policy).
  6. Artifact writer (ndjson events + summary).
- Event schema chuẩn:
  - `run_id`, `event_index`, `scheduled_at`, `topic`, `payload_hash`, `fault_type`, `expected_effect`.

# Related code files
- Modify:
  - `resources/mock-data/scripts/backend-simulator-service.ts`
  - `resources/mock-data/simulator-specs/backend-simulator-types.ts`
  - `resources/mock-data/simulator-specs/backend-simulator-validator.ts`
- Create:
  - `resources/mock-data/scripts/mqtt-device-simulator-runner.ts`
  - `resources/mock-data/simulator-specs/mqtt-scenarios-catalog.json`
  - `resources/mock-data/simulator-specs/mqtt-fault-injection-policy.json`
- Delete:
  - none

# Implementation Steps
1. Thiết kế schema scenario + defaults để giảm config dư thừa (YAGNI).
2. Định nghĩa generator base telemetry hợp lý: route/speed/battery/sat/ignition.
3. Tạo fault injector độc lập theo từng fault type, toggle theo scenario.
4. Thiết kế reconnect/backoff bounded với jitter nhẹ.
5. Tạo replay mode đọc ndjson plan và phát đúng timing.
6. Tạo validation pre-flight: topic/payload/schema/device_id/token presence.
7. Tạo artifact outputs: event-plan, publish-result, error-summary.

# Todo list
- [x] Chốt scenario catalog baseline + mixed fault campaign.
- [x] Chốt deterministic seed strategy và replay checksum.
- [x] Chốt reconnect policy và seq_no/boot_id policy.
- [x] Chốt invalid payload classes và expected drop behavior.
- [x] Chốt artifact structure phục vụ phase verify/fix-loop.

# Success Criteria
- Replay cùng seed/config cho cùng payload_hash sequence (>=99.9% exact match, timing drift cho phép ±100ms local).
- Baseline scenario: publish success >= 99% cho payload hợp lệ.
- Fault scenario: tỷ lệ fault xuất hiện nằm trong tolerance ±2% so cấu hình.
- Invalid payload phải bị local validator flag trước publish nếu ở strict mode.
- Không log token clear-text trong artifact/log.

# Risk Assessment
- Risk: mô phỏng quá phức tạp -> khó maintain.
  - Mitigation: giữ 6 fault core, defer fault mới.
- Risk: replay timing lệch do OS scheduling.
  - Mitigation: dùng timestamp-based scheduler + tolerance window.
- Risk: duplicate/out-of-order gây nhầm với reconnect effects.
  - Mitigation: annotate fault_type rõ trên từng event.

# Security Considerations
- Auth token chỉ đọc từ env/secrets file ngoài repo.
- Artifact phải redact token trước khi lưu.
- Không publish nhầm môi trường: bắt buộc explicit target env flag.
- Có circuit breaker local để dừng publish khi error burst vượt ngưỡng.

# Next steps
- Chuyển phase 03 để orchestration VPS verify + triage/fix dựa trên artifacts phase 02.
- Unresolved questions:
  1. Strict mode có cho phép publish payload lỗi có chủ đích hay chỉ flag + skip?
  2. Có cần multi-device simulation ngay phase đầu hay defer sau smoke 1-device?
