# Three-Database Strategy

> "One database cannot serve three masters. Relational integrity, time-series throughput, and event search are fundamentally different workloads. Composable architecture uses the right tool for each."

---

## 1. The Composable Data Architecture

Every IoT system produces three kinds of data. Each kind has different access patterns, retention needs, and scale characteristics.

```
IoT Data Taxonomy
|
+-- Relational State (PostgreSQL)
|   |
|   +-- Entities with relationships
|   +-- Current status, configuration
|   +-- Transactional integrity required
|   +-- Query by relationships (JOINs)
|   +-- Examples: users, devices, vehicles, customers
|
+-- Time-Series Metrics (VictoriaMetrics)
|   |
|   +-- Numeric values over time
|   +-- Append-only, immutable
|   +-- Query by time range + aggregation
|   +-- High write throughput (thousands/sec)
|   +-- Examples: speed, temperature, GPS coordinates, fuel level
|
+-- Event Logs (VictoriaLogs)
    |
    +-- Discrete occurrences
    +-- Structured JSON with searchable fields
    +-- Query by field match + full-text search
    +-- Audit trail, debugging, compliance
    +-- Examples: device.connected, firmware.updated, alert.triggered
```

---

## 2. Decision Matrix

Use this matrix to route any data question to the correct database.

| Question | Database | Why |
|----------|----------|-----|
| "Current device status" | PostgreSQL | Need latest state, not history |
| "Temperature over last 24h" | VictoriaMetrics | Time-range query with aggregation |
| "When did device disconnect?" | VictoriaLogs | Event search by type and time |
| "Which devices belong to customer X?" | PostgreSQL | Relationship query (JOIN) |
| "Average speed per hour for vehicle Y" | VictoriaMetrics | Time-series aggregation |
| "Firmware update history" | VictoriaLogs | Audit trail, discrete events |
| "All vehicles with expired maintenance" | PostgreSQL | Relational filter on date column |
| "Battery voltage trend this week" | VictoriaMetrics | Numeric metric over time range |
| "Who changed the geofence settings?" | VictoriaLogs | Audit event search |
| "How many devices are online right now?" | PostgreSQL | Current state count |
| "Data throughput per device per day" | VictoriaMetrics | Rate calculation over time |
| "Error log for device ABC last hour" | VictoriaLogs | Filtered log search |

---

## 3. Decision Tree

```
You have new data to store. Where does it go?
|
+-- Is it an entity with relationships to other entities?
|   +-- YES --> PostgreSQL
|   |   +-- Does it change over time and need history?
|   |       +-- YES, numeric measurements --> VictoriaMetrics (for the history)
|   |       +-- YES, discrete state changes --> VictoriaLogs (for the events)
|   |       +-- NO --> PostgreSQL only
|   +-- NO --> Continue
|
+-- Is it a numeric measurement sampled at regular intervals?
|   +-- YES --> VictoriaMetrics
|   |   +-- Is the value also needed for real-time display?
|   |       +-- YES --> Also cache latest value in PostgreSQL
|   |       +-- NO --> VictoriaMetrics only
|   +-- NO --> Continue
|
+-- Is it a discrete event or state change?
|   +-- YES --> VictoriaLogs
|   |   +-- Is it countable and needs aggregation?
|   |       +-- YES --> Also emit a counter metric to VictoriaMetrics
|   |       +-- NO --> VictoriaLogs only
|   +-- NO --> Reconsider your data model
```

---

## 4. Why Not Just PostgreSQL?

PostgreSQL is excellent, but it fails at IoT scale for time-series data.

| Factor | PostgreSQL | VictoriaMetrics |
|--------|-----------|-----------------|
| **Write throughput** | ~5K rows/sec (tuned) | ~500K samples/sec |
| **Storage efficiency** | ~80 bytes/row (with indexes) | ~1.5 bytes/sample (compressed) |
| **Time-range queries** | Full table scan or partition scan | Native, optimized |
| **Retention** | Manual DELETE or partition drop | Built-in `-retentionPeriod` |
| **Downsampling** | Custom jobs, complex | Recording rules, native |
| **1M devices x 1 sample/sec** | 86B rows/day, dies | Handles natively |

**The math at IoT scale:**

```
10,000 devices x 1 reading/second x 10 metrics
= 100,000 samples/second
= 8.64 billion samples/day

PostgreSQL: 8.64B rows x 80 bytes = 691 GB/day (with indexes)
VictoriaMetrics: 8.64B samples x 1.5 bytes = 13 GB/day (compressed)

After 30 days:
PostgreSQL: 20.7 TB (unusable without sharding)
VictoriaMetrics: 390 GB (single node, queryable)
```

