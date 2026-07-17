---
type: domain
repo:
  - iot-vehicle-tracking-system
domain:
  - backend-cloud-processing
knowledge_state: validated
confidence: medium
source_refs:
  - ../10-repo-packs/iot-vehicle-tracking-system/20-systems/system-device-to-cloud-flow.md
  - ../10-repo-packs/iot-vehicle-tracking-system/20-systems/system-cloud-to-dashboard-flow.md
review_due: 2026-05-24
owner_scope: personal
---
# Domain: Backend Cloud Processing

## Stable Core
- EMQX remains the broker boundary.
- MQTT Bridge is the ingestion and normalization edge.
- Backend is both a REST surface and a realtime relay.
- PostgreSQL, VictoriaMetrics, and VictoriaLogs stay split by responsibility.

## Promoted Notes
- [Device To Cloud Flow](../10-repo-packs/iot-vehicle-tracking-system/20-systems/system-device-to-cloud-flow.md)
- [Cloud To Dashboard Flow](../10-repo-packs/iot-vehicle-tracking-system/20-systems/system-cloud-to-dashboard-flow.md)
- [Validate Frontend Backend Health](../10-repo-packs/iot-vehicle-tracking-system/40-runbooks/runbook-validate-frontend-backend-health.md)

## Logging Convention
- Prefer structured logger payloads with `event` plus identifiers such as `deviceId`, `jobId`, `sessionId`, `topic`, `reason`.
- Keep the human message short and stable; avoid interpolated sentences when the same data can live in fields.
- Use warn/error for ingest anomalies, retries, sink failures, and dropped work; keep CRUD/business audit logs readable but still favor explicit fields over string assembly in new code.

## Current Domain Risks
- Local host-port exposure for broker/metrics services is still unresolved.
- Env contract naming drift can still mislead new operators.

