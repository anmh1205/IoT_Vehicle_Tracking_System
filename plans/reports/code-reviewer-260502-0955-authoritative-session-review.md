## Code Review Summary

### Scope
- Files: bridge/backend/frontend authoritative-session rollout files requested by user
- Focus: correctness, regressions, semantic mismatches for firmware-authoritative ignition session boundaries
- Scout findings: checked restart/out-of-order boundaries, stale running rows, realtime/UI semantic drift

### Overall Assessment
Not acceptable to proceed yet. Core rollout intent is good, but bridge still depends on in-memory session mapping for some end/data flows and can merge distinct firmware sessions when a stale running row exists.

### High Priority
1. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/status.handler.ts:127-132,192-204`
   - Severity: High
   - Ended boundaries without `canonical_session_id` are resolved only from cache. After bridge restart or cache loss, a valid firmware `ended` event with `(device_id, boot_id, local_session_key)` is dropped even though DB now persists that identity. Result: session stays running forever, device stays semantically wrong.

2. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/infrastructure/database.ts:221-246`
   - Severity: High
   - `ensureDeviceSession()` falls back to “latest running session for device” when tuple lookup misses. If an earlier session was left running because its end boundary was missed, the next firmware `started` boundary can be attached to that stale row instead of creating a new authoritative session. This collapses distinct ignition sessions and violates the new source-of-truth model.

### Medium Priority
3. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/infrastructure/database.ts:235-239`
   - Severity: Medium
   - Provenance fields are updated with `COALESCE(existing_col, new_value)`. Because migrated/defaulted rows already have non-null `canonical_source` / `boundary_source`, a legacy running row matched later by firmware identity keeps legacy provenance instead of being upgraded to firmware-authoritative metadata.

4. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/hooks/use-device-detail.ts:33-47`
   - Severity: Medium
   - Null numeric session fields are coerced with `Number(...)`. `localSessionKey: null` becomes `0`; `uptime: null` / `avgVibration: null` become `0`. UI can show fake identity/data instead of “unknown / absent”.

5. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/hooks/use-device-sessions.ts:36-49`
   - Severity: Medium
   - Same null-to-zero coercion bug in paginated session list mapping. Historical rows without provisional identity will appear as `localSessionKey=0`, and nullable metrics collapse to zero.

### Edge Cases Found by Scout
- Bridge restart between `started` and `ended` boundaries.
- Missed `ended` boundary followed by a new ignition session on same device.
- Legacy running rows being retrofitted with authoritative identity but not authoritative provenance.
- Nullable session metadata displayed as real zero values in frontend.

### Positive Observations
- DB schema now persists `(device_id, firmware_boot_id, local_session_key)` with a unique index.
- Backend DTO exposure is consistent across detail/session/runtime responses.
- Frontend status copy for parked-online semantics is aligned in labels and presenter hints.

### Recommended Actions
1. Resolve `ended` boundaries from DB by `(device_id, boot_id, local_session_key)` when cache/canonical id miss.
2. In `ensureDeviceSession()`, do not reuse an unrelated running row for a new firmware tuple; close/flag stale row or create a new row explicitly.
3. When a legacy row is adopted by authoritative firmware identity, overwrite provenance fields intentionally.
4. Preserve nullable frontend fields as `null`; only coerce to number when raw value is non-null/non-undefined.

### Metrics
- Type Coverage: not measured
- Test Coverage: not measured
- Linting Issues: not measured

### Unresolved Questions
- Is firmware guaranteed to always echo `canonical_session_id` on `ended` and subsequent telemetry after a bridge restart? If not, issue 1 is guaranteed to reproduce.
- What is the intended policy for stale running rows when a new authoritative `started` boundary arrives with a different tuple?
