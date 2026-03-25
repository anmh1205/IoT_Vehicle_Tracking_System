# Phase 04 - Add Verification and Safety Gates

## Context links
- Plan: [plan.md](./plan.md)
- Previous phase: [phase-03-generate-routing-and-storage-pipelines.md](./phase-03-generate-routing-and-storage-pipelines.md)

## Overview
- Priority: P0
- Status: pending
- Description: Thêm bộ gate để đảm bảo đúng schema, đúng mapping, đúng hiệu năng trước rollout.

## Key insights
- EMQX có metrics và fallback actions; có thể dùng để monitor failed sinks.
- Victoria ingestion APIs có thể stream nhưng không trả parse error đầy đủ; cần monitor invalid rows metrics.
- Bridge đang có batch writer + circuit breaker; cần mở rộng thành gate metrics.

## Requirements
- Functional:
1. Contract tests: validate topic/payload/mapping compatibility.
2. Replay tests: feed sample payloads và verify outputs vào PG/VM/VL.
3. Performance tests: ingest burst + reconnect storm.
4. Safety gates: data loss, invalid rows, sink failure ratio, latency SLO.
5. Rollback path: disable new routes + switch old mappings.
- Non-functional:
1. Test suite chạy trong CI <= 20 phút.
2. Gate output rõ fail reason + fix hint.

## Architecture
- Verification layers:
1. Static gate: schema + mapping lint.
2. Dynamic gate: integration replay on ephemeral stack.
3. Runtime gate: canary checks on real telemetry slice.
- Go/No-go thresholds:
1. mapping success >= 99.5%
2. invalid payload <= 0.5%
3. P95 ingest-to-store latency within agreed SLO

## Related code files
- Files to modify:
1. `iot-vehicle-tracking-system/Tracking_MqttBridge/src/services/batch-writer.service.ts`
2. `iot-vehicle-tracking-system/Tracking_MqttBridge/src/infrastructure/logger.ts`
- Files to create:
1. `tools/iot-infra-codegen/tests/contract-validation.test.ts`
2. `tools/iot-infra-codegen/tests/replay-integration.test.ts`
3. `tools/iot-infra-codegen/tests/perf-smoke.test.ts`
4. `resources/templates/iot-infra/test-payloads/*.jsonl`
5. `resources/templates/iot-infra/runbooks/rollback-checklist.md`
- Files to delete: none

## Implementation steps
1. Build fixture pack payloads theo message families + edge cases.
2. Build replay harness publish MQTT và check sinks.
3. Add counters for sink success/fail/drop per mapping.
4. Define SLO thresholds in config.
5. Add CI gates + report artifact.
6. Add rollback dry-run script.

## Todo list
- [ ] Hoàn tất static contract lint.
- [ ] Hoàn tất replay harness + assertions.
- [ ] Hoàn tất perf smoke scripts.
- [ ] Hoàn tất rollback drill script.

## Success criteria
- Mọi thay đổi catalog đều pass static + replay + perf smoke.
- Có report gate trong CI trước merge/deploy.

## Risk assessment
- Risk: fixture không cover payload thực tế.
- Mitigation: capture anonymized samples from UAT/prod into regression corpus.

## Security considerations
- Sample payloads phải anonymize/mask field nhạy cảm.
- Restrict test broker credentials scope.

## Next steps
- Bàn giao gate outputs cho Phase 05 để đóng gói workflow cho agent và team.
