# debugger-260410-1610-backend-test-suite-fix

## Executive summary
- Reproduced backend failure: 9 test files discovered but reported `No test suite found in file ...`.
- Primary root cause: test files used imported Vitest API (`import { describe, it, ... } from 'vitest'`) while project runtime required global test API registration.
- Secondary blocker after primary fix: some assertions depended on clean mock call counts but only `vi.clearAllMocks()` was used (keeps mock implementations), causing cross-test leakage in a few suites.
- Applied minimal test-harness-safe fixes only (no product logic changes).

## Reproduction
Command:
- `npm --prefix "e:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend" run test`

Observed:
- 9 failed suites
- Same error shape: `Error: No test suite found in file ...`

## Root cause details
1. **Suite registration mismatch**
   - `vitest.config.ts` had `globals: false`.
   - Test files in this set were not being recognized as suites in current runner setup.
   - Enabling global API and using global test functions resolved suite discovery.

2. **Mock state leakage between tests**
   - After suite registration fixed, tests executed but 6 assertions failed due to inherited call history / retained behavior.
   - Affected tests expected `not.toHaveBeenCalled()` or strict call counts.
   - Added explicit resets/clears in the specific failing tests to keep behavior deterministic.

## Changes made
1. `e:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/vitest.config.ts`
   - Set `test.globals: true`
   - Added `test.mockReset: true`

2. Removed `import { describe, it, expect, vi, beforeEach } from 'vitest';` from 8 files + `import { describe, expect, it } from 'vitest';` from 1 file:
   - `.../src/api/validators/auth.validator.test.ts`
   - `.../src/middleware/__tests__/error-handler.test.ts`
   - `.../src/domain/driver/services/driver-crud.service.test.ts`
   - `.../src/domain/driver/services/driver-list.service.test.ts`
   - `.../src/domain/fuel-analytics/services/fuel-analytics.service.test.ts`
   - `.../src/domain/audit/services/__tests__/audit-log.test.ts`
   - `.../src/domain/trip/services/__tests__/trip-waypoints.test.ts`
   - `.../src/domain/vehicle/services/__tests__/vehicle-status.test.ts`
   - `.../src/domain/violation/services/__tests__/violation-crud.test.ts`

3. Targeted mock hygiene for the remaining 6 failing assertions:
   - `.../src/domain/driver/services/driver-crud.service.test.ts`
   - `.../src/domain/fuel-analytics/services/fuel-analytics.service.test.ts`
   - `.../src/domain/vehicle/services/__tests__/vehicle-status.test.ts`
   - `.../src/domain/violation/services/__tests__/violation-crud.test.ts`

## Verification rerun
Command:
- `npm --prefix "e:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend" run test`

Result:
- `Test Files 9 passed (9)`
- `Tests 79 passed (79)`
- No remaining backend test blocker.

## Unresolved questions
- None.
