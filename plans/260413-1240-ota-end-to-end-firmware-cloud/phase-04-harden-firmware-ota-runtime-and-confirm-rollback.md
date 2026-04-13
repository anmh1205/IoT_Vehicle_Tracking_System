# Phase 04 — Harden firmware OTA runtime and confirm/rollback

## Context links
- Parent plan: `./plan.md`
- Depends on: `./phase-03-harden-mqtt-bridge-and-ota-state-reconciliation.md`
- Firmware files:
  - `.../main/src/command_handler.c`
  - `.../main/src/state_machine.c`
  - `.../main/src/util.c`
  - `.../main/src/mqtt_client.c`
  - `.../main/main.c`

## Overview
- Date: 2026-04-13
- Description: Tighten firmware OTA execution so cloud and hardware behavior match a production-like contract.
- Priority: P1
- Implementation status: completed
- Review status: in_progress

## Key Insights
- Firmware already does real HTTPS download, SHA256 verify, partition switch, reboot, and post-boot confirm. Good.
- Current command slot is single in-memory slot. Good enough for one active OTA, not for queued jobs. YAGNI says keep single active job unless product explicitly needs more.
- Current failure mapping is too raw: many errors collapse to `esp_err_to_name(err)` and cloud/operator semantics stay vague.
- `confirm_timeout_sec` is stored in RTC context but not yet proven enforced.
- Manual rollback exists, but rollback semantics vs pending confirm vs current partition need real-device proof.

## Requirements
- Keep one-active-job OTA model.
- Harden preconditions, progress/status emission, reboot confirm, and rollback behavior.
- Map firmware failures into stable short error codes usable by backend/UI/operators.
- Preserve no-sleep/no-unsafe-window gates during OTA.
- Define what happens on interrupted update, low battery, MQTT disconnect, and manual rollback.

## Architecture
- Keep `ota_update` contract unchanged unless Phase 01 found critical mismatch.
- Keep state machine as orchestration owner; keep `util.c` as OTA executor; keep `mqtt_client.c` as transport.
- Minimal firmware status set:
  - assigned
  - downloading
  - verifying
  - installing
  - rebooting
  - confirming
  - success
  - failed
  - rolled_back
- Error taxonomy should be short, deterministic, operator-meaningful:
  - `unsafe_runtime_window`
  - `http_open_failed`
  - `http_status_not_200`
  - `http_read_failed`
  - `sha256_mismatch`
  - `ota_begin_failed`
  - `ota_write_failed`
  - `ota_end_failed`
  - `set_boot_partition_failed`
  - `confirm_failed`
  - `manual_rollback_failed`

## Related code files
- Primary later changes:
  - `.../main/src/command_handler.c`
  - `.../main/src/state_machine.c`
  - `.../main/src/util.c`
  - `.../main/src/mqtt_client.c`
  - `.../main/main.c`
- Likely adjacent later changes:
  - `.../main/src/data_formatter.c` if firmware payload shape needs adjustment
  - header files under `.../main/inc/` if OTA structs/constants evolve
  - `sdkconfig` / `Kconfig.projbuild` only if TLS/OTA/runtime flags truly require it

## Implementation Steps
1. Freeze firmware status payload to exactly match bridge/backend validator.
2. Add explicit error-code mapping inside OTA executor instead of raw generic names where needed.
3. Decide progress publish policy:
   - milestone-only if modem bandwidth/log noise matters
   - chunk-progress only if it materially helps ops
   - prefer milestone + bounded coarse progress, not chatty spam
4. Verify and, if missing, implement confirm timeout enforcement semantics.
5. Ensure interrupted update behavior is explicit:
   - before `esp_ota_set_boot_partition` => fail, stay current image
   - after reboot pending confirm => ESP-IDF rollback path or manual recovery path documented
6. Ensure rollback command behavior is deterministic from current partition topology.
7. Verify sleep gates and unsafe-start gates remain intact after changes.

## Todo list
- [x] Freeze firmware status payload fields
- [x] Add stable error taxonomy
- [x] Verify confirm-timeout semantics
- [x] Verify interrupted-update semantics
- [x] Verify manual rollback semantics

## Success Criteria
- Firmware behavior matches cloud lifecycle names and error codes.
- Device never starts OTA in unsafe runtime window.
- Device confirms valid image after reboot or surfaces explicit failure/rollback path.
- Manual rollback works on real partition layout or is clearly constrained/documented.

## Risk Assessment
- Risk: too much progress publishing floods MQTT/logs.
  - Mitigation: prefer milestone states + bounded progress values already present.
- Risk: rollback logic assumes partition names not present in all builds.
  - Mitigation: verify actual partition table on target build before changing rollback code.

## Security Considerations
- Keep HTTPS-only OTA URLs.
- Keep ESP CRT bundle/TLS validation enabled.
- Never bypass SHA256 validation for convenience.
- Do not persist secrets in RTC context or OTA status payloads.

## Next steps
- Phase 05 runs the real fix/debug loop on UAT/VPS + ESP32 using the dedicated skills.
