# Phase 01 - Define Canonical Contract and Mapping DSL

## Context links
- Plan: [plan.md](./plan.md)
- Research: [reports/research-synthesis.md](./reports/research-synthesis.md)
- Current stack reference: `README.md`, `Tracking_MqttBridge/src/handlers/*`, `Tracking_PostgreSQL/init/*`

## Overview
- Priority: P0
- Status: pending
- Description: Chốt cách mô tả payload/topic/mapping bằng contract có version, để agent có thể generate infra artifacts từ config.

## Key insights
- EMQX Rule Engine là SQL-based, có transform + action qua connectors/sinks.
- EMQX PostgreSQL sink support prepared SQL templates, hợp cho mapping từ rule output.
- VictoriaMetrics cảnh báo high cardinality tốn tài nguyên; cần set label policy ngay từ contract.
- VictoriaLogs cho phép set `_msg_field`, `_time_field`, `_stream_fields`; hợp cho log projection declarative.

## Requirements
- Functional:
1. Có `message-catalog.yaml` mô tả topic pattern, payload schema, retention class, qos.
2. Có mapping block cho `postgres`, `metrics`, `logs`, `internal-events`.
3. Có versioning strategy: `topic_version`, `schema_version`, `mapping_version`.
4. Có compatibility mode: add-only field, deprecation window.
- Non-functional:
1. Parse/validate contract trong < 2s cho catalog <= 200 message types.
2. Contract validator fail-fast và trả lỗi rõ field sai.

## Architecture
- Canonical envelope tối thiểu:
1. `message_id`, `device_id`, `tenant_id` (optional phase 1), `ts`, `type`, `schema_version`, `trace_id`.
- DSL blocks:
1. `topics[]` -> source routing.
2. `schema` -> JSON Schema refs.
3. `transform` -> field projection/expression.
4. `sinks` -> postgres/metrics/logs with field maps.
5. `security` -> auth context + required claims.

## Related code files
- Files to modify:
1. `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/constants/topics.ts`
2. `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/validators/payload.validator.ts`
- Files to create:
1. `resources/templates/iot-infra/message-catalog.yaml`
2. `resources/templates/iot-infra/payload-schemas/base-envelope.schema.json`
3. `resources/templates/iot-infra/mappings/default-mapping.yaml`
4. `tools/iot-infra-codegen/src/contract-validator.ts`
- Files to delete: none

## Implementation steps
1. Draft `message-catalog.yaml` schema + examples cho `rawdata/status/events/firmware`.
2. Định nghĩa naming convention cho topic và schema versions.
3. Viết JSON Schema cho envelope và payload families.
4. Định nghĩa mapping DSL (postgres/metrics/logs/internal events).
5. Build validator CLI: `validate-contract`.
6. Add compatibility checker: compare old/new catalog.
7. Add docs note: "how to add new message type".

## Todo list
- [ ] Hoàn tất message-catalog spec v1.
- [ ] Hoàn tất JSON Schema envelope + 4 message families.
- [ ] Hoàn tất contract validator + compatibility checker.
- [ ] Chốt policy label/log stream fields.

## Success criteria
- Có 1 sample catalog generate được mapping config cho 4 message types.
- Thêm 1 field mới trong payload không cần sửa hard-code handler.
- Contract validator bắt được schema drift trước deploy.

## Risk assessment
- Risk: DSL quá phức tạp ngay phase 1.
- Mitigation: giữ DSL tối thiểu, ưu tiên 80% use case; để extension phase sau.

## Security considerations
- Payload contract có đánh dấu field nhạy cảm (`pii`, `secret`) để mask trước khi vào logs.
- Require signature/auth metadata trong envelope với command/status critical.

## Next steps
- Bàn giao artifact cho Phase 02 để scaffold runtime profiles theo contract.
