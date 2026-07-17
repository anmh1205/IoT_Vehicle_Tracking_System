# Planner Synthesis Report — Firmware Log Monitor Governance

**Date:** 2026-05-01  
**Branch:** `uat`  
**Scope:** ESP32-S3 firmware logging/monitoring governance. Markdown plan only. No production code edits.

## Inputs used

- README context: IoT vehicle tracking monorepo; firmware publishes telemetry/events/status/firmware via MQTT.
- Docs:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/codebase-summary.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-overview-pdr.md`
- Research:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/research/researcher-01-firmware-logging-best-practices.md`
- Audit:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/scout/scout-01-firmware-log-audit.md`

## Core decision

Use small governance, not logging framework.

- Keep ESP-IDF `ESP_LOG*` and module tags.
- Add policy: transitions/faults/retries/snapshots, not loop chatter.
- Add source-side rate limiting/dedup only where repeated in 3+ modules.
- Extend existing `telemetry_counters` before creating new metric subsystem.
- Add OTA/MQTT/queue/LTE/OBD observability where gaps exist.

## Tradeoffs

### Helper vs local gating

- User validation chose local per-module gates for first pass.
- Local gating: fewer files, easier per-module tuning, but duplicates small logic in LTE/queue/MQTT/OBD.
- Shared helper is deferred unless code review finds harmful duplication.
- Implementation should not create `log_rate_gate` now.

### Demote per-publish metadata

- Benefit: large INFO noise reduction for rawdata/status paths.
- Cost: less success-path trace detail.
- Mitigation: keep `seq/mid/topic_class` on WARN failures and aggregate success counters in health snapshot.

### Snapshot logs

- User validation chose 1-5m diagnostic cadence.
- Benefit: denser lab/field diagnosis without per-event flood.
- Cost: more INFO lines than default production best practice.
- Mitigation: enable through diagnostic/profile/config and still emit boundary snapshots before deep sleep/recovery.

## High-value module plan

1. `state_machine_core.c`
   - Add transition reason/dwell logs.
   - Keep GNSS failure categories separate.
   - Emit health snapshot at safe app-core point.
2. `modem_lte_fsm.c` / `modem_lte_recovery.c`
   - Rate-limit waiting/retry logs.
   - Add recovery lifecycle and counters.
3. `offline_queue.c`
   - Keep per-record detail behind diag/DEBUG.
   - Add depth/replay/quota summaries.
4. `state_publish_pipeline.c` / `mqtt_publish.c`
   - Count successes/failures/fallbacks.
   - Attribute failures by topic/stage, no payload.
5. `ble_obd.c`
   - Summarize quality; rate-limit invalid/timeout bursts.
6. `util_ota_http.c`
   - Add OTA HTTP stage/status/reason logs, redact URLs/tokens.

## Security posture

- UART logs are leakable.
- Forbidden by default: auth token, MQTT credentials, OTA signed URL/query, raw payload, raw OBD frame, full coordinates, IMEI/IMSI.
- Prefer `fix_valid`, `fix_age_ms`, counts, reason codes, `esp_err_to_name()`.

## Validation plan

Commands to run after implementation, not now:

- `cd E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware && idf.py reconfigure`
- `cd E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware && idf.py build`
- `cd E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware && idf.py size`

Runtime checklist:

- Normal boot/drive: transition logs visible, no heartbeat spam.
- MQTT connected: publish success mostly counted, not INFO flood.
- LTE/MQTT loss: recovery and fallback visible with suppression.
- Offline replay: queue health visible without per-record release chatter.
- OBD noisy adapter: rate-limited warnings + snapshot counters.
- OTA failure: stage/status/reason visible, URL/token redacted.

## Risks

- Hardware scenarios may be hard to validate without bench device.
- Existing files may already exceed 200 lines; avoid broad modularization unless touched logic grows materially.
- Counter concurrency unknown; verify call sites before assuming single-writer.
- Production UART verbosity needs product decision.

## Plan files created

- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/plan.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/phase-01-log-policy-tag-taxonomy-and-budget.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/phase-02-minimal-log-helper-rate-limit-and-health-snapshot.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/phase-03-apply-governance-to-firmware-hotspots.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/phase-04-validation-and-documentation-handoff.md`

## Unresolved questions

- Target log budget during LTE recovery and offline replay under Broader INFO?
- Which config/profile enables 1-5m diagnostic health snapshot?
- Should `CONFIG_TRACKER_SD_DIAG_ENABLE` remain off by default in release builds?
