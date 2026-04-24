---
type: system
repo: iot-vehicle-tracking-system
domain:
  - iot-fleet-tracking
  - embedded-firmware-runtime
  - backend-cloud-processing
knowledge_state: validated
confidence: high
source_refs:
  - ../70-sources/evidence-cards/thesis-ch03-evidence-cards.yaml
  - ../70-sources/evidence-cards/repo-reality-evidence-cards.yaml
review_due: 2026-05-24
owner_scope: owned
---
# System: Device To Cloud Flow

## Stable Flow
1. The device state machine samples GNSS, power, IMU, and OBD2 context based on runtime mode.
2. Firmware builds five external topics from `device_id`: `rawdata`, `status`, `events`, `firmware`, and `commands`.
3. EMQX receives MQTT 3.1.1 traffic and remains the broker boundary between device and cloud services.
4. MQTT Bridge subscribes to `v1/+/rawdata`, `status`, `events`, and `firmware`, validates payloads, then fans them out to PostgreSQL, VictoriaMetrics, and VictoriaLogs.
5. MQTT Bridge also publishes normalized internal events under `internal/events/device/*`.
6. Backend subscribes to `internal/events/#` and uses that spine to feed realtime consumers.

## Where Reliability Is Added
- QoS stays asymmetric: `rawdata` is loss-tolerant, while `status`, `events`, `firmware`, and `commands` are not.
- Offline buffering and replay sit on the device side before the broker path is retried.
- Bridge-side validation prevents malformed payloads from reaching storage and realtime consumers.

## Not Promoted In This Note
- EMQX ACL enforcement is part of thesis intent, but it was not revalidated from local runtime config in this batch.
- Host-port exposure for local EMQX browser/admin access remains a conflict item, not a stable operational claim.

## Related Notes
- [MQTT Topic Contract](../30-concepts/concept-mqtt-topic-contract.md)
- [Offline Buffering And Replay](../30-concepts/concept-offline-buffering-and-replay.md)
- [Trace MQTT Ingestion](../40-runbooks/runbook-trace-mqtt-ingestion.md)

