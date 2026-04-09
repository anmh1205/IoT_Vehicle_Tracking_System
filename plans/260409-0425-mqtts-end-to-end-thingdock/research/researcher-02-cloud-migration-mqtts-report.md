# Research Report: Cloud-side production-ready MQTT ingest + JSON versioned migration

**Timestamp:** 2026-04-09 04:25:55 Asia/Saigon
**Work context:** `E:/anmh1205/IoT_Vehicle_Tracking_System`

## Executive Summary
Mục tiêu tối giản và thực tế: giữ EMQX làm broker biên, MQTT Bridge làm lớp normalize/route, backend làm business + query API, storage tách metrics/logs/relational, observability có SLI/SLO rõ. Payload nên chuyển sang **JSON envelope versioned** sớm, nhưng cần **compatibility window** đủ dài để rollout không gãy device cũ.

Khuyến nghị chính: dùng **bridge transform + backend validate** làm đường chính; chỉ dùng dual-publish tạm thời cho migration ngắn hạn. ACL phải theo scope `v1/{device_id}/...`, retained cực hạn chế, QoS theo topic như hiện tại nhưng command/events giữ QoS 1. Idempotency không dựa vào broker; phải dựa vào `message_id` + dedup store ở bridge/backend.

## Research Methodology
- Sources consulted: 7
- Date range: MQTT spec nền tảng + docs EMQX/VM/registry docs hiện hành
- Key terms: MQTT bridge, ACL, retained messages, QoS, schema validation, schema registry, idempotency, ordering, dedup, SLI, SLO, rollout, rollback

## Key Findings

### 1) Schema versioning strategy
- Dùng envelope JSON thống nhất:
```json
{
  "schema_version": "1.0.0",
  "message_id": "uuidv7",
  "device_id": "...",
  "topic": "v1/{device_id}/rawdata",
  "sent_at": "2026-04-09T04:25:55Z",
  "produced_at": "...",
  "payload": { }
}
```
- Quy tắc version:
  - `schema_version` = semver cho envelope, không nhét version vào topic.
  - Major tăng khi field bị remove/semantics đổi.
  - Minor tăng khi add field optional.
  - Patch cho metadata/bugfix không phá schema.
- Compatibility window đề xuất: giữ hỗ trợ **N-1 major** tối thiểu 90 ngày hoặc 2 release train, whichever longer.
- Validate schema ở bridge/backend bằng JSON Schema; EMQX Schema Validation có thể chặn early reject.

### 2) Migration strategy trade-off
| Strategy | Pros | Cons | Khuyến nghị |
|---|---|---|---|
| Dual publish | an toàn rollout device cũ/mới | tăng traffic, phức tạp, dễ lệch dữ liệu | chỉ dùng ngắn hạn cho UAT/prod cutover |
| Bridge transform | 1 chỗ normalize, consistent, dễ audit | bridge thành critical path | **chính** cho migration |
| Backend transform | giữ bridge mỏng, business dễ đổi | backend gánh format cũ/mới lâu | dùng làm fallback/compat layer |
- Kết luận: **bridge transform + backend backward parser** là baseline. Dual publish chỉ khi device firmware không thể update đồng bộ.

### 3) Broker/ACL policy baseline
- ACL theo device scope: device chỉ publish/subscribe trong `v1/{device_id}/...` của chính nó.
- Server/bridge có quyền cross-device read/write có kiểm soát.
- Retained policy: chỉ cho retained trên `status`/`commands`/bootstrap config; **không retained rawdata**.
- QoS policy:
  - `rawdata`: QoS 0
  - `status`: QoS 1
  - `events`: QoS 1
  - `firmware`: QoS 1
  - `commands`: QoS 1
- Must enforce TLS MQTT (`8883`) + authn per device.

### 4) Ingestion idempotency + ordering + dedup
- MQTT QoS 1 vẫn có duplicate; không giả định exactly-once.
- Dedupe key nên là:
  - primary: `message_id`
  - fallback: `(device_id, topic, seq_no)` nếu message_id thiếu
- Ordering:
  - chỉ guarantee best-effort theo device/topic stream, không global ordering.
  - dùng `seq_no` per device/topic nếu cần monotonic detect gap/out-of-order.
