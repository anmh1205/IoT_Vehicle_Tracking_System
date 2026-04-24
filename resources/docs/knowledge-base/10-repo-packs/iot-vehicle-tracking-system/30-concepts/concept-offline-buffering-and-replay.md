---
type: concept
repo: iot-vehicle-tracking-system
domain:
  - embedded-firmware-runtime
  - iot-fleet-tracking
knowledge_state: validated
confidence: medium
source_refs:
  - ../70-sources/evidence-cards/thesis-ch03-evidence-cards.yaml
  - ../70-sources/evidence-cards/repo-reality-evidence-cards.yaml
review_due: 2026-05-24
owner_scope: owned
---
# Concept: Offline Buffering And Replay

## Stable Idea
When connectivity is unstable, the tracker does not rely on immediate broker availability. It buffers locally, persists to storage, and replays once MQTT is healthy again.

## Promoted Claims
- Firmware uses local queueing plus microSD-backed persistence.
- Replay is sequence-ordered rather than fire-and-forget.
- Critical records use ACK-aware handling before they are considered safe to drop.
- Storage pressure is bounded by local cleanup/GC rather than infinite growth.

## Operational Boundaries
- The design assumes the SD card is present from boot.
- Hot-plug card workflows are not part of the promoted operating model.
- This concept belongs to runtime reliability, not just storage implementation.

## Why It Matters Beyond One File
- It explains how the device tolerates network loss without redefining the MQTT contract.
- It affects telemetry trust, alert latency, and how operators interpret late-arriving events.

## Still Unresolved
- The exact ACK boundary that should count as “durably delivered” remains an open firmware question and stays tracked in repo open questions.

