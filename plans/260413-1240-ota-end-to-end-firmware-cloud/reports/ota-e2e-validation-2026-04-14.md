# OTA E2E Validation Report - 2026-04-14

## Scope
- Validate OTA end-to-end on real ESP32 (`COM6`) + UAT VPS (`103.47.227.216`) using `esp32-loop-coding` and `vps-control`.
- Close blockers that kept deployments stuck at `assigned`.

## Fixes applied
- MQTT Bridge (`Tracking_MqttBridge/src/handlers/firmware.handler.ts`)
  - Added SQL casts to avoid Postgres type inference failures:
    - `status = $2::firmware_status_enum`
    - `last_seq_no` uses `$11::BIGINT`
  - Added boot-aware sequence reconcile:
    - accept sequence reset when `boot_id` changes (`boot_seq_reset`) so post-reboot `success` is not dropped.
- Firmware (`main/src/state_machine.c`)
  - Firmware status publish now attempts live MQTT publish whenever connected, including while OTA is in progress.
  - This prevents terminal failure statuses from being delayed behind offline queue backlog.
- Backend (`Tracking_Backend/src/api/controllers/firmware.controller.ts`)
  - Upload stores unique storage filename (`file.filename`) instead of original upload name to prevent `firmware_filename_key` collisions.

## Runtime hotpatches deployed on VPS
- `tracking-mqtt-bridge` container patched with rebuilt `dist/handlers/firmware.handler.js`.
- `tracking-backend` container patched with rebuilt `dist/api/controllers/firmware.controller.js`.
- Services restarted and verified through logs/API queries.

## Evidence - successful OTA jobs
- `ota_1776123842520_705790df` -> `success`
- `ota_1776124442519_91cd77df` -> `success`
- `ota_1776125752932_b763cfce` -> `success`

Serial evidence:
- `iot-vehicle-tracking-system-firmware/documents/test-logs/com6-ota-e2e-loop24.log`
- `iot-vehicle-tracking-system-firmware/documents/test-logs/com6-ota-e2e-loop25.log`
- `iot-vehicle-tracking-system-firmware/documents/test-logs/com6-ota-e2e-loop28-postfix-success.log`

Cloud evidence:
- Bridge logs show full lifecycle updates and terminal `Firmware success`.
- Backend API `/api/v1/firmware/{id}/deployments` returns terminal `success`.
- Postgres `firmware_update_log` rows reached terminal `success` with consistent `job_id`.

## Evidence - controlled failure case
- Test case: intentionally bad SHA256 firmware (`ota-20260414-badsha2-1776125474`)
- Job: `ota_1776125475081_7fe1e0cf`
- Result: terminal `failed`, `error_message=status_reason_code=sha256_mismatch`

Serial evidence:
- `iot-vehicle-tracking-system-firmware/documents/test-logs/com6-ota-e2e-loop27-badsha2.log`

Cloud evidence:
- Bridge log includes `Firmware failed ... error=sha256_mismatch`.
- Backend/API and DB row (`id=29`) both show terminal `failed`.

## Current assessment
- OTA happy path is stable on repeated runs.
- Critical failure path (`sha256_mismatch`) is now deterministic and visible at cloud level.
- Previous blockers (`assigned` stuck due SQL typing + seq reset + queue delay) are closed.
- Historical rows from pre-fix runs can still remain `assigned` (`id=25`, `id=28`); they were produced before the final fixes and are not representative of current runtime behavior.

## Unresolved questions
- Should release sign-off require running remaining failure matrix cases (forced network cut, TLS failure URL, manual rollback) in this sprint, or is current success + bad-sha validation sufficient for UAT gate?
