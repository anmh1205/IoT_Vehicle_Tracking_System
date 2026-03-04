# Downsampling and Data Lifecycle

> "Raw data is expensive. Downsampled data is useful. The art is knowing when to transition from one to the other. Every IoT system that skips this conversation eventually runs out of disk."

---

## 1. The Data Lifecycle

All IoT data follows a lifecycle from high-resolution raw samples to compressed summaries to deletion.

```
Data Lifecycle Stages
|
+-- Stage 1: RAW (full resolution)
|   +-- Every sample as received from device
|   +-- 1-second intervals, maximum detail
|   +-- Storage cost: HIGH
|   +-- Query speed: FAST (small time ranges only)
|   +-- Retention: 7-30 days
|
+-- Stage 2: DOWNSAMPLED (reduced resolution)
|   +-- Aggregated to 1-minute or 5-minute intervals
|   +-- avg, min, max, count per interval
|   +-- Storage cost: MEDIUM (50-95% reduction)
|   +-- Query speed: FAST (wider time ranges)
|   +-- Retention: 30-365 days
|
+-- Stage 3: SUMMARIZED (daily/hourly rollups)
|   +-- Daily or hourly summaries
|   +-- Statistical aggregates (avg, p95, p99)
|   +-- Storage cost: LOW
|   +-- Query speed: FAST (any time range)
|   +-- Retention: 1-5 years
|
+-- Stage 4: ARCHIVED (cold storage)
|   +-- Exported to object storage (S3, GCS)
|   +-- Compressed, rarely accessed
|   +-- Storage cost: MINIMAL
|   +-- Query speed: SLOW (requires rehydration)
|   +-- Retention: As required by regulation
|
+-- Stage 5: DELETED
    +-- Data permanently removed
    +-- After retention period expires
    +-- Automated, not manual
```

---

## 2. Typical Retention Profiles

### Vehicle Tracking

| Stage | Resolution | Retention | Storage per 1K devices |
|-------|-----------|-----------|----------------------|
| Raw | 1 sample/sec | 14 days | ~120 GB |
| 1-minute avg | avg, min, max | 90 days | ~6 GB |
| 1-hour avg | avg, min, max | 1 year | ~250 MB |
| Daily summary | avg, min, max, total | 5 years | ~15 MB |

### Industrial Monitoring

| Stage | Resolution | Retention | Storage per 1K sensors |
|-------|-----------|-----------|----------------------|
| Raw | 10 samples/sec | 7 days | ~840 GB |
| 1-second avg | avg, rms, peak | 30 days | ~120 GB |
| 1-minute avg | avg, rms, peak | 1 year | ~6 GB |
| 1-hour avg | statistical summary | 5 years | ~250 MB |

### Smart Agriculture

| Stage | Resolution | Retention | Storage per 1K sensors |
|-------|-----------|-----------|----------------------|
| Raw | 1 sample/min | 30 days | ~2 GB |
| 15-minute avg | avg, min, max | 1 year | ~500 MB |
| Daily summary | avg, min, max | Indefinite | ~5 MB/year |

---

## 3. Downsampling by Database

### VictoriaMetrics Downsampling

```
VictoriaMetrics downsampling options:
|
+-- Option 1: vmagent recording rules (RECOMMENDED)
|   +-- Define recording rules that pre-compute aggregates
|   +-- Run on vmagent, write results back to VictoriaMetrics
|   +-- Rule: record avg, min, max per 1-minute window
|   +-- Raw data auto-deleted by -retentionPeriod
|
+-- Option 2: VictoriaMetrics Enterprise downsampling
|   +-- Built-in -downsampling.period flag
|   +-- Automatic, no external tooling
|   +-- Enterprise feature (paid)
|
+-- Option 3: External job (cron + PromQL export)
|   +-- Query raw data with PromQL aggregation
|   +-- Write results as new metric (e.g., tracking_speed_kmh:1m_avg)
|   +-- Delete raw data after processing
|   +-- Most flexible, most operational overhead
|
+-- Recommended approach (open-source):
    +-- Set -retentionPeriod to raw data lifetime (e.g., 14d)
    +-- Use recording rules for longer-lived aggregates
    +-- Store aggregates with different metric names
        +-- tracking_speed_kmh (raw, 14d retention)
        +-- tracking_speed_kmh:5m_avg (downsampled, separate VM instance or longer retention)
```

### Downsampled Metric Naming

| Raw Metric | Downsampled Metric | Interval |
|-----------|-------------------|----------|
| `tracking_speed_kmh` | `tracking_speed_kmh:1m_avg` | 1-minute average |
| `tracking_speed_kmh` | `tracking_speed_kmh:1m_max` | 1-minute maximum |
| `tracking_fuel_level_percent` | `tracking_fuel_level_percent:1h_avg` | 1-hour average |
| `ivm26_vibration_g` | `ivm26_vibration_g:1s_rms` | 1-second RMS |

### PostgreSQL Data Lifecycle

