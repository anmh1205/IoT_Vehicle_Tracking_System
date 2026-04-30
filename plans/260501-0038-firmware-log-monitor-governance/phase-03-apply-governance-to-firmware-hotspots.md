# Phase 03 — Apply governance to firmware hotspots

## Context links

- Phase 01 policy: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/phase-01-log-policy-tag-taxonomy-and-budget.md`
- Phase 02 helper/snapshot: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/phase-02-minimal-log-helper-rate-limit-and-health-snapshot.md`
- Audit: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/scout/scout-01-firmware-log-audit.md`

## Overview

- Priority: P2
- Status: Pending
- Goal: add/fix logs in the highest-value modules first, then audit the whole firmware for standard compliance, reduce spam, keep operational visibility.

## Key Insights

- Top hotspots: state machine, LTE FSM, offline queue, publish pipeline, BLE OBD.
- Top gaps: OTA HTTP lifecycle, MQTT outcome attribution, offline queue health, recovery metrics, state transition reasons.
- Publish pipeline currently logs per message metadata at INFO; rawdata frequency makes this noisy.
- OTA HTTP currently lacks enough logs for field failure diagnosis.
- Validation chose Broader INFO, so keep useful lifecycle/success context visible while locally gating repeated paths.
- <!-- Updated: Validation Session 1 - Broader INFO, local gates, diagnostic snapshot cadence. -->

## Requirements

- Functional:
  - State machine logs must show `from`, `to`, `reason`, `dwell_ms` where available.
  - LTE FSM logs must show recovery start/done/fail, retry milestone, state dwell timeout.
  - Offline queue logs must show depth/high-water/replay lag via summaries, not every record in release.
  - MQTT logs must attribute failures by topic/class and update counters for success/failure/fallback.
  - OBD logs must summarize adapter quality and invalid response classes.
  - OTA HTTP logs must show stage, HTTP result/status, timeout, and mapped error reason.
- Non-functional:
  - No raw payload logging.
  - No per-loop INFO logs.
  - Use existing module structure; no broad refactor.

## Architecture

- State machine owns lifecycle visibility and periodic health snapshot.
- Domain/adapter modules update counters and emit rate-limited local warnings.
- Publish pipeline keeps Broader INFO only for useful success/lifecycle context; rawdata/status high-rate success details move to counters, DEBUG, or local gates. Failures remain WARN.
- OTA HTTP emits one stage log per major step because OTA is low-frequency/high-impact.
- Offline queue uses summary logs and counters; detailed per-record logs stay behind existing diagnostic flags.
- After hotspot edits, run firmware-wide audit of `ESP_LOG*` calls for level, fields, forbidden data, and obvious spam loops.

## Related code files

- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/app-core/src/state_machine_core.c` — add transition reason/dwell logs; emit health snapshot; keep GNSS failure categories separate.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-modem-sim7600-at/src/modem_lte_fsm.c` — rate-limit waiting/retry logs; add recovery counters and dwell-time fields.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-modem-sim7600-at/src/modem_lte_recovery.c` — log recovery start/result once; update counters.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/domain-storage/src/offline_queue.c` — replace per-record release chatter with summary/rate-limited warnings; keep diag-flag detail.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/app-core/src/state_publish_pipeline.c` — demote metadata success log to DEBUG or gated INFO; add publish fallback counter and topic/class field.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-mqtt-sim7600-at/src/mqtt_publish.c` — enrich error logs with topic/class/stage/duration where cheap.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-ble-obd-nimble/src/ble_obd.c` — summarize scan/connect/read quality; rate-limit malformed response warnings.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/domain-ota/src/util_ota_http.c` — add OTA HTTP lifecycle and failure reason logs.
- Modify if counters extended: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/domain-telemetry/include/telemetry_counters.h`.
- Modify if counters extended: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/domain-telemetry/src/telemetry_counters.c`.
- Create: none for shared rate gate in first implementation pass; use local per-module gates.
- Delete: none.

## Implementation Steps

1. State machine:
   - Find central transition function/path.
   - Add one INFO per actual transition: `state transition from=X to=Y reason=Z dwell_ms=N`.
   - Preserve current policy block WARN logs but add `reason=` consistently.
   - Do not log heartbeat every cycle. Convert repeated heartbeat fallback warnings to rate-gated if needed.
   - Keep GNSS: transport fail, parse fail, no-fix streak, fix-success streak as distinct fields/events.
2. LTE FSM/recovery:
   - Identify repeated waiting/polling logs.
   - Keep first warning for SIM/network failure; then log every N retry or interval with `suppressed=`.
   - Log recovery lifecycle: `recovery start reason=... attempt=...`, `recovery done result=... duration_ms=...`.
   - Add counters for start/success/fail.
3. Offline queue:
   - Keep enqueue/replay per-record logs only under diagnostic flags or DEBUG.
   - Add periodic INFO summary: `queue health depth=... high_water=... replay_ok=... retry=... drop=... quota_hit=...`.
   - WARN on data loss, quota GC, corrupt record, repeated mount failure with rate gate.
4. Publish pipeline/MQTT:
   - Keep useful Broader INFO for low-rate publish lifecycle/success summaries.
   - Demote or locally gate `mqtt <label> metadata mid=...` INFO when topic/class is high-rate rawdata/status.
   - On live publish fail, include `topic_class`, `err`, `fallback=offline_queue`, `seq`, not payload.
   - Add counters for ok/fail/fallback.
   - In low-level MQTT publish, add stage context for AT command failure: `stage=topic|payload|pub`.
5. BLE OBD:
   - Keep discovery/connect success INFO because low-frequency and useful.
   - Rate-limit invalid response/timeout warnings; include counts/classes.
   - Add snapshot counters for read ok/timeout/invalid.
6. OTA HTTP:
   - Add INFO for low-frequency stages: start, request sent, URC received, status classified, download complete.
   - WARN/ERROR for failure with `stage`, `status`, `err`, `duration_ms`.
   - Redact URL/token/query strings.
7. Run whole-firmware log audit after hotspot edits:
   - scan all `iot-vehicle-tracking-system-firmware/components/**/*.c|h` for `ESP_LOG*`.
   - classify obvious mismatches against Phase 01 standard.
   - fix low-risk mismatches in touched/hotspot modules.
   - record follow-up for unrelated modules if change would become broad refactor.
8. Review all changed logs for forbidden fields and verbosity.

## Todo list

- [ ] State transition reason logs implemented.
- [ ] LTE retry/recovery logs rate-gated.
- [ ] Offline queue summaries replace release per-record chatter.
- [ ] MQTT publish successes counted, failures attributed.
- [ ] OBD quality metrics summarized.
- [ ] OTA HTTP lifecycle logs added.
- [ ] Firmware-wide `ESP_LOG*` audit completed.
- [ ] Forbidden fields reviewed.

## Success Criteria

- During normal drive/publish, INFO logs are low-rate and meaningful.
- During network loss, operator sees recovery/fallback/queue health without flood.
- OTA failure can be diagnosed from stage/status/reason logs.
- MQTT failures can be mapped to publish class/stage without payload.
- Implementation stays within existing components; no broad architecture change.

## Risk Assessment

- Risk: demoting publish metadata removes needed traceability. Mitigation: keep `seq`/`mid` on WARN failures and snapshot counters.
- Risk: queue summary needs depth that is not cheap. Mitigation: use already-maintained metadata only; do not scan SD for logging.
- Risk: state transition reason not centrally available. Mitigation: add local reason at transition call sites, not a new state framework.
- Risk: OBD scan logs hide adapter matching issues. Mitigation: keep DEBUG diagnostics for field builds.

## Security Considerations

- Never log MQTT payloads, auth token, OTA signed URL, raw OBD frames unless diagnostic build explicitly enables and redacts.
- Stable IDs such as boot/message/job IDs are allowed for traceability.
- Do not log exact coordinates. Use `fix_valid`, `fix_age_ms`, `sat_count` if needed.
- Use `esp_err_to_name()` style error names; avoid dumping buffers.

## Next steps

- Run Phase 04 validation commands after implementation.
- Update docs/changelog only after implementation is real and validated.
- If log budget still noisy in field, tune intervals before adding new abstractions.
