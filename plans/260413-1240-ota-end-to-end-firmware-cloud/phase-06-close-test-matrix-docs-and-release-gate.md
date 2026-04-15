# Phase 06 — Close test matrix, docs, and release gate

## Context links
- Parent plan: `./plan.md`
- Depends on: `./phase-05-run-uAT-vps-and-esp32-debug-loops.md`
- Docs to update after implementation:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/development-roadmap.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-changelog.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/codebase-summary.md`

## Overview
- Date: 2026-04-13
- Description: Convert hardening and loop results into a production-like validation package and documentation truth.
- Priority: P2
- Implementation status: in_progress
- Review status: pending

## Key Insights
- “Works once” is not done.
- Production-like means repeatable happy path plus understood failures, not just a demo video.
- Docs must reflect actual implemented behavior, not intent.

## Requirements
- Execute and record final OTA matrix.
- Define release gate for UAT acceptance.
- Update mandatory project docs after implementation truth is known.
- Keep docs concise and aligned with runtime/code.

## Architecture
- Final validation package should tie one deployment job to:
  - artifact metadata
  - device target
  - serial evidence
  - MQTT/bridge/backend state timeline
  - final DB row state
- Documentation should capture architecture and ops flow, not step-by-step debug noise.

## Related code files
- Possibly touched after implementation truth:
  - frontend firmware page/api client if wording/status grouping changes
  - backend/bridge files if final schema naming shifts
- Mandatory docs later:
  - `.../docs/development-roadmap.md`
  - `.../docs/project-changelog.md`
  - `.../docs/system-architecture.md`
  - `.../docs/codebase-summary.md`

## Implementation Steps
1. Run final production-like matrix:
   - happy path OTA
   - low battery blocked start
   - MQTT disconnect before/after assignment
   - bad sha256
   - bad url / TLS / non-200
   - reboot confirm success path
   - manual rollback
   - interrupted update
   - duplicate progress
   - out-of-order progress
   - stuck deployment timeout/reconcile
2. For each case record expected owner and expected operator-visible outcome.
3. Define release gate:
   - backend quality gates pass
   - bridge quality gates pass
   - firmware build compiles for target profile
   - UAT end-to-end happy path passes on real device
   - critical failure cases produce deterministic terminal/stuck outcomes
4. Update docs:
   - roadmap: OTA progress/status
   - changelog: what changed and why
   - system architecture: canonical OTA flow, ownership, runtime dependencies
   - codebase summary: affected modules and new responsibilities
5. Prepare short operator runbook for deploy/rollback/stuck triage if implementation introduces non-obvious ops steps.

## Todo list
- [x] Capture ESP32 local build/flash smoke evidence for release-gate traceability
- [ ] Run full OTA matrix
- [x] Record expected outcomes and evidence
- [x] Freeze UAT release gate
- [x] Update required docs
- [ ] Add short operator triage guidance if needed

## Success Criteria
- OTA feature is validated beyond happy path.
- Required docs reflect actual end-to-end OTA architecture and operations.
- Another engineer can deploy, diagnose, and rollback on UAT using project docs and runtime signals.

## Execution note (current workspace)
- Required docs were updated to reflect code truth for OTA hardening phases 01-04.
- ESP32 local evidence now includes:
  - ESP-IDF export path validated (`C:\Espressif\esp-idf-v5.5.3`)
  - `idf.py build` success
  - repeated `idf.py -p COM6 build flash` success after OTA runtime loop patches
  - serial logs captured in:
    - `documents/test-logs/com6-ota-e2e-loop24.log`
    - `documents/test-logs/com6-ota-e2e-loop25.log`
    - `documents/test-logs/com6-ota-e2e-loop27-badsha2.log`
    - `documents/test-logs/com6-ota-e2e-loop28-postfix-success.log`
- UAT VPS loop now has verified terminal outcomes end-to-end:
  - Success: `ota_1776123842520_705790df`, `ota_1776124442519_91cd77df`, `ota_1776125752932_b763cfce`
  - Failure: `ota_1776125475081_7fe1e0cf` (`sha256_mismatch`)
- Cloud/runtime fixes validated live:
  - MQTT Bridge reconcile handles boot-based sequence reset and no longer drops post-reboot `success`.
  - MQTT Bridge SQL parameter typing fixed; no more `$2/$11` type deduction errors.
  - Backend firmware upload no longer fails on duplicate original filename (`firmware_filename_key`).
  - Firmware failure status is now immediately visible to cloud during OTA (live publish path when MQTT connected).

## Risk Assessment
- Risk: docs drift from code after late fixes.
  - Mitigation: update docs only after final rerun on real device.
- Risk: too many test cases for current maturity.
  - Mitigation: keep matrix focused on real failure classes listed above.

## Security Considerations
- Sanitize logs/screenshots before documentation if secrets appear.
- Do not publish internal hostnames, credentials, or raw tokens in docs.
- Keep OTA rollback/runbook scoped to authorized operators.

## Next steps
- After implementation and validation, ask for review/approval before wider rollout beyond UAT.

## Unresolved questions
- Should full UAT sign-off require executing all remaining matrix cases (manual rollback, forced network cut, TLS URL failure), or are current success+critical-failure proofs enough for release candidate?
