# Local firmware baseline report

## Scope
- Baseline only; no implementation changes.
- Focus: ESP32/NimBLE BLE OBD2 path, service discovery, command/response flow, retry/timeout behavior, and audit signals.
- Evidence read from example firmware under `resources/references/example/esp32-obd2-meter/`.

## Findings
- Firmware is a BLE OBD2 meter for ESP32-S3, built on NimBLE + LVGL. README states it targets an OBD2 BLE adapter and uses `idf build` / `check.sh` workflow.
- Core BLE layer is split into `ble_init`, `ble_mgr`, and `ble_obd`.
- `ble_init_stack()` starts NimBLE, installs sync/reset callbacks, and launches a dedicated NimBLE host task.
- `ble_mgr` owns a singleton manager context, scan/connect lifecycle, GATT discovery, notification dispatch, and send serialization via FreeRTOS queue + mutex.
- `ble_obd` wraps the manager for OBD service connection and request/response handling using a second mutex + binary semaphore.
- Current code shows active debugging/logging and several FIXME-like markers, suggesting immature reliability handling.

## Interface/Contract inventory
- `ble_init.h` / `ble_init_stack(ble_init_config_t const *config)`:
  - contract: caller supplies reset/sync callbacks; task-based host startup.
- `ble_mgr.h`:
  - status enum: `BLE_MGR_E_OK`, `NULL`, `TIMEOUT`, `NOT_CONNECTED`, `DISCOVERY_FAILED`, `GATT_SEND_FAILED`, `API_LOCK_ERROR`.
  - discovery config: service UUID, device filter callback, disconnected callback.
  - send/connect APIs: `ble_mgr_init()`, `ble_mgr_connect_service()`, `ble_mgr_send()`, `ble_mgr_is_connected()`.
- `ble_obd.h`:
  - `ble_obd_connect()`, `ble_obd_rxtx()`, `ble_obd_is_connected()`.
  - response callback contract: `pid`, raw payload, len, user context.
- Service contract in `ble_obd.c`:
  - service UUID `0x18f0`, TX char `0x2af1`, RX char `0x2af0`.
  - OBD request format is ASCII hex `MMPP\r`; responses expected as echoed ASCII or space-separated hex bytes.

## Strengths
- Clear separation: stack init, BLE manager, OBD protocol wrapper.
- Explicit status codes and null checks throughout public APIs.
- Discovery + send paths are serialized with FreeRTOS primitives, reducing concurrent access hazards.
- Notification subscription is automatic after characteristic discovery.
- Timeout-based connect/send flow makes deadlock easier to audit.

## Risks
- Singleton/global manager state (`BLE_MGR_CTX`) limits multi-connection or reentrant use.
- `ble_obd_process_obd_data()` mutates incoming buffer and uses loose parsing; malformed payloads can degrade reliability.
- `ble_obd_notify_cb()` has echo handling and prompt detection that appear brittle; one duplicated compare suggests copy/paste debt.
- `ble_mgr_gap_connected_cb()` / discovery completion logic is complex and marked by a FIXME; connection success signaling may be fragile.
- CCCD enable assumes `val_handle + 1`; that is common but not guaranteed.
- Disconnect recovery restarts discovery, but reset handling is explicitly unimplemented.
- No visible persistence/SD-card/modem/GNSS logic in this baseline set; those subsystems are either elsewhere or absent from this example.

## Audit signals
- Strong signal: use of mutex + queue + semaphore around BLE APIs.
- Strong signal: dedicated task and explicit callbacks for stack sync/reset.
- Weak signal: FIXME comments, warning logs, and debug prints in core lifecycle paths.
- Weak signal: manual UUID/ASCII parsing instead of structured decode helpers.
- Weak signal: no obvious backoff, exponential retry, or watchdog hooks in the shown BLE layer.
- Weak signal: lack of visible integration points for SD logging, modem uplink, and GNSS fusion in the example baseline.

## Citations (file paths)
- `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/references/example/esp32-obd2-meter/README.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/references/example/esp32-obd2-meter/main/inc/ble_mgr.h`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/references/example/esp32-obd2-meter/main/inc/ble_obd.h`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/references/example/esp32-obd2-meter/main/src/ble_init.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/references/example/esp32-obd2-meter/main/src/ble_mgr.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/references/example/esp32-obd2-meter/main/src/ble_obd.c`

## Unresolved questions
- Where are SD-card storage, modem uplink, and GNSS ingestion implemented in the current repo?
- Is the example firmware the actual production baseline, or only a reference snapshot?
- Are there separate modules for power management, reconnect policy, and telemetry batching outside the files inspected here?
- Is the intended OBD adapter strictly BLE/NimBLE, or does the repo also support classic Bluetooth / alternate transports?
