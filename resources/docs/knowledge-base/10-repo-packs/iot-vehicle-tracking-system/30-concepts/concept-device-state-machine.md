---
type: concept
repo: iot-vehicle-tracking-system
domain:
  - embedded-firmware-runtime
knowledge_state: validated
confidence: medium
source_refs:
  - ../70-sources/evidence-cards/thesis-ch03-evidence-cards.yaml
  - ../70-sources/evidence-cards/repo-reality-evidence-cards.yaml
review_due: 2026-05-24
owner_scope: owned
---
# Concept: Device State Machine

## Stable State Model

| State | Role |
|---|---|
| `INIT` | Bring up runtime and peripherals |
| `CHECK_IGN` | Decide whether the vehicle is active or parked |
| `DRIVING` | Continuous tracking mode |
| `PARKED` | Low-activity parked mode |
| `ALARM` | Escalated motion/abnormal activity mode |
| `HEARTBEAT` | Periodic wake-and-report pass |
| `SLEEP` | Deep-sleep low-power mode |

## Stable Transition Shape
- `INIT -> CHECK_IGN`
- `CHECK_IGN -> DRIVING | PARKED`
- `DRIVING -> PARKED` when ignition/activity drops
- `PARKED -> ALARM` on motion
- `PARKED -> HEARTBEAT` on timer wake
- `HEARTBEAT -> SLEEP`
- `SLEEP -> CHECK_IGN` on wake source

## Why It Matters
- MQTT cadence, modem behavior, BLE/OBD work, and sleep policy all hinge on the current state.
- The state machine is the main reason the firmware pack is still legible despite subsystem breadth.
- Current firmware notes still describe the runtime as a state-machine-centered architecture even as implementation details continue to evolve.

## Boundary For This Note
- This note promotes the stable state model only.
- It does not pin exact source-file ownership for every runtime helper while the firmware runtime layout continues to evolve.

