# Phase 6: Audit Log System

**Priority:** 🟡 Trung bình
**Status:** Pending
**Estimated effort:** 3-4 hours

## Context

- Report recommends audit trail for security
- No audit logging exists — admin actions (create/update/delete) not tracked
- Need: who did what, when, to what entity

## Architecture

```
Any mutating API → audit middleware → INSERT audit_logs
Frontend: admin panel → view audit log table
```

## Database Schema

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- create, update, delete, start, end, acknowledge
  entity_type VARCHAR(50) NOT NULL, -- vehicle, device, trip, alert, geofence, user
  entity_id VARCHAR(100),
  changes JSONB, -- { field: { old, new } }
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

## Related Code Files

**Create:**
- `Tracking_Backend/src/domain/audit/services/audit-log.service.ts`
- `Tracking_Backend/src/domain/audit/repositories/audit-log.repository.ts`
- `Tracking_Backend/src/domain/audit/types/audit.types.ts`
- `Tracking_Backend/src/api/controllers/audit.controller.ts`
- `Tracking_Backend/src/api/routes/audit.routes.ts`

**Modify:**
- Key service files: add `auditLog.record()` calls after mutations
- `Tracking_Backend/src/api/routes/index.ts` — register audit routes

## Implementation Steps

1. Create audit_logs table migration
2. Create types, repository, service
3. Add `auditLog.record(userId, action, entityType, entityId, changes)` helper
4. Instrument key services: vehicle CRUD, device CRUD, trip start/end, user create/delete
5. Create admin-only GET /audit-logs endpoint with filters
6. Frontend: add audit log page in admin section

## Success Criteria

- [ ] All mutating operations logged
- [ ] Admin can view audit log with filters (user, entity, action, date)
- [ ] Changes JSONB shows old→new values for updates
