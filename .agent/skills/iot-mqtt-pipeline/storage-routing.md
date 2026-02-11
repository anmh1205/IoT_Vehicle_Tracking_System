# Storage Routing

> Right data in the right database. Do not force one database to do everything.

## Three-Database Architecture

```
Why three databases?
│
├── PostgreSQL (relational)
│   ├── Current state: "Where is device X right now?"
│   ├── Relationships: devices belong to customers, drivers assigned to vehicles
│   ├── Configuration: alert rules, geofences, user preferences
│   ├── Transactions: ACID guarantees for business operations
│   └── Query pattern: point lookups, joins, CRUD
│
├── VictoriaMetrics (time-series)
│   ├── Historical metrics: "Show GPS trail for last 24 hours"
│   ├── Aggregation: "Average speed per hour last week"
│   ├── High write throughput: thousands of data points per second
│   ├── Efficient compression: 10x less storage than PostgreSQL for same data
│   └── Query pattern: time-range, aggregation, downsampling
│
└── VictoriaLogs (event logs)
    ├── Event history: "When did device connect/disconnect?"
    ├── Audit trail: "Who triggered firmware update?"
    ├── Error tracking: "What errors occurred in last hour?"
    ├── Full-text search: find events by keyword
    └── Query pattern: time-range + text search, event sequence
```

## Decision Matrix: What Goes Where?

| Question | Answer | Storage |
|----------|--------|---------|
| Need current state? | Yes | PostgreSQL |
| Need time-range aggregation? | Yes | VictoriaMetrics |
| Need event history/search? | Yes | VictoriaLogs |
| Need relationships/joins? | Yes | PostgreSQL |
| Need high write throughput? | Yes | VictoriaMetrics |
| Need full-text search on events? | Yes | VictoriaLogs |
| Need ACID transactions? | Yes | PostgreSQL |
| Data is a metric with timestamp? | Yes | VictoriaMetrics |
| Data is a discrete event? | Yes | VictoriaLogs |

## Concrete Routing Examples

```
GPS coordinate received:
├── VictoriaMetrics: store lat, lon, speed, heading with timestamp
├── PostgreSQL: update device.last_latitude, device.last_longitude
└── VictoriaLogs: (not stored, unless geofence triggered)

Device connected:
├── PostgreSQL: update device.status = 'online', device.last_seen = now()
└── VictoriaLogs: log connect event with IP, firmware version

OBD2 reading (fuel, RPM, temp):
├── VictoriaMetrics: store fuel_level, rpm, coolant_temp with timestamp
└── PostgreSQL: update device.last_fuel_level (if dashboard needs it)

Alert triggered (speeding):
├── PostgreSQL: INSERT into alerts table (needs joins to vehicle, driver)
└── VictoriaLogs: log alert event with context

Firmware update completed:
├── PostgreSQL: update device.firmware_version
└── VictoriaLogs: log firmware update event with old/new version
```

## Write Patterns

| Storage | Write Strategy | Why |
|---------|---------------|-----|
| **VictoriaMetrics** | Batch writes (buffer N points, flush every M seconds) | Much better throughput, fewer HTTP calls |
| **PostgreSQL** | Single writes (per state change) | State changes are infrequent, need immediate consistency |
| **VictoriaLogs** | Single or small batch | Events are discrete, moderate volume |

## Batch Write Design

```
VictoriaMetrics batch writer:
├── Buffer incoming data points in memory
├── Flush conditions (whichever comes first):
│   ├── Buffer reaches N points (e.g., 1000)
│   ├── Timer reaches M seconds (e.g., 5s)
│   └── Shutdown signal received
├── Write format: Prometheus exposition or JSON line protocol
├── On write failure:
│   ├── Retry with backoff
│   ├── If persistent failure, log and drop (time-series is lossy-tolerant)
│   └── Never block the message processing pipeline
└── Monitor: track buffer size, flush frequency, write latency
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Time-series in PostgreSQL | Table grows massive, slow queries, no downsampling | Use VictoriaMetrics for metrics |
| Current state in VictoriaMetrics | Cannot do point lookups efficiently | Use PostgreSQL for current state |
| No separation at all | One database does everything poorly | Route by data type and query pattern |
| Individual writes to VictoriaMetrics | High overhead per HTTP call | Batch writes with buffer and flush timer |
| Blocking on storage write | Slow storage blocks message processing | Async writes, buffer, timeout |
| No dual-write for state | Dashboard shows stale data | Update both PostgreSQL (state) and VictoriaMetrics (history) |
