# PostgreSQL Patterns for IoT

> "PostgreSQL holds the truth about what things ARE and how they relate. It is the source of relational state -- entities, ownership, configuration, and current status."

---

## 1. Table Categories

Every IoT project has two categories of PostgreSQL tables: generic (present in every project) and domain-specific (varies by business problem).

```
PostgreSQL Tables
|
+-- Generic Tables (every IoT project)
|   |
|   +-- Auth & Users
|   |   +-- users
|   |   +-- user_sessions
|   |   +-- user_audit_logs
|   |
|   +-- Device Management
|   |   +-- devices
|   |   +-- device_types (or device_models)
|   |   +-- device_sessions
|   |   +-- device_audit_logs
|   |
|   +-- Firmware (OTA)
|   |   +-- firmwares
|   |   +-- firmware_versions
|   |   +-- firmware_deploy_jobs
|   |
|   +-- System
|   |   +-- error_code_definitions
|   |   +-- system_settings
|   |   +-- validation_errors
|   |
|   +-- Data Export
|       +-- export_jobs
|       +-- export_audit_logs
|
+-- Domain-Specific Tables (varies per project)
    |
    +-- Vehicle Tracking
    |   +-- vehicles, customers, trips, geofences
    |   +-- geofence_rules, alert_rules, alert_history
    |   +-- drivers, driver_assignments
    |   +-- maintenance_records, fuel_logs
    |
    +-- Vibration Monitoring
    |   +-- machines, measurement_points, sensors
    |   +-- vibration_thresholds, alarm_profiles
    |   +-- maintenance_schedules, work_orders
    |
    +-- Smart Agriculture
        +-- farms, fields, crops, irrigation_zones
        +-- soil_profiles, planting_schedules
        +-- harvest_records, yield_data
```

---

## 2. Schema Conventions

### Primary Key Strategy

```
Choosing a primary key type:
|
+-- Is it a user-facing ID? (shown in URLs, shared externally)
|   +-- YES --> UUID (uuid_generate_v4())
|   |   +-- Prevents enumeration attacks
|   |   +-- Safe to expose in APIs
|   +-- NO --> Continue
|
+-- Is it internal only? (never leaves the database)
|   +-- YES --> SERIAL or BIGSERIAL
|   |   +-- Faster joins, smaller indexes
|   |   +-- Sequential, predictable
|   +-- NO --> UUID as default safe choice
|
+-- Hybrid approach (recommended for IoT):
    +-- SERIAL for internal PK (id)
    +-- UUID for external reference (uuid column, UNIQUE)
    +-- Best of both: fast joins + safe API exposure
```

### Timestamp Conventions

| Column | Type | Purpose |
|--------|------|---------|
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | Row creation time |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | Last modification (use trigger) |
| `deleted_at` | `TIMESTAMPTZ NULL` | Soft delete marker (NULL = active) |
| `last_seen_at` | `TIMESTAMPTZ NULL` | Last device heartbeat |
| `expires_at` | `TIMESTAMPTZ NULL` | Session or token expiry |

**Always use TIMESTAMPTZ (with time zone), never TIMESTAMP.**

### Updated_at Trigger Pattern

Every table with `updated_at` needs this trigger. Define the function once, attach per table.

```
Function: update_updated_at_column()
  +-- Sets NEW.updated_at = NOW() on every UPDATE
  +-- Attach to each table: CREATE TRIGGER ... BEFORE UPDATE
```

### Soft Delete Convention

```
Soft delete decision:
|
+-- Does the entity have dependent data that must survive?
|   +-- YES --> Soft delete (deleted_at column)
|   |   +-- Users (have audit history)
|   |   +-- Devices (have telemetry references)
|   |   +-- Vehicles (have trip records)
|   +-- NO --> Hard delete is fine
|       +-- Sessions (ephemeral)
|       +-- Export jobs (transient)
|
+-- Querying soft-deleted tables:
    +-- Active records: WHERE deleted_at IS NULL
    +-- Archived records: WHERE deleted_at IS NOT NULL
    +-- All records: No filter (admin views only)
```

---

## 3. JSONB Usage

JSONB is powerful but must be used deliberately.

```
When to use JSONB:
|
+-- Configuration that varies per instance
|   +-- device_config JSONB (each device type has different settings)
|   +-- alert_rule_config JSONB (different rule types have different params)
|
+-- Metadata that is rarely queried by specific field
|   +-- context JSONB (request context, error details)
|   +-- extra_data JSONB (vendor-specific device data)
|
+-- Flexible schema during early development
    +-- payload JSONB (evolving telemetry format)
    +-- BUT: migrate to typed columns once schema stabilizes

When NOT to use JSONB:
|
+-- Data that is frequently filtered or joined
|   +-- BAD: WHERE config->>'region' = 'North'
|   +-- GOOD: WHERE region = 'North' (typed column)
|
+-- Data with known, stable structure
|   +-- BAD: address JSONB {"street": "...", "city": "..."}
|   +-- GOOD: street VARCHAR, city VARCHAR
|
+-- Foreign key relationships
    +-- JSONB cannot enforce referential integrity
```

