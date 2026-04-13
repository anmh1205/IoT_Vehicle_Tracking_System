# Phase 05 — Run UAT/VPS and ESP32 debug loops

## Context links
- Parent plan: `./plan.md`
- Depends on: `./phase-04-harden-firmware-ota-runtime-and-confirm-rollback.md`
- Skills to use during implementation: `esp32-loop-coding`, `vps-control`
- Runtime paths: backend, bridge, EMQX, DB/logs/metrics services on UAT/VPS

## Overview
- Date: 2026-04-13
- Description: Execute the real OTA loop on hardware and VPS, debug truthfully, and converge until stable.
- Priority: P1
- Implementation status: in_progress
- Review status: pending

## Key Insights
- This is where fake confidence dies. Browser success is irrelevant; device-path success matters.
- Use `vps-control` to prove runtime health and artifact reachability. Use `esp32-loop-coding` to prove firmware behavior from serial logs and real MQTT effects.
- Keep loops narrow. One boundary per loop. No random multi-service restart.

## Requirements
- Validate full OTA path on real ESP32 + serial against UAT/VPS.
- Produce reproducible loop steps for each class of failure.
- Capture enough evidence per loop: serial log, MQTT firmware topic, bridge/backend logs, DB row state, artifact fetch proof.
- Stop only when happy path and failure paths are explained.

## Architecture
- Two-loop execution model:
  1. VPS loop with `vps-control`: host, TLS, service runtime, networking, DB/MQTT/log observability.
  2. Device loop with `esp32-loop-coding`: flash/build/run, serial capture, command publish, reboot/confirm/rollback validation.
- Each loop iteration should answer one question and either fix one layer or rule it out.

## Related code files
- Firmware candidates later:
  - `.../main/src/command_handler.c`
  - `.../main/src/state_machine.c`
  - `.../main/src/util.c`
  - `.../main/src/mqtt_client.c`
  - `.../main/main.c`
- Cloud candidates later:
  - backend firmware route/controller/service files
  - MQTT bridge firmware handler/validators
  - frontend firmware page/api client if operator surface misreads state
- Runtime files likely touched later:
  - service env files / compose files / reverse proxy configs / CI-CD deploy scripts only if proven necessary

## Implementation Steps
1. Pre-loop VPS verification with `vps-control`:
   - confirm artifact file exists in storage path
   - curl exact OTA URL from VPS and from external path if possible
   - inspect TLS chain, SNI, 200 response, `Content-Length`, `Content-Type`
   - check backend, bridge, EMQX, DB containers/services are healthy
   - tail backend + bridge logs during one deploy attempt
   - inspect DB rows for firmware/deployment/job state
   - inspect broker connectivity and command/status topic flow
   - inspect VictoriaLogs/Grafana or raw logs for OTA events
2. Pre-loop device verification with `esp32-loop-coding`:
   - ensure correct build/profile and device serial port
   - capture baseline boot logs, running partition, current version
   - confirm MQTT connect and command subscription
3. Happy-path loop:
   - upload known-good binary
   - deploy to single device
   - watch command ingress on serial
   - watch download/verify/install/reboot/confirm on serial
   - watch firmware topic and bridge/backend state changes
4. Failure-isolation loops with `esp32-loop-coding`:
   - low battery: force/arrange threshold failure and confirm blocked start
   - MQTT disconnect: break command/status path and verify safe behavior
   - bad sha256: force mismatch and verify `failed` reason
   - bad url / non-200 / HTML redirect: verify deterministic failure reason
   - interrupted update: power/network cut during download/apply and verify recovery semantics
   - reboot confirm: cut power before confirm and verify post-boot behavior / rollback
   - manual rollback: trigger rollback command and verify partition/result
5. Failure-isolation loops with `vps-control`:
   - artifact hosting path broken
   - TLS/SNI mismatch
   - backend/bridge runtime crash or env misconfig
   - DB row not updating
   - MQTT broker/network ACL issue
   - stuck deployment due to no terminal event
6. After each loop, patch only the failing boundary, rerun same loop, then rerun happy path.

## Todo list
- [x] Pre-loop firmware build + flash smoke on ESP32 COM6
- [x] Prove VPS artifact hosting and TLS from device-safe path
- [ ] Prove single-device happy path OTA
- [ ] Run targeted negative loops
- [ ] Capture evidence across serial, MQTT, DB, logs
- [ ] Re-run happy path after every fix cluster

## Success Criteria
- Happy path passes on real device and UAT/VPS.
- Each failure class maps to deterministic operator-visible result.
- No unexplained stuck deployment remains.
- Fix loops are reproducible by another engineer.

## Execution note (current workspace)
- Real `vps-control` loop executed on UAT (`103.47.227.216`):
  - services healthy after backend/bridge image refresh
  - OTA hardening migration applied (`13-ota-hardening.sql`)
  - artifact hosting fixed (storage permission + public HTTPS URL)
  - EMQX trace proved backend publishes to `v1/TRACKER_001/commands`
- Real `esp32-loop-coding` loop executed continuously on `COM6` with iterative flash/retest.
- Firmware loop patches added and flashed:
  - force `command_subscribe_enabled=true` in field-validation runtime
  - disable BLE connect loop in field-validation mode to reduce OTA-path starvation
  - process OTA/reboot command also in `APP_STATE_CHECK_IGN` (ignition-off path)
  - preserve UART pending URC dispatch in `modem_at_send` instead of raw flush
  - add command ingress log (`Command received: ...`) for proof
- Current blocker remains hard: device repeatedly resets by watchdog before stable OTA lifecycle.
  - serial shows repeated `rst:0x7 (TG0WDT_SYS_RST)` and reboot loops
  - deployment rows for firmware `r3` stay at `assigned`/`stuck_timeout` with no OTA progress events
- Phase remains open until watchdog root cause is closed and one full OTA lifecycle is captured.

## Risk Assessment
- Risk: broad service restarts hide true boundary.
  - Mitigation: use targeted `vps-control` checks/restarts only.
- Risk: serial-only debugging misses cloud truth.
  - Mitigation: every loop requires serial + MQTT + DB/log correlation.

## Security Considerations
- Never expose admin creds in debug artifacts.
- Keep TLS validation on; do not “fix” reachability by downgrading to HTTP.
- Restrict VPS commands to least necessary scope.

## Next steps
- Phase 06 converts loop results into final test evidence, doc updates, and release gate.

## Unresolved questions
- What exact code path causes `TG0WDT_SYS_RST` during modem bring-up on current field-validation build?
- Why does command ingress still not appear in serial (`Command received`) despite broker-side command publish confirmation?
- Should we temporarily gate OTA validation on ignition-off path only (current test mode) or force ignition-on hardware state for final acceptance run?
