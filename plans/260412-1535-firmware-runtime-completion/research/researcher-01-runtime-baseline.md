# Firmware Runtime Baseline

- Time: 2026-04-12 15:35 ICT
- Scope: current code under `iot-vehicle-tracking-system-firmware/main` only.

## Key files
- Boot/runtime init: `main/main.c:45`
- Sleep gate at boot: `main/main.c:41`
- Central config surface: `main/inc/app_config.h:37`
- Config defaults/load: `main/app_config.c`
- Vehicle state model: `main/inc/app_state.h:19`
- Vehicle state logic: `main/app_state.c`
- Power/sleep hooks: `main/power_mgr.c`
- MQTT touchpoints: `main/mqtt_client.c`
- GNSS touchpoints: `main/modem_gnss.c`
- BLE manager touchpoints: `main/ble_mgr.c`
- BLE OBD touchpoints: `main/ble_obd.c`
- Command/OTA/config touchpoints: `main/command_handler.c`

## Baseline summary
- Boot initializes NVS/config early; persisted runtime values already affect startup flow (`main/main.c:45`).
- Sleep is globally disabled at boot for current bring-up flow (`main/main.c:41`). Plan cannot assume runtime sleep works today.
- Config appears centralized around app config headers/source, but timers likely still leak as module-local literals (`main/inc/app_config.h:37`, `main/app_config.c`).
- Driving/alarm/IGN-off behavior is anchored in app state, so runtime completion must sequence state + power, not power alone (`main/inc/app_state.h:19`, `main/app_state.c`).
- MQTT, GNSS, BLE, OTA/config commands all touch runtime transitions; future plan must serialize shutdown/startup across these layers (`main/mqtt_client.c`, `main/modem_gnss.c`, `main/ble_mgr.c`, `main/command_handler.c`).

## Current timing matrix
- Driving-related timing refs:
- No obvious driving timing literal found in quick scan.
- Alarm-related timing refs:
- No obvious alarm timing literal found in quick scan.
- IGN-off timing refs:
- No obvious IGN-off timing literal found in quick scan.
- Sleep timing refs:
- No obvious sleep timing literal found in quick scan.
- MQTT cadence/retry refs:

- GNSS cadence/state refs:

- BLE cadence/state refs:

- OTA/config command refs:

- Read as baseline only: timing authority is not proven centralized yet.

## Critical blockers
- Global sleep hard-disabled at boot (`main/main.c:41`). Any sleep completion plan must first define when that gate becomes policy-driven.
- Config centralization is incomplete until every timing/status gate is mapped back to app config/NVS (`main/inc/app_config.h:37`, `main/app_config.c`, `main/main.c:45`).
- State transitions are likely split across app_state + transport/power modules; editing one layer first will create partial behavior (`main/inc/app_state.h:19`, `main/app_state.c`, `main/power_mgr.c`).
- BLE OBD, GNSS, MQTT, OTA/config commands share the same lifecycle window. Wrong order can lose telemetry, break OTA, or sleep while work is active (`main/ble_obd.c`, `main/modem_gnss.c`, `main/mqtt_client.c`, `main/command_handler.c`).

## Recommended implementation order constraints
- 1. Freeze source of truth first: enumerate every runtime timer/status flag exposed by app config and persisted through boot (`main/inc/app_config.h:37`, `main/app_config.c`, `main/main.c:45`).
- 2. Normalize vehicle state transitions second: define exact semantics for driving, alarm, IGN-off, idle, sleep-entry in app state before transport edits (`main/inc/app_state.h:19`, `main/app_state.c`).
- 3. Then sequence runtime teardown/bring-up: BLE/OBD stop or quiesce -> GNSS snapshot/stop -> MQTT flush/disconnect -> power sleep entry (`main/ble_mgr.c`, `main/ble_obd.c`, `main/modem_gnss.c`, `main/mqtt_client.c`, `main/power_mgr.c`).
- 4. OTA/config commands must pre-empt sleep and IGN-off teardown. Audit both MQTT-triggered and direct command paths before enabling sleep (`main/mqtt_client.c`, `main/command_handler.c`).
- 5. Re-enable sleep gate last, with explicit reject reasons/logging so field validation can distinguish policy reject vs hardware failure (`main/main.c:41`, `main/power_mgr.c`).

## Unresolved questions
- Which exact timing knobs are product requirements vs leftover literals? Scan shows mixed config + module-local timing references.
- Is target behavior deep sleep, light sleep, modem suspend, or staged fallback? Current boot gate implies unfinished hardware/runtime path.
- During IGN-off, should BLE remain alive for diagnostics/user access, or shut down immediately for power save?
- OTA trigger source of truth unclear from surface scan alone: MQTT only, command handler only, or both?
