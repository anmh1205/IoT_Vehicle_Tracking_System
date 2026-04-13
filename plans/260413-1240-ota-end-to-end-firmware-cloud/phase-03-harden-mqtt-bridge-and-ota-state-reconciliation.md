# Phase 03 — Harden MQTT bridge and OTA state reconciliation

## Context links
- Parent plan: `./plan.md`
- Depends on: `./phase-02-harden-backend-artifact-and-deployment-contract.md`
- Bridge files:
  - `.../Tracking_MqttBridge/src/handlers/firmware.handler.ts`
  - `.../Tracking_MqttBridge/src/validators/payload.validator.ts`
  - `.../Tracking_MqttBridge/src/types/payload.types.ts`
  - `.../Tracking_MqttBridge/src/mqtt/subscriptions.ts`

## Overview
- Date: 2026-04-13
- Description: Make OTA status ingestion idempotent, ordered enough, and observable enough for real operations.
- Priority: P1
- Implementation status: pending
- Review status: pending

## Key Insights
- Current handler upserts latest row by `job_id + device_id`. Good start. Not enough for out-of-order progress, duplicate messages, or stale terminal overwrites.
- Firmware payload already carries metadata (`message_id`, `seq_no`, `boot_id`). This is the cheap lever. Use it.
- MQTT QoS 1 reduces loss, not duplicates or ordering bugs.
- KISS: do not build event-sourcing if one deployment table + optional audit trail is enough.

## Requirements
- Accept valid firmware payloads and reject malformed/mismatched/device-auth-failed ones.
- Prevent old progress from overwriting newer state.
- Prevent terminal `success/failed/rolled_back` from being downgraded by late non-terminal events.
- Preserve enough audit history for debugging stuck or duplicate flows.
- Surface logs/metrics useful on VPS.

## Architecture
- Keep `firmware_update_log` as current-state table if that is existing pattern.
- Add one lightweight event/audit path if current table cannot explain ordering issues.
- Ordering rule should prefer:
  1. same job/device only
  2. higher `seq_no` wins when available
  3. terminal states are sticky unless manual rollback creates a valid later terminal state
  4. duplicate `message_id` ignored
- `boot_id` should help distinguish pre-reboot vs post-reboot confirm events.

## Related code files
- Primary later changes:
  - `.../Tracking_MqttBridge/src/handlers/firmware.handler.ts`
  - `.../Tracking_MqttBridge/src/validators/payload.validator.ts`
  - `.../Tracking_MqttBridge/src/types/payload.types.ts`
- Likely DB/repo/infrastructure files later:
  - DB migrations/table schema for firmware update log / audit trail
  - VictoriaLogs or metrics writer helpers
  - backend deployment query services if they read this table directly

## Implementation Steps
1. Freeze accepted firmware states and validate them explicitly.
2. Add duplicate suppression using `message_id` if available.
3. Add monotonic update rule using `seq_no` and terminal-state precedence.
4. Distinguish raw status from derived deployment summary; do not lose firmware-native state names.
5. Add explicit stuck heuristics inputs:
   - last_seen_at
   - last_seq_no
   - last_boot_id
   - first_assigned_at / started_at / completed_at
6. Improve VictoriaLogs payload fields for OTA debugging.
7. If needed, emit backend-consumable internal events for `progress`, `complete`, `failed`, `rolled_back`, `stuck`.

## Todo list
- [ ] Harden firmware payload validation
- [ ] Add duplicate suppression strategy
- [ ] Add out-of-order update rule
- [ ] Make terminal state sticky
- [ ] Improve OTA logs/metrics fields

## Success Criteria
- Duplicate publish does not create state regression.
- Late `downloading` cannot overwrite `success`.
- Post-reboot `confirming/success` can be correlated to same job.
- VPS logs are enough to debug a stuck or misordered OTA run.

## Risk Assessment
- Risk: over-reliance on timestamp ordering from different clocks.
  - Mitigation: prefer `seq_no`, `message_id`, `boot_id`, DB receive time.
- Risk: schema change spills into frontend/backend unexpectedly.
  - Mitigation: keep response compatibility; add fields, do not break existing readers.

## Security Considerations
- Keep device auth verification mandatory for firmware topic ingest.
- Do not trust payload `device_id` when topic mismatch exists.
- Avoid storing secrets in OTA event logs.

## Next steps
- Phase 04 aligns firmware runtime behavior to the hardened cloud contract and error taxonomy.
