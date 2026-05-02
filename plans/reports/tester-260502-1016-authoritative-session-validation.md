## Validation Summary
- Scope: `Tracking_MqttBridge`, `Tracking_Backend`, `Tracking_Frontend`
- Overall: Blocked for runtime verification; static validation passed
- Code modified: none

## Status
- MqttBridge authoritative mapping/status: passed (static), blocked (command execution)
- Backend device DTO/realtime: passed (static), blocked (command execution)
- Frontend parser + dashboard/map semantics: passed (static), blocked (command execution)

## Test Results Overview
- Commands attempted: `ls` via Bash only, to verify shell health
- Result: failed before project commands ran
- Bash evidence: `/usr/bin/bash: -c: line 174: unexpected EOF while looking for matching '"'`
- Total tests run: 0
- Passed: 0
- Failed: 0
- Skipped/blocked: all runtime checks

## Coverage Metrics
- Line coverage: not executed
- Branch coverage: not executed
- Function coverage: not executed
- Reason: Bash wrapper failure blocked `typecheck`, `build`, `test`, `lint`

## Build Status
- `Tracking_MqttBridge`: blocked; intended scripts in `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/package.json` are `typecheck`, `build`, `verify`
- `Tracking_Backend`: blocked; intended scripts in `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/package.json` are `typecheck`, `build`, `test`, `test:cov`, `verify`
- `Tracking_Frontend`: blocked; intended scripts in `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/package.json` are `typecheck`, `build`, `lint`

## Static Evidence
### IDE diagnostics
- Workspace diagnostics empty for:
  - `file:///E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge`
  - `file:///E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend`
  - `file:///E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend`
- File diagnostics empty for:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/status.handler.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/infrastructure/database.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/device/services/device-details.service.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/hooks/use-device-detail.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/dashboard/hooks/use-dashboard-stats.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/map/hooks/use-map-realtime.ts`

### MqttBridge checks
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/status.handler.ts:128-142`
  - ended/status resolution now falls back to DB identity lookup when cache miss occurs.
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/status.handler.ts:202-252`
  - ended boundary completes by resolved authoritative session id; no cache-only dependency remains.
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/infrastructure/database.ts:204-235`
  - authoritative tuple match `(device_id, firmware_boot_id, local_session_key)` checked first.
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/infrastructure/database.ts:237-262`
  - fallback to any running row now happens only when authoritative identity is absent; this removes stale-row reuse for new authoritative tuples.
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/infrastructure/database.ts:219-227`
  - `canonical_source` and `boundary_source` are overwritten, not `COALESCE`d, so retrofitted rows upgrade to firmware provenance.
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/rawdata.handler.ts:773-799`
  - telemetry still refuses to attach when authoritative mapping is absent; consistent with firmware-owned session identity.

### Backend checks
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/device/types/device.types.ts:67-146`
  - DTOs expose `localSessionKey`, `firmwareBootId`, `canonicalSource`, `boundarySource`, `startReason`, `endReason`.
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/device/services/device-details.service.ts:23-39`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/device/services/device-sessions.service.ts:6-22`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/device/services/device-runtime.service.ts:10-26`
  - same session fields are serialized consistently across detail/session/runtime paths.
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts:285-343`
  - realtime `device:status` payload includes boundary + ignition/motion/vehicle/device/sleep semantic fields and authoritative session keys.
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/event-bus.util.ts:10-115`
  - typed realtime contract includes those fields for `device:status`, `device:position`, `device:session_start`, `device:session_end`.

### Frontend checks
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/hooks/use-device-detail.ts:26-50`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/hooks/use-device-sessions.ts:15-21,37-53`
  - nullable numeric fields now use `toOptionalNumber`; `null` no longer coerces to fake `0`.
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/hooks/use-device-status-realtime.ts:30-69`
  - server `online` status is preserved because serverStatus overrides freshness-derived fallback.
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/dashboard/hooks/use-dashboard-stats.ts:103-110,279-291,345-349,398-453`
  - dashboard labels and grouping treat `online` as “Đỗ xe / còn online”; active/idle/event summaries reflect parked-heartbeat semantics.
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/map/constants/map-config.ts:28-40`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/map/components/map-panel-utils.ts:6-12,71-89`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/map/hooks/use-map-realtime.ts:34-65,73-119`
  - map layer recognizes `online` as distinct status, keeps semantic state fields, and merges realtime payloads without dropping them.

## Failed Tests
- None executed. No genuine pass/fail signal available from runtime commands.

## Performance Metrics
- Runtime timings: not available
- Slow tests: not measurable

## Critical Issues
- External blocker: Bash wrapper broken in this environment. Cannot credibly claim `npm run typecheck`, `npm run build`, `vitest`, coverage, or Next build passed.
- No static code defect found in inspected authoritative-session rollout paths.

## Recommendations
1. Re-run actual commands once shell works:
   - `Tracking_MqttBridge`: `npm run verify`
   - `Tracking_Backend`: `npm run verify && npm run test:cov`
   - `Tracking_Frontend`: `npm run typecheck && npm run build && npm run lint`
2. After shell recovery, prioritize an integration check for restart flow:
   - start boundary
   - bridge restart
   - ended boundary with tuple only
   - next telemetry with same tuple
3. Add/confirm automated tests around null session fields in frontend mappers and stale-row/session-identity DB behavior in bridge.

## Next Steps
1. Fix Bash wrapper / rerun real project commands.
2. Run backend coverage.
3. Run end-to-end smoke for dashboard/map parked-online semantics.

## Unresolved Questions
- Does current CI already cover the bridge restart + ended-boundary tuple-only scenario?
- Are there existing integration tests for `device:status` realtime payload consumers in frontend?