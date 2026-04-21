# Allowed-zone CAS/stale-guard retest

## Scope
- Retest after correctness hardening for allowed-zone evaluator.
- Focus:
  - compare-and-set DB update path in `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/cache/geofence-state.cache.ts`
  - stale-sample guards in `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/services/geofence-checker.service.ts`
  - stale preview guard in `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/vehicle-allowed-zone.service.ts`
- No code edits.

## Test Results Overview
- `Tracking_MqttBridge` typecheck: pass
- `Tracking_MqttBridge` build: pass
- `Tracking_Backend` typecheck: pass
- `Tracking_Backend` build: pass
- `Tracking_Backend` tests: pass
- Total tests run: 83
- Passed: 83
- Failed: 0
- Skipped: 0

## Coverage Metrics
- Coverage command status: failed
- Line coverage: unknown
- Branch coverage: unknown
- Function coverage: unknown
- Cause: missing dev dependency `@vitest/coverage-v8`

## Failed Tests
- None in executed suites.
- Coverage run failed before execution:
  - command: `npm --prefix "E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend" run test:cov`
  - error: `Cannot find dependency '@vitest/coverage-v8'`

## Performance Metrics
- `Tracking_MqttBridge` typecheck: 2.31s
- `Tracking_MqttBridge` build: 2.44s
- `Tracking_Backend` typecheck: 4.37s
- `Tracking_Backend` build: 6.40s
- `Tracking_Backend` test wall time: 3.14s
- Vitest reported duration: 1.47s
- Slowest reported file: `src/domain/driver/services/driver-crud.service.test.ts` at 23ms

## Build Status
- `Tracking_MqttBridge`: success
- `Tracking_Backend`: success
- Warning: backend Vitest run emits Vite CJS Node API deprecation notice; non-blocking

## Regression Check
- CAS path compiles clean:
  - `updateAllowedZoneEvaluation(...)` now guards update with expected membership/alert/suppression snapshot plus occurred-at monotonic checks.
  - No type/build regression seen from new SQL shape.
- Stale-sample guards compile clean:
  - invalid timestamp early-return path present
  - stale telemetry drop path present when `occurredAt < newestKnownAt`
  - lost-race/failure path drops side effects cleanly when CAS update returns null
- Backend stale preview guard compiles clean:
  - `STALE_POSITION_THRESHOLD_MS = 15 * 60 * 1000`
  - stale warning payload generation typechecks/builds
- Existing backend suite shows no regressions from touched modules.

## Test Gaps
- No dedicated automated tests found for `Tracking_MqttBridge` allowed-zone evaluator/CAS logic.
- No backend tests found for allowed-zone preview-center stale warning path.
- No integration tests found for stale sample ordering / race-lost behavior.
- So current result = compile/build regression check strong, behavioral confidence only medium.

## Critical Issues
- No blocking regression found in executed typecheck/build/test gates.
- Coverage cannot be measured with current setup.
- High-value paths changed but remain under-tested.

## Recommendations
1. Add `Tracking_MqttBridge` tests for:
   - stale sample ignored when older than `last_membership_changed_at` or `last_alerted_at`
   - CAS lost-race returns null and suppresses side effects
   - invalid timestamp short-circuit
2. Add `Tracking_Backend` tests for preview-center stale warning branches:
   - stale timestamp
   - missing timestamp
   - fresh timestamp
3. Install/configure `@vitest/coverage-v8` or project-standard coverage provider.
4. If infra available, run DB-backed smoke for concurrent allowed-zone updates to validate CAS behavior against real Postgres semantics.

## Next Steps
1. Highest: add focused tests around CAS + stale guards.
2. Next: enable coverage.
3. Optional: docker smoke with concurrent event ordering.

## Commands Run
- `npm --prefix "/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge" run typecheck`
- `npm --prefix "/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge" run build`
- `npm --prefix "/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend" run typecheck`
- `npm --prefix "/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend" run build`
- `npm --prefix "/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend" run test`
- `npm --prefix "/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend" run test:cov`

## Unresolved questions
- Is there an existing preferred smoke-test flow for concurrent Postgres-backed allowed-zone update validation?
- Should `Tracking_MqttBridge` gain its own test runner now that correctness logic is moving into evaluator/cache paths?