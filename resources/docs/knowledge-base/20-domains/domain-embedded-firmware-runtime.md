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

## Logging Convention
- Prefer `event=... key=value ...` logs for runtime and field diagnostics.
- Put the stable event name first; keep it short and grep-friendly.
- Name events in lower snake case and bias toward `subsystem_action[_result]`.
- Encode machine-useful context as explicit keys such as `reason`, `err`, `mode`, `gpio`, `boot_id`, `seq`, `state`.
- Reuse the same keys across modules for the same concept: `timeout_ms`, `response_len`, `count`, `from`, `to`, `action`.
- Reserve prose-heavy text for comments and docs; serial logs should optimize for triage under noisy field conditions.
- Prefer one event per line and avoid parenthetical prose when the same fact can be expressed as keys.

## Still Open
- Hardware-vs-firmware certainty for modem control pins remains lower than for the runtime state model.