---

## 4. Index Strategy for IoT

### Must-Have Indexes

| Index | Why |
|-------|-----|
| Foreign key columns | Every FK column needs an index (PostgreSQL does NOT auto-index FKs) |
| `WHERE deleted_at IS NULL` queries | Partial index on active records |
| `device_id` on event/log tables | Most queries filter by device |
| `customer_id` on multi-tenant tables | Tenant isolation queries |
| `created_at` on large tables | Time-range filtering |
| `status` columns | State-based filtering |

### Partial Index Pattern

```
For soft-delete tables with mostly active records:
|
+-- Standard index: covers ALL rows (including deleted)
+-- Partial index: covers ONLY active rows
    +-- CREATE INDEX idx_devices_active ON devices (customer_id)
    |   WHERE deleted_at IS NULL;
    +-- Smaller index, faster queries for the common case
```

### Composite Index Decision

```
Should I create a composite index?
|
+-- Do queries always filter by both columns together?
|   +-- YES --> Composite index (column_a, column_b)
|   |   +-- Column order matters: most selective first
|   |   +-- Also covers queries on column_a alone
|   +-- NO --> Separate indexes
|
+-- Example: "Find devices by customer AND status"
    +-- CREATE INDEX idx_devices_customer_status
    |   ON devices (customer_id, status)
    |   WHERE deleted_at IS NULL;
```

---

## 5. Audit Trail Pattern

### Separate Audit Tables

```
Main table: users
|   +-- id, email, name, role, created_at, updated_at
|
Audit table: user_audit_logs
    +-- id, user_id, action, changed_fields, performed_by
    +-- request_id, ip_address, created_at
    +-- action: 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
    +-- changed_fields: JSONB showing old and new values
```

| Principle | Rule |
|-----------|------|
| **Separate table** | Never audit in the same table (bloats the main table) |
| **Immutable** | Audit rows are INSERT-only, never UPDATE or DELETE |
| **Correlation** | Include `request_id` to trace across services |
| **Actor** | Always record WHO performed the action (`performed_by`) |

---

## 6. Migration File Pattern

### File Naming Convention

```
{Prefix}_PostgreSQL/init/
|
+-- 00-extensions.sql          # CREATE EXTENSION (uuid-ossp, etc.)
+-- 01-functions.sql           # Shared functions (updated_at trigger)
+-- 02-users.sql               # Auth tables
+-- 03-devices.sql             # Device management tables
+-- 04-firmware.sql            # OTA tables
+-- 05-vehicles.sql            # Domain-specific (vehicle tracking)
+-- 06-customers.sql           # Domain-specific
+-- 07-trips.sql               # Domain-specific
+-- 08-alerts.sql              # Domain-specific
+-- 09-geofences.sql           # Domain-specific
+-- 10-validation-errors.sql   # System tables
+-- 11-drivers.sql             # Added later
```

### Ordering Principles

| Rule | Description |
|------|-------------|
| **Extensions first** | 00-XX: database extensions and setup |
| **Functions next** | 01-XX: shared functions (triggers, utilities) |
| **Core tables** | 02-XX to 04-XX: auth, devices, firmware (generic) |
| **Domain tables** | 05-XX onward: project-specific tables |
| **Dependencies** | Tables referenced by foreign keys must come first |
| **Additive** | New features get the next available number |

---

## 7. Multi-Tenancy Pattern

```
Multi-tenancy decision:
|
+-- Shared database, shared schema (column-based isolation)
|   +-- Add customer_id to every tenant-scoped table
|   +-- Every query includes WHERE customer_id = ?
|   +-- Simplest to implement, sufficient for most IoT projects
|   +-- Risk: forgetting the WHERE clause leaks data
|
+-- Shared database, separate schemas
|   +-- One PostgreSQL schema per tenant
|   +-- More isolation, more complexity
|   +-- Use for regulated industries (healthcare, finance)
|
+-- Separate databases
    +-- One database per tenant
    +-- Maximum isolation, maximum operational cost
    +-- Use only if legally required
```

**For most IoT projects:** Column-based isolation with `customer_id` is the right choice. Add Row-Level Security (RLS) policies for defense-in-depth.

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| No indexes on foreign keys | Slow JOINs, slow CASCADE deletes | Index every FK column |
| `SELECT *` in repositories | Returns unnecessary data, breaks on schema change | Select only needed columns |
| Time-series in PostgreSQL | Storage explosion at IoT scale | Route to VictoriaMetrics |
| Business logic in triggers | Hidden behavior, hard to debug | Keep logic in application services |
| No `updated_at` trigger | Stale timestamps, incorrect audit | Attach trigger to every table |
| JSONB for everything | No type safety, no constraints | Use typed columns for known fields |
| Missing `NOT NULL` constraints | Allows invalid data silently | Constrain every required column |
| No soft delete on important entities | Cannot recover deleted data | Add `deleted_at` column |

---

> **Principle:** PostgreSQL is the system of record for relational state. Every entity, every relationship, every configuration lives here. Design the schema around query patterns, enforce integrity with constraints, and never store time-series data in relational tables.
