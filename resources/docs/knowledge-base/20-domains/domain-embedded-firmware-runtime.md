---
type: domain
repo:
  - iot-vehicle-tracking-system
domain:
  - embedded-firmware-runtime
knowledge_state: validated
confidence: medium
source_refs:
  - ../10-repo-packs/iot-vehicle-tracking-system/30-concepts/concept-device-state-machine.md
  - ../10-repo-packs/iot-vehicle-tracking-system/30-concepts/concept-offline-buffering-and-replay.md
review_due: 2026-05-24
owner_scope: personal
---
# Domain: Embedded Firmware Runtime

## Stable Core
- The firmware is state-machine centered.
- Runtime orchestration spans modem, GNSS, BLE OBD2, IMU, power, MQTT, OTA, and sleep.
- Reliability is achieved through bounded retry, offline persistence, and state-aware cadence rather than one-shot loops.

## Promoted Notes
- [Device State Machine](../10-repo-packs/iot-vehicle-tracking-system/30-concepts/concept-device-state-machine.md)
- [Offline Buffering And Replay](../10-repo-packs/iot-vehicle-tracking-system/30-concepts/concept-offline-buffering-and-replay.md)
- [OTA And Config Flow](../10-repo-packs/iot-vehicle-tracking-system/30-concepts/concept-ota-and-config-flow.md)

## Still Open
- Hardware-vs-firmware certainty for modem control pins remains lower than for the runtime state model.

