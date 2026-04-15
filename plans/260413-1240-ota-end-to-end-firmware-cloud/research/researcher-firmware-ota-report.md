# Firmware OTA audit report

Conducted: 2026-04-13 12:40 ICT
Scope: audit current ESP32 firmware OTA command path only; no implementation.

## Current state

- OTA command entrypoint exists in `command_handler.c`. It parses `ota_update`, validates required fields (`jobId`, `version`, `url`, `size`, `sha256`), enforces HTTPS URL, stores a pending `ota_command_t`, and exposes it as `COMMAND_ACTION_OTA_UPDATE` for state machine consumption. `manual_rollback` / `ota_rollback` also exist as synthetic rollback actions. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/command_handler.c:93-148`, `:293-307`, `:351-362`
- MQTT command transport already routes cloud commands from `v1/{device_id}/commands` into the command callback. Firmware status topic `v1/{device_id}/firmware` also already exists. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/mqtt_client.c:491-499`, `:551-554`, `:1300-1327`
- State machine already consumes OTA actions in driving/alarm/heartbeat loops, so OTA orchestration is wired into the runtime loop. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c:1414-1418`, `:1451-1455`, `:1488-1495`
- Boot path already has OTA-aware diagnostics and post-reboot confirmation flow. `main.c` compares running vs boot partition; `state_machine.c` confirms pending OTA images via `esp_ota_mark_app_valid_cancel_rollback()`. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/main.c:95-107`, `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c:1080-1125`

## Key files

- Parser / command staging
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/command_handler.c`
- OTA action execution + sleep / confirm coordination
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- MQTT command ingress + firmware topic egress
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/mqtt_client.c`
- Boot-level OTA diagnostics
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/main.c`

## Confirmed gaps

### 1) Parser / queue / state machine location
- Parser is in `command_handler_process()` and `command_parse_ota_update()`. It is a single in-memory slot, not a durable queue. New command overwrites previous `s_ota_command`; consume clears it. No multi-job queue, no dedupe, no persistence across reboot before apply. `command_handler.c:28-29`, `:100-147`, `:293-307`, `:351-362`
- There is an offline queue in runtime, but reviewed path shows it is used for publishing outbound raw/status/event/firmware records, not for inbound OTA job staging. `state_machine.c:740-746`, `:783-789`, `:825-831`, `:871-877`
- State machine executor is `state_machine_process_ota_command()`. It publishes `assigned`, checks runtime safety, calls `util_ota_apply_update()`, stores RTC confirm context, reboots on success; rollback calls `util_ota_trigger_manual_rollback()`. `state_machine.c:1132-1204`

### 2) Real download / apply / confirm / rollback / progress
- Confirm after reboot: yes, explicitly implemented in reviewed code with `esp_ota_mark_app_valid_cancel_rollback()` and firmware status publish `confirming -> success/failed`. `state_machine.c:1096-1124`
- Manual rollback trigger: likely yes at orchestration level, but real rollback implementation is delegated to `util_ota_trigger_manual_rollback()`; not verified in this audit because implementation file not reviewed. `state_machine.c:1142-1160`
- Download + apply: not verified in reviewed files. Runtime delegates to `util_ota_apply_update(&s_config, s_current_version, &cmd, &report)`, so actual HTTP/TLS download, SHA256 verification, partition write, boot partition switch are outside files reviewed here. `state_machine.c:1182-1199`
- Progress reporting: only payload publish plumbing is confirmed. State machine can publish firmware payload/status with `progress` field, but reviewed code does not show incremental progress loop; only milestone states like `assigned`, `confirming`, `success`, `failed` are explicit here. `state_machine.c:839-917`, `:1100-1124`, `:1170-1179`
- Rollback timeout enforcement: command parser stores `confirm_timeout_sec`, RTC context stores it, but reviewed code does not show timer-based auto-rollback decision. `command_handler.c:134-140`, `state_machine.c:1195-1197`

### 3) Preconditions / safety gates already present
- OTA command schema gate: required strings/numbers, positive size, 64-char hex SHA256, HTTPS-only URL. `command_handler.c:105-123`
- Runtime safety gate before start: MQTT must be connected; battery reading must exist; battery must exceed `ota_min_battery_mv`. `state_machine.c:292-313`
- Sleep gate during OTA / pending confirm: device refuses deep sleep while OTA in progress or pending confirm. `state_machine.c:315-347`
- Post-success confirm gate: new image must explicitly mark valid after reboot. `state_machine.c:1088-1124`
- Configurable minimum OTA battery threshold exists and is persisted via `update_config`. `command_handler.c:41-42`, `:224-229`

## Proposed validation loop

Use `esp32-loop-coding` later for a real device + serial loop. Keep loop minimal, production-like, repeatable.

1. Baseline boot
- Capture serial boot logs, partition info, firmware topic payloads.
- Verify initial firmware status publish on boot. `state_machine.c:1326-1329`

2. Command ingress test
- Publish valid `ota_update` to `v1/{device_id}/commands`.
- Verify MQTT RX callback reaches parser and action is consumed in runtime loop. `mqtt_client.c:551-554`, `state_machine.c:1414-1418`
- Negative tests: bad SHA256, non-HTTPS URL, missing fields.

3. Safe-start gates
- Run with MQTT disconnected; expect `unsafe_runtime_window` failure.
- Run with low/invalid battery reading; expect start blocked. `state_machine.c:1172-1179`, `:292-313`

4. Real OTA apply loop
- Serve signed test binary over HTTPS.
- Watch serial for download/apply logs from `util_ota_apply_update` implementation.
- Verify firmware topic emits at least assigned/result; if no intermediate progress appears, gap confirmed.

5. Reboot / confirm loop
- After successful apply, device should reboot, publish `confirming`, then `success`, and clear pending confirm. `state_machine.c:1100-1117`
- Power-cut test between apply and confirm to verify ESP-IDF rollback behavior on next boot.

6. Manual rollback loop
- Trigger `manual_rollback` / `ota_rollback` via command topic.
- Verify reboot into previous partition and firmware topic result. `command_handler.c:301-307`, `state_machine.c:1142-1153`

7. Sleep interaction loop
- While OTA in progress or pending confirm, verify device does not enter deep sleep. `state_machine.c:323-335`

## Unresolved questions

- `util_ota_apply_update()` implementation is not reviewed yet: does it do real HTTPS download, cert validation, SHA256 verification, chunked progress callback, partition switch, and robust error mapping?
- `util_ota_trigger_manual_rollback()` implementation is not reviewed yet: does it use ESP-IDF rollback APIs correctly for current partition table?
- Is `confirm_timeout_sec` actually enforced anywhere, or only stored in RTC context?
- Are firmware-topic states aligned with cloud-side OTA orchestration contract, especially intermediate progress and terminal error taxonomy?
