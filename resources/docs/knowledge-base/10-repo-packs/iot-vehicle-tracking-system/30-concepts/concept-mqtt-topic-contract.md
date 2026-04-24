---
type: concept
repo: iot-vehicle-tracking-system
domain:
  - iot-fleet-tracking
knowledge_state: validated
confidence: high
source_refs:
  - ../70-sources/evidence-cards/thesis-ch03-evidence-cards.yaml
  - ../70-sources/evidence-cards/repo-reality-evidence-cards.yaml
review_due: 2026-05-24
owner_scope: owned
---
# Concept: MQTT Topic Contract

## Validated External Contract

| Topic | Direction | QoS | Current meaning |
|---|---|---|---|
| `v1/{device_id}/rawdata` | Device -> Server | 0 | High-frequency telemetry snapshots |
| `v1/{device_id}/status` | Device -> Server | 1 | Heartbeat and runtime status |
| `v1/{device_id}/events` | Device -> Server | 1 | Alerts and notable events |
| `v1/{device_id}/firmware` | Device -> Server | 1 | OTA progress and results |
| `v1/{device_id}/commands` | Server -> Device | 1 | Remote config and OTA control |

## Validated Internal Contract

| Topic | Producer | Consumer | Role |
|---|---|---|---|
| `internal/events/device/status` | MQTT Bridge | Backend realtime listener | Online/offline and runtime transitions |
| `internal/events/device/alert` | MQTT Bridge | Backend realtime listener | Alert fan-out |
| `internal/events/device/session` | MQTT Bridge | Backend realtime listener | Session transitions |
| `internal/events/device/data` | MQTT Bridge | Backend realtime listener | Telemetry-position realtime updates |
| `internal/events/device/geofence` | MQTT Bridge | Backend / UI consumers | Geofence-related internal events |

## Validated Command Surface
- `update_config`
- `request_location`
- `enable_tracking`
- `reboot`
- `ota_update`
- `manual_rollback`
- `ota_rollback`

## Why This Contract Matters
- Devices and bridge code both build around the same versioned topic tree.
- The bridge QoS policy matches the thesis rationale for “loss-tolerant telemetry, loss-intolerant state”.
- Backend realtime depends on the internal event spine, not on reading device topics directly.

## Not Revalidated In This Batch
- Per-device ACL rules were asserted by thesis intent, but not rechecked from live EMQX runtime configuration.

