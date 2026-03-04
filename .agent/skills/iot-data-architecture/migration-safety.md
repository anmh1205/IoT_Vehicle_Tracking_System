# Migration Safety

> "A migration that cannot be rolled back is a migration that should not be deployed. Every schema change is a contract change -- treat it with the gravity it deserves."

---

## 1. SQL Migration File Pattern

### File Structure

```
{Prefix}_PostgreSQL/
|
+-- init/
|   +-- 00-extensions.sql
|   +-- 01-functions.sql
|   +-- 02-users.sql
|   +-- 03-devices.sql
|   +-- 04-firmware.sql
|   +-- 05-vehicles.sql
|   +-- ...
|   +-- XX-new-feature.sql
|
+-- docker-compose.yml
+-- .env.example
```

### Naming Rules

| Rule | Convention | Example |
|------|-----------|---------|
| **Prefix** | Two-digit number, zero-padded | `07-`, `11-`, `99-` |
| **Description** | Lowercase, hyphenated, descriptive | `alerts`, `driver-assignments`, `add-fuel-column` |
| **Extension** | Always `.sql` | `07-alerts.sql` |
| **Full name** | `{XX}-{description}.sql` | `11-drivers.sql` |

### Execution Order

```
PostgreSQL Docker init behavior:
|
+-- On FIRST container start (empty data volume):
|   +-- Runs all files in /docker-entrypoint-initdb.d/ alphabetically
|   +-- 00-extensions.sql runs first
|   +-- 01-functions.sql runs second
|   +-- ...continues in order
|   +-- If ANY file fails, container stops
|
+-- On SUBSEQUENT starts (existing data volume):
    +-- Runs NOTHING from init/
    +-- Data persists in the Docker volume
    +-- To re-run: delete volume, restart container (DEVELOPMENT ONLY)
```

---

## 2. Development vs Production Migrations

```
Schema change needed. Which approach?
|
+-- Is there real data in the database?
    |
    +-- NO (development, fresh data volume)
    |   +-- Modify the existing init SQL file directly
    |   +-- Delete Docker volume, recreate container
    |   +-- All init scripts run fresh
    |   +-- Fast iteration, no migration overhead
    |
    +-- YES (production, UAT, or data you cannot lose)
        |
        +-- NEVER modify existing init files
        +-- Add a NEW migration file with next available number
        +-- Run migration manually or via migration tool
        +-- Test on a copy of production data first
        +-- Have a rollback script ready
```

### Decision Table

| Environment | Has Real Data | Strategy | Rollback |
|-------------|--------------|----------|----------|
| **Local dev** | No | Edit init files, recreate volume | Recreate volume |
| **Shared dev** | Maybe | New migration file | Reverse migration |
| **UAT/Staging** | Yes (copy) | New migration file, test here | Reverse migration |
| **Production** | Yes | New migration file, tested in UAT | Reverse migration |

---

## 3. Safe ALTER Strategies

### Adding a Column

```
Adding a column (SAFE):
|
+-- Step 1: Add column as NULLABLE (no default)
|   +-- ALTER TABLE vehicles ADD COLUMN fuel_type VARCHAR(20);
|   +-- Instant operation, no table rewrite
|   +-- Existing rows get NULL
|
+-- Step 2: Backfill data (if needed)
|   +-- UPDATE vehicles SET fuel_type = 'diesel' WHERE fuel_type IS NULL;
|   +-- Do in batches for large tables
|
+-- Step 3: Add NOT NULL constraint (if needed, AFTER backfill)
|   +-- ALTER TABLE vehicles ALTER COLUMN fuel_type SET NOT NULL;
|   +-- Only after ALL rows have a value
|
+-- AVOID: Adding NOT NULL column without DEFAULT
    +-- ALTER TABLE vehicles ADD COLUMN fuel_type VARCHAR(20) NOT NULL;
    +-- FAILS if table has existing rows
```

### Adding a Column with Default

