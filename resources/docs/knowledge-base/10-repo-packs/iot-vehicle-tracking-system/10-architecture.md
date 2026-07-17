---
type: architecture
repo: iot-vehicle-tracking-system
domain:
  - iot-fleet-tracking
knowledge_state: validated
confidence: high
source_refs:
  - ./70-sources/reconciliation-summary.md
  - ./70-sources/evidence-cards/thesis-ch03-evidence-cards.yaml
  - ./70-sources/evidence-cards/repo-reality-evidence-cards.yaml
review_due: 2026-05-24
owner_scope: owned
---
# Architecture Overview

## Current System Shape

```text
ESP32-S3 tracker runtime
  -> EMQX
  -> Tracking_MqttBridge
  -> PostgreSQL / VictoriaMetrics / VictoriaLogs
  -> Tracking_Backend (REST + Socket.IO + OpenAPI)
  -> Tracking_Frontend / Tracking_Mobile

Grafana reads VictoriaMetrics and VictoriaLogs.
NPM remains optional for ingress/proxy use.
```

## Stable Boundaries

| Layer | Current truth |
|---|---|
| Device | ESP32-S3 firmware orchestrates LTE/GNSS, BLE OBD2, IMU, power, MQTT, OTA |
| Broker | EMQX remains the central MQTT broker |
| Ingest | MQTT Bridge validates payloads and fans data out to storage plus internal events |
| Storage | PostgreSQL stores relational state; VictoriaMetrics and VictoriaLogs handle telemetry/log streams |
| Application | Backend serves REST, OpenAPI, health, metrics, and realtime fan-out |
| Clients | Frontend dashboard is primary; mobile shell is present as a current extension |
| Ops | Grafana is the current monitoring UI; NPM is optional |

## What Stayed Aligned With The Thesis
- Layered device-to-cloud-to-dashboard flow
- Versioned MQTT topic tree under `v1/{device_id}/...`
- Shared-network, per-service Docker deployment model
- Split storage model instead of one database for everything

## What Drifted But Is Still Important
- The current frontend runtime is now Next.js `16.1.6`, not the thesis-frozen Next.js 15 baseline.
- The current frontend access model adds `/login`, `/landing`, and `session_token` route protection.
- The current repo includes a mobile shell as an active service surface.

## What Is Explicitly Not Promoted As Current Truth
- EMQX host ports `1883/18083` and VictoriaMetrics host port `8428` are still in conflict between docs and compose files.
- The thesis env appendix still uses an older broker-env shape and assumes frontend env template presence.

