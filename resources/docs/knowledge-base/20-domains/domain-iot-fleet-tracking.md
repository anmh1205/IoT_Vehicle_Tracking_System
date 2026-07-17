---
type: domain
repo:
  - iot-vehicle-tracking-system
domain:
  - iot-fleet-tracking
knowledge_state: validated
confidence: medium
source_refs:
  - ../10-repo-packs/iot-vehicle-tracking-system/00-home.md
  - ../10-repo-packs/iot-vehicle-tracking-system/10-architecture.md
review_due: 2026-05-24
owner_scope: personal
---
# Domain: IoT Fleet Tracking

## Stable Domain Shape
- A tracker device publishes operational state, not just raw coordinates.
- Cloud ingest is MQTT-first.
- The operations surface depends on both historical REST data and realtime push.
- Reliability depends on power policy, connectivity recovery, replay behavior, and alert visibility.

## Repo Evidence In This Batch
- [Repo Home](../10-repo-packs/iot-vehicle-tracking-system/00-home.md)
- [Architecture Overview](../10-repo-packs/iot-vehicle-tracking-system/10-architecture.md)
- [MQTT Topic Contract](../10-repo-packs/iot-vehicle-tracking-system/30-concepts/concept-mqtt-topic-contract.md)
- [Offline Buffering And Replay](../10-repo-packs/iot-vehicle-tracking-system/30-concepts/concept-offline-buffering-and-replay.md)

## Current Domain Risks
- Local onboarding docs still drift from current compose exposure.
- Mobile is present, but the pack has not promoted a dedicated mobile note yet.

