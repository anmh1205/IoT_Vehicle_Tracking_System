# Sub-Phase 1A: Database Schema

> **Context:** ~4KB | **Max Files:** 10 SQL files | **Est. Time:** 1 session

## Summary
Tạo PostgreSQL schema với migrations cho Vehicle Tracking System. Bao gồm core tables (users, devices, sessions), vehicle tracking tables, và audit tables.

## Tasks
| ID     | Description                        | Files                                          |
| ------ | ---------------------------------- | ---------------------------------------------- |
| DB-001 | PostgreSQL extensions + ENUM types | `Tracking_PostgreSQL/init/00-extensions.sql`   |
| DB-002 | Users + user_sessions tables       | `Tracking_PostgreSQL/init/01-users.sql`        |
| DB-003 | Devices + device_sessions tables   | `Tracking_PostgreSQL/init/02-devices.sql`      |
| DB-004 | Error code definitions             | `Tracking_PostgreSQL/init/03-error-codes.sql`  |
| DB-005 | Event logs + validation errors     | `Tracking_PostgreSQL/init/04-event-logs.sql`   |
| DB-006 | Firmware tables                    | `Tracking_PostgreSQL/init/05-firmware.sql`     |
| DB-007 | Vehicle + customer tables          | `Tracking_PostgreSQL/init/06-vehicles.sql`     |
| DB-008 | Trips + alerts tables              | `Tracking_PostgreSQL/init/07-trips-alerts.sql` |
| DB-009 | Geofences + maintenance tables     | `Tracking_PostgreSQL/init/08-geofences.sql`    |
| DB-010 | Audit tables + triggers            | `Tracking_PostgreSQL/init/09-audit.sql`        |

## Core Schema Summary

### ENUM Types
```sql
CREATE TYPE device_status_enum AS ENUM ('running', 'stopped', 'disconnected');
CREATE TYPE session_status_enum AS ENUM ('running', 'completed', 'disconnected');
CREATE TYPE event_type_enum AS ENUM ('error', 'warning', 'status_change', 'validation', 'connection', 'firmware');
CREATE TYPE severity_enum AS ENUM ('debug', 'info', 'warning', 'error', 'critical');
```

### Key Tables
| Table             | Primary Fields                                                 |
| ----------------- | -------------------------------------------------------------- |
| `users`           | id, username, password_hash, role, device_access_mode          |
| `user_sessions`   | id, user_id, session_token (UNIQUE), expires_at, is_active     |
| `devices`         | id, device_id (UNIQUE), auth_token (UNIQUE), current_status    |
| `device_sessions` | id, device_id, status, server_session_start/end, stats         |
| `vehicles`        | id, vehicle_id, plate_number, device_id (FK), customer_id (FK) |
| `customers`       | id, customer_code, name, email, phone                          |
| `trips`           | id, trip_code, vehicle_id, device_id, status, coordinates      |
| `alerts`          | id, vehicle_id, device_id, alert_type, severity, status        |
| `geofences`       | id, name, geofence_type, coordinates (JSONB), trigger_on       |
| `maintenance`     | id, vehicle_id, maintenance_type, scheduled_date, status       |

### Key Indexes (QUAN TRỌNG cho performance)
```sql
-- Auth lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);

-- Device operations
CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_devices_auth_token ON devices(auth_token);
CREATE INDEX idx_device_sessions_device_status ON device_sessions(device_id, status);

-- Vehicle tracking
CREATE INDEX idx_vehicles_device_id ON vehicles(device_id);
CREATE INDEX idx_alerts_status_created ON alerts(status, created_at DESC);
```

## Dependencies
- ✅ Độc lập — có thể chạy đầu tiên
- ➡️ Phase 2A (Backend Auth) sẽ sử dụng schema này

## Verification
- [ ] `docker-compose up postgres` — container khởi động OK
- [ ] Kết nối via `psql` và kiểm tra tables exist
- [ ] `\dt` liệt kê tất cả tables
- [ ] Test queries: `SELECT * FROM users LIMIT 1;`

## Full Spec Reference
- [10-database-postgresql.md](./../../10-database-postgresql.md) — Chi tiết đầy đủ schema
