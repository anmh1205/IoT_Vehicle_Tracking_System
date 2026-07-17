---
type: repo
repo: iot-vehicle-tracking-system
domain:
  - iot-fleet-tracking
knowledge_state: validated
confidence: high
source_refs:
  - ./70-sources/reconciliation-summary.md
  - ./70-sources/source-registry.md
  - ../../../README.md
review_due: 2026-05-24
owner_scope: owned
---
# IoT Vehicle Tracking System

This repo pack is the first promoted layer built from thesis intent plus current repo truth. It is meant for agent onboarding and human re-entry, not for replacing code or service-local docs.

## Stable Now
- The runtime still centers on device firmware, EMQX, MQTT Bridge, Backend, Frontend, PostgreSQL, VictoriaMetrics, VictoriaLogs, and Grafana.
- The MQTT topic contract and internal realtime event spine are still coherent across thesis, firmware, and bridge code.
- The firmware still uses a state-machine model with offline buffering/replay and OTA/config command handling.
- The deployment model is still per-service Docker Compose plus shared external network `tracking-network`.

## Current-Only Extensions
- The frontend now has an explicit `/login` entry and session-gated dashboard shell.
- The repo now treats `Tracking_Mobile` as a current runtime surface, not only a future roadmap item.
- OTA status handling is stricter than the thesis snapshot and now uses a canonical raw-state set end to end.

## Do Not Flatten These Yet
- EMQX and VictoriaMetrics host-port exposure are in conflict between thesis/README and current compose files.
- The frontend env-template story is incomplete: the runtime expects env keys, but `Tracking_Frontend/.env.example` is missing.
- Thesis frontend stack versions are historical context, not current runtime truth.

## Pack Map
- [Architecture](./10-architecture.md)
- [Device To Cloud Flow](./20-systems/system-device-to-cloud-flow.md)
- [Cloud To Dashboard Flow](./20-systems/system-cloud-to-dashboard-flow.md)
- [MQTT Topic Contract](./30-concepts/concept-mqtt-topic-contract.md)
- [Device State Machine](./30-concepts/concept-device-state-machine.md)
- [Offline Buffering And Replay](./30-concepts/concept-offline-buffering-and-replay.md)
- [OTA And Config Flow](./30-concepts/concept-ota-and-config-flow.md)
- [Bring Up Local Stack](./40-runbooks/runbook-bring-up-local-stack.md)
- [Trace MQTT Ingestion](./40-runbooks/runbook-trace-mqtt-ingestion.md)
- [Validate Frontend Backend Health](./40-runbooks/runbook-validate-frontend-backend-health.md)
- [Decision: Thesis As Design Anchor](./50-decisions/decision-thesis-as-design-anchor-not-current-truth.md)
- [Open Questions](./60-open-questions.md)
- [Source Registry](./70-sources/source-registry.md)

