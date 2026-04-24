---
type: concept
repo: iot-vehicle-tracking-system
domain:
  - embedded-firmware-runtime
  - backend-cloud-processing
knowledge_state: validated
confidence: medium
source_refs:
  - ../70-sources/evidence-cards/thesis-ch03-evidence-cards.yaml
  - ../70-sources/evidence-cards/repo-reality-evidence-cards.yaml
  - ../../../docs/system-architecture.md
review_due: 2026-05-24
owner_scope: owned
---
# Concept: OTA And Config Flow

## Remote Config Flow
- Backend publishes a command on `v1/{device_id}/commands`.
- Firmware parses `update_config` and mutates only approved runtime knobs.
- Current validated knobs include `tracking_interval_s` and `heartbeat_interval_s`.
- Config changes are persisted to NVS so they survive reboot.

## OTA Command Flow
- Backend or operator triggers `ota_update`.
- Required fields are `jobId`, `version`, `url`, `size`, and `sha256`.
- Optional fields include `force` and `confirmTimeoutSec`.
- Firmware reports lifecycle progress on `v1/{device_id}/firmware`.

## Current Raw OTA Status Set
- `assigned`
- `downloading`
- `verifying`
- `installing`
- `rebooting`
- `confirming`
- `success`
- `failed`
- `rolled_back`

## Current-Only Hardening Beyond Thesis Snapshot
- Backend checks artifact readiness before dispatch.
- Bridge deduplicates and rejects out-of-order OTA status regressions.
- Firmware confirmation now uses a persisted timeout deadline when trusted time exists.

## Why This Matters
- OTA is a multi-subsystem contract, not just a firmware helper.
- Drift between backend, bridge, and firmware status semantics creates operator confusion fast, so the raw-state set must stay explicit.

