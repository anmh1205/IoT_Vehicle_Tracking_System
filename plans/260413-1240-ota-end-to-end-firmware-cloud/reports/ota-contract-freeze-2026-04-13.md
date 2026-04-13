# OTA Contract Freeze (2026-04-13)

## Canonical state set
- `assigned`
- `downloading`
- `verifying`
- `installing`
- `rebooting`
- `confirming`
- `success`
- `failed`
- `rolled_back`
- derived-only: `stuck_timeout` (backend/frontend view, not firmware raw state)

## Ownership by transition
- Backend owns initial `assigned` + command dispatch.
- Firmware owns runtime milestones `downloading` -> `confirming` and terminal `success/failed/rolled_back`.
- MQTT Bridge owns ingestion guards (dedupe/order/sticky terminal) and latest-state persistence.
- Backend/API owns derived reconcile view (`in_progress`, `stuck_timeout`) for operator surface.

## Frozen command payload (`ota_update`)
- required: `jobId`, `version`, `url`, `size`, `sha256`
- optional: `force`, `confirmTimeoutSec`
- URL policy: HTTPS outside `development`.

## Frozen firmware status payload (`v1/{device_id}/firmware`)
- required: `device_id`, `auth_token`, `jobId`, `status`, `targetVersion`, `currentVersion`
- optional: `progress`, `partition`, `error`, `metadata`
- metadata (if present): `schema_version`, `message_id`, `sent_at`, `seq_no`, `boot_id`

## Error taxonomy (short code)
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
- `confirm_timeout_exceeded`
- `manual_rollback_failed`

## UAT/VPS baseline checklist
- `FIRMWARE_PUBLIC_BASE_URL` set and reachable from device network path.
- OTA download returns binary body, `Content-Length`, `Content-Type: application/octet-stream`, no redirect/login HTML.
- Backend + MQTT Bridge + EMQX + PostgreSQL healthy.
- `firmware_update_log` has OTA hardening columns (`last_seq_no`, `last_message_id`, `last_seen_at`, etc.).
- Topic flow verified:
- command out: `v1/{device_id}/commands`
- status in: `v1/{device_id}/firmware`
- Logs visible in backend + bridge + VictoriaLogs.

## Go/No-Go before hardware loop
- GO when:
- one-device deploy can be assigned without duplicate active rows.
- OTA status stream no regression on duplicate/out-of-order messages.
- API/frontend can show raw state + derived summary + stuck reason.
- NO-GO when:
- OTA URL not reachable from device path.
- deploy creates ambiguous concurrent active jobs for same device/version.
- terminal state can be downgraded by late non-terminal payload.

## Unresolved questions
- None.

