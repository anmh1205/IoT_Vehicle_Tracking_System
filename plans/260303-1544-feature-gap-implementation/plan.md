# Feature Gap Implementation Plan

**Date:** 2026-03-03
**Branch:** feature/coding
**Status:** Planning

## Context

So sánh report yêu cầu (`resources/reports/iot-vehicle-tracking-report/`) với codebase hiện tại, xác định gaps và lên kế hoạch implement.

## Verification Results

| Item | Status | Detail |
|------|--------|--------|
| Auth model | ✅ Session-based | Opaque token, SHA-256, `user_sessions` table, bcrypt/12 |
| Rate limiting | ✅ Implemented | `express-rate-limit`: auth=100/60s, general=1000/30s |
| API versioning | ✅ Both active | `/api/v1` canonical + `/api` alias |
| Error handler | ⚠️ Gap | Missing `traceId` in response body |
| Violations | ❌ Missing | No backend route/controller — only statistics aggregation |
| Geofence detection | ❌ Missing | CRUD only — no point-in-polygon or entry/exit logic |
| Unit tests | ⚠️ Sparse | Vitest, only 4 test files |
| Export | ✅ Real | ExcelJS `.xlsx`, async job pattern. No PDF |

## Phases Overview

| Phase | Focus | Priority | Files |
|-------|-------|----------|-------|
| 1 | Violations backend + fix frontend | 🔴 Cao | [phase-01](./phase-01-violations-backend.md) |
| 2 | Geofence detection logic | 🔴 Cao | [phase-02](./phase-02-geofence-detection.md) |
| 3 | Error handler traceId + error format | 🟡 Trung bình | [phase-03](./phase-03-error-handler-traceid.md) |
| 4 | Trip route interval param + auto-detect | 🟡 Trung bình | [phase-04](./phase-04-trip-improvements.md) |
| 5 | Vehicle status endpoint | 🟡 Trung bình | [phase-05](./phase-05-vehicle-status-endpoint.md) |
| 6 | Audit log system | 🟡 Trung bình | [phase-06](./phase-06-audit-log.md) |
| 7 | UX improvements | 🟢 Thấp | [phase-07](./phase-07-ux-improvements.md) |
| 8 | Test coverage | 🟢 Thấp | [phase-08](./phase-08-test-coverage.md) |

## Dependencies

- Phase 2 (geofence detection) → feeds violations data for Phase 1
- Phase 4 (trip auto-detect) → depends on MQTT Bridge ignition event
- Phase 6 (audit log) → standalone, no deps
- Phase 7 (UX) → after core features stable
- Phase 8 (tests) → after all features implemented
