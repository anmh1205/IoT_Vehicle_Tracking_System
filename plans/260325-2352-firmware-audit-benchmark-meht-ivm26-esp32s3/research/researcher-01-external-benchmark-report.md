# External Benchmark Report: MEHT-IVM26-ESP32S3

## Scope
- Benchmark repo: https://github.com/ME-HIGH-TECH-SOLUTIONS/MEHT-IVM26-ESP32S3
- Focus: ESP32 architecture, telemetry pipeline, connectivity, reliability patterns, OBD2 presence/absence, audit-worthy controls.
- Method: repo root README + key source headers/implementation snippets from GitHub tree.

## Findings
- Product is an ESP32-S3 industrial vibration monitor, not a vehicle tracker. Core I/O is sensor telemetry via Modbus RTU, AC detect, 4G LTE upload, SD offline buffer, 7-seg local display.
- System topology is clear: sensors/storage/network feed a finite-state-machine manager, which coordinates IoT task, display, and HW drivers.
- Connectivity stack centers on SIMCom modem over PPP/ESP modem APIs, Wi-Fi AP captive portal for configuration, and HTTPS OTA for firmware updates.
- Reliability patterns present: FSM states for BOOT/IDLE/MONITORING/OFFLINE/FLUSH/SHUTDOWN/CONFIG, offline storage, reconnect handling, conditional logging, state separation, and background tasks.
- OBD2 integration: no explicit OBD2 interfaces, CAN/UART OBD parsing, or vehicle diagnostic pipeline found in surfaced files. Evidence points to industrial vibration domain instead.

## Interface/Contract inventory
- `esp_err_t update_vibration_threshold(float threshold)` in `main/main.c`: validates range, persists runtime threshold state.
- `simcom_modem_ctx_t`, `simcom_modem_info_t`, `simcom_info_update_cb_t`, `simcom_init_cb_t` in `main/simcom_modem/simcom.h`: modem lifecycle and telemetry contracts.
- `esp_err_t simcom_gpio_init(void)` and reconnect/async init patterns in `main/simcom_modem/simcom.c`: modem bring-up and recovery contract.
- Wi-Fi AP / captive portal state contract in `main/config_portal/wifi_ap.c`: explicit AP + DNS server runtime state.
- OTA update contract in `main/https_comm/iot_https_ota.c`: HTTPS transport + cert bundle + partition validation.
- FSM contract in `main/state_machine/readme.md`: state transitions and trigger conditions.

## Strengths
- Modular layout: modem, portal, OTA, sensors, FSM, storage separated by concern.
- Audit-friendly state model: explicit FSM with offline/flush/shutdown handling.
- Resilience features: offline buffering, reconnect interval tracking, async init callback, conditional logging toggles.
- Secure-ish transport direction: HTTPS OTA with CRT bundle indicates TLS verification intent.
- Config portal exists for field setup; reduces hardcoded config drift.

## Risks
- No surfaced evidence of bounded queues, backpressure, or retry budgets on telemetry path.
- Global mutable state in multiple modules increases coupling and race risk.
- `simcom.h` includes duplicated/overlapping modem context concepts; interface clarity may drift.
- Captive portal/DNS server may widen attack surface if not tightly gated.
- OTA and modem init appear operationally coupled but contract boundaries are not obvious from snippets.
- No OBD2 contract means repo is a weak benchmark for vehicle diagnostic ingestion.

## Audit signals
- Positive: explicit init/status structs, callback-based events, FSM documentation, storage/offline mode, reconnect config, HTTPS OTA.
- Negative: sparse evidence of authentication/authorization around config portal, no visible telemetry schema/versioning contract, no checksum/signature contract surfaced for local data, no bounded error policy seen.
- Control gap to verify in full repo: firmware update authenticity, AP portal access control, persistence integrity, watchdog/reset strategy, modem disconnect semantics.

## Citations
- https://github.com/ME-HIGH-TECH-SOLUTIONS/MEHT-IVM26-ESP32S3
- `readme.md`
- `main/main.c`
- `main/simcom_modem/simcom.h`
- `main/simcom_modem/simcom.c`
- `main/config_portal/wifi_ap.c`
- `main/https_comm/iot_https_ota.c`
- `main/state_machine/readme.md`

## Unresolved questions
- Is there any hidden OBD2/CAN support outside surfaced files?
- What are the exact telemetry payload schemas and retry/backoff rules?
- Is config portal access protected beyond open AP/DNS captive behavior?
- Are OTA images authenticated beyond TLS transport?
- How is offline storage integrity validated before flush/upload?