---

## 5. Why Not Just VictoriaMetrics?

VictoriaMetrics is purpose-built for metrics. It cannot do what PostgreSQL does.

| Feature | VictoriaMetrics | PostgreSQL |
|---------|----------------|-----------|
| **JOINs** | No | Yes |
| **Transactions** | No | Yes (ACID) |
| **Foreign keys** | No | Yes |
| **Complex filters** | Labels only | Full SQL WHERE |
| **Updates** | Immutable (append-only) | Full UPDATE/DELETE |
| **User management** | No | Roles, permissions |
| **Business logic** | None | Triggers, functions |

**VictoriaMetrics knows:** "Device DEV001 had speed 85.3 at 14:32:05"

**VictoriaMetrics does NOT know:** "DEV001 is a Toyota Hilux owned by Customer ABC, driven by John, assigned to the North Region fleet, with maintenance due in 500km"

---

## 6. Why VictoriaLogs Instead of PostgreSQL for Events?

| Factor | PostgreSQL (event table) | VictoriaLogs |
|--------|------------------------|-------------|
| **Storage** | Row overhead + indexes | Compressed log stream |
| **Full-text search** | Requires pg_trgm or FTS setup | Built-in LogsQL |
| **Write pattern** | INSERT with index maintenance | Append-only, no indexes to maintain |
| **Retention** | Manual partition management | Built-in retention period |
| **Query language** | SQL (verbose for log search) | LogsQL (purpose-built) |
| **Scale** | Slows with billions of rows | Designed for high-volume logs |

---

## 7. Data Flow Through Three Databases

```
IoT Device sends telemetry payload:
{
  "device_id": "DEV001",
  "timestamp": "2025-01-15T14:32:05Z",
  "speed": 85.3,
  "lat": 10.762,
  "lng": 106.660,
  "fuel_level": 62.1,
  "engine_rpm": 2400,
  "status": "moving"
}
|
+-- MQTT Bridge receives payload
    |
    +-- Extract metrics --> VictoriaMetrics
    |   tracking_speed_kmh{device_id="DEV001"} 85.3
    |   tracking_latitude{device_id="DEV001"} 10.762
    |   tracking_longitude{device_id="DEV001"} 106.660
    |   tracking_fuel_level_percent{device_id="DEV001"} 62.1
    |   tracking_engine_rpm{device_id="DEV001"} 2400
    |
    +-- Update current state --> PostgreSQL
    |   UPDATE devices SET
    |     last_latitude = 10.762,
    |     last_longitude = 106.660,
    |     last_speed = 85.3,
    |     last_seen_at = '2025-01-15T14:32:05Z'
    |   WHERE device_id = 'DEV001';
    |
    +-- Log events (if applicable) --> VictoriaLogs
        {"event_type": "speed.threshold_exceeded",
         "device_id": "DEV001", "speed": 85.3, "limit": 80}
```

---

## 8. Dual-Write Pattern

Some data legitimately belongs in two databases. This is intentional, not duplication.

| Data | PostgreSQL (current state) | VictoriaMetrics (history) |
|------|---------------------------|---------------------------|
| **Device position** | `devices.last_latitude/longitude` | `tracking_latitude{device_id}` |
| **Device speed** | `devices.last_speed` | `tracking_speed_kmh{device_id}` |
| **Connection status** | `devices.is_online` | `tracking_device_online{device_id}` |
| **Fuel level** | `vehicles.current_fuel_level` | `tracking_fuel_level_percent{device_id}` |

**Why dual-write?**
- PostgreSQL: "Show me all online devices on the map RIGHT NOW" (single query, no time-series scan)
- VictoriaMetrics: "Show me this device's position trail for the last 2 hours" (time-range query)

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| All telemetry in PostgreSQL | Storage explosion, slow queries | Route metrics to VictoriaMetrics |
| Device relationships in VictoriaMetrics | Cannot JOIN, cannot query by owner | Keep relationships in PostgreSQL |
| Unstructured logs in PostgreSQL TEXT column | Cannot search efficiently | Use VictoriaLogs with structured JSON |
| No dual-write for current state | Dashboard requires time-series scan for "current" | Cache latest values in PostgreSQL |
| Single database "to keep it simple" | Becomes the bottleneck at scale | Composable architecture from day one |
| Storing events as metrics | Metrics are numeric, events are not | Events go to VictoriaLogs |

---

> **Principle:** The three-database strategy is not about complexity -- it is about using each tool where it excels. PostgreSQL manages relationships, VictoriaMetrics handles throughput, VictoriaLogs enables search. Together they form a composable data architecture that scales with IoT workloads.