```
Adding column with DEFAULT (PostgreSQL 11+):
|
+-- PostgreSQL 11+ optimization:
|   +-- ALTER TABLE vehicles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
|   +-- Instant operation (default stored in catalog, not written to rows)
|   +-- Safe for large tables
|
+-- PostgreSQL 10 and below:
    +-- Rewrites entire table (DANGEROUS for large tables)
    +-- Add as NULLABLE first, then backfill, then set NOT NULL
```

### Dropping a Column

```
Dropping a column (two-phase):
|
+-- Phase 1: Remove from application code
|   +-- Stop reading and writing the column
|   +-- Deploy application update
|   +-- Wait for all instances to update
|
+-- Phase 2: Drop from database (after Phase 1 is verified)
|   +-- ALTER TABLE vehicles DROP COLUMN old_column;
|   +-- Safe because no code references it anymore
|
+-- WHY two phases?
    +-- If you drop column first, running application breaks immediately
    +-- Old application instances still reference the column during deploy
    +-- Two-phase gives zero-downtime guarantee
```

### Renaming a Column

```
Renaming a column (three-phase):
|
+-- NEVER: ALTER TABLE vehicles RENAME COLUMN old_name TO new_name;
|   +-- Breaks all running application instances instantly
|
+-- Phase 1: Add new column
|   +-- ALTER TABLE vehicles ADD COLUMN new_name VARCHAR(100);
|   +-- Copy data: UPDATE vehicles SET new_name = old_name;
|   +-- Add trigger: keep columns in sync during transition
|
+-- Phase 2: Update application code
|   +-- Switch all reads/writes to new_name
|   +-- Deploy application
|
+-- Phase 3: Drop old column
    +-- Remove sync trigger
    +-- ALTER TABLE vehicles DROP COLUMN old_name;
```

### Adding an Index

```
Adding an index:
|
+-- Small table (< 100K rows):
|   +-- CREATE INDEX idx_vehicles_customer_id ON vehicles (customer_id);
|   +-- Fast, minimal lock time
|
+-- Large table (> 100K rows, production):
    +-- CREATE INDEX CONCURRENTLY idx_vehicles_customer_id ON vehicles (customer_id);
    +-- Does NOT lock the table
    +-- Takes longer but allows reads and writes during creation
    +-- Cannot run inside a transaction block
```

### Adding a Foreign Key

```
Adding a foreign key:
|
+-- Verify all existing data satisfies the constraint FIRST
|   +-- SELECT * FROM vehicles WHERE customer_id NOT IN (SELECT id FROM customers);
|   +-- Fix orphaned rows before adding FK
|
+-- Add the constraint
|   +-- ALTER TABLE vehicles
|       ADD CONSTRAINT fk_vehicles_customers
|       FOREIGN KEY (customer_id) REFERENCES customers(id);
|
+-- For large tables (production):
    +-- ALTER TABLE vehicles
        ADD CONSTRAINT fk_vehicles_customers
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        NOT VALID;
    +-- Then: ALTER TABLE vehicles VALIDATE CONSTRAINT fk_vehicles_customers;
    +-- NOT VALID adds without checking existing rows (instant)
    +-- VALIDATE checks existing rows without blocking writes
```

---

## 4. Migration File Template

### Standard Structure

```
Every migration file follows this pattern:
|
+-- Header comment
|   +-- File number and description
|   +-- Date created
|   +-- Author or ticket reference
|   +-- What this migration does
|   +-- Rollback instructions
|
+-- Forward migration (DO)
|   +-- The actual schema change
|   +-- Wrapped in transaction if possible
|
+-- Rollback comment (at bottom)
    +-- SQL to reverse this migration
    +-- Commented out, for reference
```

### Ordering Dependencies

```
Migration dependency check:
|
+-- Does this migration reference a table from another file?
|   +-- YES --> Your file number MUST be higher
|   |   +-- 05-vehicles.sql creates vehicles table
|   |   +-- 11-drivers.sql references vehicles(id) as FK
|   |   +-- 11 > 05 --> correct order
|   +-- NO --> Any available number is fine
|
+-- Does this migration create an extension?
    +-- YES --> Must be in 00-extensions.sql (runs first)
```

