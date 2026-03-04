# Phase 1: Violations Backend + Frontend Fix

**Priority:** 🔴 Cao
**Status:** Pending
**Estimated effort:** 3-4 hours

## Context

- Frontend page `app/dashboard/violations/` exists but NO backend API
- Violations currently only appear as aggregated stats in `statistics` domain
- Report yêu cầu: `GET /violations`, `GET /violations/:id`, `PUT /violations/:id/acknowledge`
- Violations derive from alerts (speeding, geofence breach, idle too long)

## Key Insights

- Violations are NOT separate from alerts — they are a subset/view of alerts with specific types
- Approach: Create violation as a **view layer over alerts** with additional fields (fineAmount, acknowledged, severity)
- Alternative: Create standalone violations table — better for long-term but more work

## Architecture

```
Alert (type: speeding/geofence_exit/...) → auto-creates Violation record
Violation = { alertId, violationType, vehicleId, driverId, severity, fineAmount, acknowledged, notes }
```

## Related Code Files

**Create:**
- `Tracking_Backend/src/domain/violation/types/violation.types.ts`
- `Tracking_Backend/src/domain/violation/repositories/violation.repository.ts`
- `Tracking_Backend/src/domain/violation/services/violation-crud.service.ts`
- `Tracking_Backend/src/domain/violation/services/violation-list.service.ts`
- `Tracking_Backend/src/api/controllers/violation.controller.ts`
- `Tracking_Backend/src/api/routes/violation.routes.ts`
- `Tracking_Backend/src/api/validators/violation.validator.ts`

**Modify:**
- `Tracking_Backend/src/api/routes/index.ts` — register violation routes
- `Tracking_Frontend/src/lib/api/` — add violations API service (if missing)
- `Tracking_Frontend/src/features/violations/` — verify/fix components use real API

**Database:**
- Migration: `CREATE TABLE violations (...)` with FK to alerts

## Implementation Steps

1. Create `violations` table migration SQL
2. Create types (`Violation`, `ViolationPublic`, `CreateViolationInput`)
3. Create repository (findAll, findById, create, acknowledge)
4. Create services (CRUD + list with pagination/filter)
5. Create validators (Zod schemas)
6. Create controller (list, getById, acknowledge)
7. Create routes and register in index.ts
8. Verify frontend violations page connects to real API
9. Compile check backend
10. Compile check frontend

## Database Schema

```sql
CREATE TABLE violations (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER REFERENCES alerts(id),
  vehicle_id VARCHAR(50),
  driver_id INTEGER,
  violation_type VARCHAR(50) NOT NULL, -- speeding, geofence_exit, geofence_enter, idle_too_long
  severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  description TEXT,
  location_lat DECIMAL(10,8),
  location_lon DECIMAL(11,8),
  speed_limit DECIMAL(5,2),
  actual_speed DECIMAL(5,2),
  fine_amount DECIMAL(10,2) DEFAULT 0,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by INTEGER,
  acknowledged_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_violations_vehicle ON violations(vehicle_id);
CREATE INDEX idx_violations_type ON violations(violation_type);
CREATE INDEX idx_violations_created ON violations(created_at DESC);
```

## API Endpoints

- `GET /api/v1/violations` — list (filter: vehicleId, type, severity, acknowledged, dateRange)
- `GET /api/v1/violations/:id` — detail
- `PUT /api/v1/violations/:id/acknowledge` — acknowledge with notes + fineAmount

## Success Criteria

- [ ] Backend compiles without errors
- [ ] GET /violations returns paginated list
- [ ] GET /violations/:id returns detail
- [ ] PUT /violations/:id/acknowledge updates record
- [ ] Frontend violations page displays real data
- [ ] Filters work (type, severity, acknowledged, vehicle)

## Risk

- Need to confirm alerts table structure to set up FK correctly
- Geofence detection (Phase 2) needed to auto-generate geofence violations