- Storage side:
  - dedup window trong Redis/Postgres uniq index, TTL theo topic.
  - rawdata có thể drop duplicate; events/commands phải idempotent upsert.

### 5) Observability SLI/SLO
- SLI đề xuất:
  - ingest success rate
  - bridge-to-backend end-to-end latency p95/p99
  - broker disconnect rate
  - duplicate/drop rate
  - schema validation failure rate
  - retained publish count per topic
- SLO đề xuất:
  - 99.9% publish success for status/events/commands per 30d
  - p95 ingest-to-persist < 2s cho events/status, < 5s cho rawdata batch route
  - schema reject rate < 0.1% (excluding invalid clients)
- Alert khi: backlog tăng, reconnect storm, validation failures spike, dedup hit-rate bất thường.

### 6) Test strategy matrix
| Layer | What to test | Acceptance |
|---|---|---|
| Unit | envelope parse, version routing, ACL rules, dedup key | pass all cases |
| Integration | EMQX -> bridge -> backend -> DB/metrics | end-to-end message visible once |
| Soak | high-rate rawdata + intermittent reconnect | no memory leak, no queue explosion |
| Network fault | broker restart, TLS fail, packet loss, duplicate publish | recover without data corruption |
| Acceptance | rollout canary + rollback | no SLO breach, no invalid schema accepted |

### 7) Rollout/rollback runbook
- Local: enable bridge transform + schema validate; use synthetic device, verify metrics/logs/dashboard.
- UAT: canary 5-10% device scope, compare old/new payload counts, watch dedup/validation/error SLI.
- Prod: progressive by fleet shard; freeze schema changes during cutover window.
- Rollback conditions:
  - validation failure > threshold
  - end-to-end latency p95 > 2x baseline
  - duplicate/drop rate tăng rõ
  - broker auth/ACL misfire
- Rollback action: disable transform feature flag, revert to previous bridge parser, keep backward parser active.

## Comparative Analysis
- OASIS MQTT spec: confirm QoS semantics/dup/order limits; **don't promise exactly-once**.
- EMQX docs: ACL, retained, schema validation, bridge are the practical control points.
- Schema registry guidance: prefer compatibility modes + explicit evolution policy, not implicit topic versioning.
- For observability, keep metrics/logs separate; use Grafana only for visualization, not source of truth.

## Resources & References
### Official Documentation
- [EMQX MQTT Guide](https://docs.emqx.com/en/emqx/latest/design/mqtt-guide.html)
- [EMQX ACL](https://docs.emqx.com/en/emqx/latest/access-control/authn/acl.html)
- [EMQX Retained Messages](https://docs.emqx.com/en/emqx/latest/dashboard/retained.html)
- [EMQX Observability](https://docs.emqx.com/en/emqx/latest/observability/overview.html)
- [EMQX Schema Validation](https://docs.emqx.com/en/emqx/latest/data-integration/schema-validation.html)
- [EMQX Smart Data Hub / Schema Registry](https://docs.emqx.com/en/emqx/latest/data-integration/smart-data-hub.html)
- [OASIS MQTT v5.0 Spec](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html)

### Further Reading
- [MQTT Trends for 2026 and Beyond](https://assets.emqx.com/resources/white-papers/MQTT%20Trends%20for%202026.pdf)
- [OASIS transfer of OpenC2 via MQTT](https://docs.oasis-open.org/openc2/transf-mqtt/v1.0/csd03/transf-mqtt-v1.0-csd03.html)
- [Solace schema evolution best practices](https://docs.solace.com/Schema-Registry/schema-registry-best-practices.htm)
- [Azure Event Hubs schema registry concepts](https://learn.microsoft.com/en-us/azure/event-hubs/schema-registry-concepts)

## Unresolved Questions
- EMQX Bridge cụ thể ở repo hiện tại sẽ terminate TLS hay forward TLS end-to-end?
- Storage ưu tiên cuối cùng: Postgres-only hay cần thêm Redis/stream buffer cho dedup window?
- Fleet rollout policy theo device group/region đã có inventory source of truth chưa?
