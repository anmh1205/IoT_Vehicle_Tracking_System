---
type: runbook
repo: iot-vehicle-tracking-system
domain:
  - iot-fleet-tracking
  - backend-cloud-processing
knowledge_state: distilled
confidence: medium
source_refs:
  - ../30-concepts/concept-mqtt-topic-contract.md
  - ../20-systems/system-device-to-cloud-flow.md
  - ../70-sources/evidence-cards/repo-reality-evidence-cards.yaml
review_due: 2026-05-08
owner_scope: owned
---
# Runbook: Trace MQTT Ingestion

State: source-backed only in this batch. Use it as an operator trace path, not as an already rerun proof.

## Preconditions
- EMQX, MQTT Bridge, Backend, and storage services are up
- A real device or simulator is publishing at least one known `device_id`

## Steps
1. Confirm the device is publishing on the expected topic family:
   - `v1/{device_id}/rawdata`
   - `v1/{device_id}/status`
   - `v1/{device_id}/events`
   - `v1/{device_id}/firmware`

2. Confirm MQTT Bridge subscribed successfully to `v1/+/rawdata`, `status`, `events`, and `firmware`.
   - If the bridge runs locally, use its `/health` or `/ready` endpoint.
   - If it runs in Docker only, inspect bridge logs for subscription confirmations and validation failures.

3. Trace one event through storage:
   - `rawdata` should fan out to VictoriaMetrics and device/session state paths
   - `status` should update device runtime visibility
   - `events` should reach alert/event handling
   - `firmware` should update OTA tracking

4. Confirm internal realtime fan-out:
   - MQTT Bridge publishes under `internal/events/device/*`
   - Backend listener stays subscribed to `internal/events/#`

5. Confirm the dashboard path can consume the update:
   - backend `/ws-health` is alive
   - frontend session is open
   - the affected device/UI surface refreshes through socket or invalidation path

## Success Signals
- Bridge reports or logs successful topic subscription.
- No bridge-side payload validation error blocks the message.
- Internal event traffic appears under `internal/events/device/status`, `alert`, `session`, or `data`.
- Backend realtime health remains live while the event passes.

## Useful Checks

```sql
SELECT device_id, current_status, last_seen_at
FROM devices
WHERE device_id = '<device_id>';
```

```bash
curl http://localhost:4000/ws-health
```