```
PostgreSQL retention strategy:
|
+-- Table partitioning by time (for large tables)
|   +-- Partition monthly: trips_2025_01, trips_2025_02, ...
|   +-- Drop old partitions: DROP TABLE trips_2024_06;
|   +-- Faster than DELETE (no vacuum needed)
|
+-- Soft delete with periodic cleanup
|   +-- Mark rows with deleted_at timestamp
|   +-- Background job permanently deletes after grace period
|   +-- Grace period: 30-90 days
|
+-- Archive to separate table
|   +-- Move old completed records to {table}_archive
|   +-- Archive table has no indexes (storage only)
|   +-- Query archive only when explicitly requested
|
+-- Export before delete
    +-- Export to CSV/Parquet before dropping
    +-- Store in object storage (cheap, durable)
    +-- Maintain reference in export_audit_logs
```

### VictoriaLogs Retention

```
VictoriaLogs retention:
|
+-- Set globally with -retentionPeriod flag
|   +-- Applies to ALL log streams equally
|
+-- Strategy for mixed retention needs:
    |
    +-- Option 1: Single instance, longest retention
    |   +-- Simple but stores operational logs longer than needed
    |
    +-- Option 2: Multiple instances by retention tier
        +-- vlogs-operational (30d): device events, connection logs
        +-- vlogs-audit (3y): user actions, config changes, compliance
        +-- Application routes events to correct instance
```

---

## 4. Storage Cost Model

### The Math

```
Cost calculation for raw vs downsampled:
|
+-- 10,000 devices x 1 sample/sec x 10 metrics
|   = 100,000 samples/second
|   = 8.64 billion samples/day
|
+-- Raw (VictoriaMetrics, ~1.5 bytes/sample compressed):
|   = 12.96 GB/day
|   = 388.8 GB/month
|   = 4.7 TB/year
|
+-- Downsampled to 1-minute (60x reduction):
|   = 216 MB/day
|   = 6.5 GB/month
|   = 78 GB/year
|
+-- Downsampled to 1-hour (3600x reduction):
|   = 3.6 MB/day
|   = 108 MB/month
|   = 1.3 GB/year
|
+-- Savings: raw 14 days + 1-min 90 days + 1-hour 1 year
    = 181 GB + 19.5 GB + 1.3 GB = ~202 GB total
    vs raw 1 year = 4.7 TB
    = 95.7% storage reduction
```

### Cost Decision Tree

```
How long to keep raw data?
|
+-- Do users need second-level precision for debugging?
|   +-- YES --> 7-14 days raw
|   +-- NO --> 1-3 days raw (or skip raw, ingest at 1-min)
|
+-- Is there a regulatory requirement for raw data?
|   +-- YES --> Keep as required, archive to cold storage
|   +-- NO --> Downsample aggressively
|
+-- What is the budget for storage?
    +-- Limited --> 7 days raw, 30 days 1-min, 1 year 1-hour
    +-- Generous --> 30 days raw, 1 year 1-min, 5 years 1-hour
    +-- Unlimited --> Keep everything (rare, but possible)
```

---

## 5. Implementation Checklist

Before deploying, verify data lifecycle is configured:

```
Data lifecycle readiness:
|
+-- VictoriaMetrics
|   +-- [ ] -retentionPeriod flag set (not default infinite)
|   +-- [ ] Downsampling rules defined (if keeping data longer)
|   +-- [ ] Disk usage monitoring alert configured
|   +-- [ ] Cardinality check (no runaway label values)
|
+-- VictoriaLogs
|   +-- [ ] -retentionPeriod flag set
|   +-- [ ] Structured JSON format enforced
|   +-- [ ] Disk usage monitoring alert configured
|
+-- PostgreSQL
|   +-- [ ] Large tables partitioned by time (if applicable)
|   +-- [ ] Soft delete cleanup job scheduled
|   +-- [ ] Archive strategy defined for completed records
|   +-- [ ] Backup schedule configured
|
+-- Monitoring
    +-- [ ] Disk usage alerts (80% warning, 90% critical)
    +-- [ ] Ingestion rate monitoring (detect anomalies)
    +-- [ ] Query latency monitoring (detect degradation)
```

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| No retention policy | Storage grows unbounded, disk fills | Set `-retentionPeriod` from day one |
| No downsampling | Raw data consumes 95%+ of storage | Downsample within first week of raw data |
| Manual deletion | Error-prone, forgotten, inconsistent | Automate with retention flags and cron jobs |
| Same retention for all data types | Over-stores cheap data, under-stores valuable data | Different retention per data category |
| Deleting without archiving | Compliance violation, lost history | Export to cold storage before deletion |
| Over-retaining raw data "just in case" | Massive storage cost with no benefit | Define query patterns, retain only what is queried |
| No disk usage monitoring | Discover full disk at 3 AM | Alert at 80% usage |

---

> **Principle:** Data lifecycle is not an afterthought -- it is a day-one decision. Define retention periods, downsampling rules, and archive strategy before the first device sends its first sample. The cost difference between "keep everything forever" and "downsample intelligently" is 20x or more.