---

## 5. Dangerous Operations

### Operations That Lock Tables

| Operation | Lock Type | Duration | Alternative |
|-----------|----------|----------|-------------|
| `ALTER TABLE ADD COLUMN NOT NULL` (no default) | ACCESS EXCLUSIVE | Instant (fails) | Add nullable, backfill, set NOT NULL |
| `CREATE INDEX` | SHARE LOCK | Duration of build | `CREATE INDEX CONCURRENTLY` |
| `ALTER TABLE ADD CONSTRAINT` (FK) | ACCESS EXCLUSIVE | Validates all rows | `NOT VALID` then `VALIDATE` |
| `ALTER TABLE SET TYPE` (change column type) | ACCESS EXCLUSIVE | Rewrites table | Add new column, migrate data |
| `VACUUM FULL` | ACCESS EXCLUSIVE | Duration of vacuum | Regular `VACUUM` (no lock) |

### Operations That Rewrite Tables

| Operation | Rewrites? | Safe Alternative |
|-----------|-----------|------------------|
| Add column with DEFAULT (PG < 11) | YES | Add nullable, backfill |
| Change column type | YES | Add new column, copy data |
| Add NOT NULL to existing column | NO (just validates) | Safe, but verify data first |
| Drop column | NO (marks as dropped) | Safe, but two-phase approach |

---

## 6. Testing Migrations

```
Migration testing process:
|
+-- Step 1: Test on empty database
|   +-- Delete Docker volume, start fresh
|   +-- All init scripts must run without error
|   +-- Verify schema is correct
|
+-- Step 2: Test on copy of production data
|   +-- Take a database dump from production
|   +-- Restore to test environment
|   +-- Run migration on the copy
|   +-- Verify data integrity
|   +-- Measure execution time
|
+-- Step 3: Test rollback
|   +-- Execute the rollback SQL
|   +-- Verify database returns to previous state
|   +-- Verify application works with rolled-back schema
|
+-- Step 4: Test application compatibility
    +-- Run application against migrated database
    +-- Run ALL tests
    +-- Verify no broken queries
```

---

## 7. VictoriaMetrics Schema Changes

VictoriaMetrics has no schema, but metric naming changes need a migration strategy.

```
Renaming a metric:
|
+-- Phase 1: Write BOTH old and new metric names
|   +-- tracking_speed_kph (old, wrong unit abbreviation)
|   +-- tracking_speed_kmh (new, correct)
|   +-- Update write code to emit both
|
+-- Phase 2: Update all queries and dashboards
|   +-- Switch PromQL queries to new metric name
|   +-- Update Grafana dashboards
|   +-- Update alerting rules
|
+-- Phase 3: Stop writing old metric
|   +-- Remove old metric from write code
|   +-- Old data expires naturally via retention period
|
+-- Timeline:
    +-- Phase 1 starts: day 0
    +-- Phase 2 completes: day 1-7
    +-- Phase 3: after Phase 2 verified
    +-- Old data gone: after retention period expires
```

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Modifying init files with real data in volume | Init files only run on first start | Add new migration file |
| `ALTER TABLE ... NOT NULL` without checking data | Fails if NULLs exist | Backfill first, then constrain |
| `CREATE INDEX` without `CONCURRENTLY` on large table | Locks table for minutes/hours | Always `CONCURRENTLY` in production |
| Renaming column directly | Breaks running application instances | Three-phase: add, migrate, drop |
| No rollback plan | Stuck if migration causes problems | Write rollback SQL before deploying |
| Testing only on empty database | Misses data-dependent failures | Test on copy of production data |
| Running migration without timing it | Surprise 2-hour table lock | `EXPLAIN` and time on test data first |
| Dropping column before removing from code | Application crashes immediately | Remove from code first, drop later |

---

> **Principle:** Every migration is a contract change between your database and your application. The safest migrations are additive (add column, add index), reversible (can be undone), and tested on real data. Never assume a migration is safe because it worked on an empty database.
