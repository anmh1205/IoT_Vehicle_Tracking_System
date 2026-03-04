# VictoriaMetrics Patterns for IoT

> "VictoriaMetrics stores how things CHANGE over time. Every data point is a number at a moment. If it is not numeric and time-stamped, it does not belong here."

---

## 1. When to Use VictoriaMetrics

```
Is this data a VictoriaMetrics metric?
|
+-- Is it a numeric value? (temperature, speed, voltage, count)
|   +-- YES --> Continue
|   +-- NO --> Not a metric. Use VictoriaLogs or PostgreSQL.
|       +-- "device connected" --> VictoriaLogs (event)
|       +-- "device name" --> PostgreSQL (entity attribute)
|
+-- Does it change over time and you need the history?
|   +-- YES --> Continue
|   +-- NO --> PostgreSQL column is sufficient
|       +-- "device serial number" --> PostgreSQL (static)
|
+-- Will you query it by time range?
|   +-- YES --> VictoriaMetrics
|   |   +-- "speed over last 24 hours" --> metric
|   |   +-- "average temperature per hour" --> metric
|   +-- NO --> Probably PostgreSQL
|       +-- "current speed right now" --> PostgreSQL (cached latest)
```

---

## 2. Metric Naming Convention

### Format

```
{prefix}_{measurement}_{unit}
|
+-- prefix: project identifier (lowercase)
|   +-- tracking, ivm26, agromon
|
+-- measurement: what is being measured (snake_case)
|   +-- speed, temperature, fuel_level, battery_voltage
|
+-- unit: measurement unit (standard abbreviation)
    +-- kmh, celsius, percent, volts, rpm, meters, g
```

### Examples by Domain

| Domain | Metric Name | Description |
|--------|------------|-------------|
| **Vehicle Tracking** | `tracking_speed_kmh` | Vehicle speed in km/h |
| | `tracking_latitude` | GPS latitude (no unit suffix for coordinates) |
| | `tracking_longitude` | GPS longitude |
| | `tracking_fuel_level_percent` | Fuel tank percentage |
| | `tracking_engine_rpm` | Engine revolutions per minute |
| | `tracking_battery_voltage_volts` | Vehicle battery voltage |
| | `tracking_odometer_km` | Total distance traveled |
| | `tracking_coolant_temp_celsius` | Engine coolant temperature |
| **Vibration Monitoring** | `ivm26_vibration_g` | Vibration acceleration in g |
| | `ivm26_frequency_hz` | Dominant vibration frequency |
| | `ivm26_temperature_celsius` | Bearing temperature |
| **Smart Agriculture** | `agromon_soil_moisture_percent` | Soil moisture percentage |
| | `agromon_air_temperature_celsius` | Ambient temperature |
| | `agromon_rainfall_mm` | Rainfall in millimeters |

### Naming Rules

| Rule | Description |
|------|-------------|
| **Lowercase only** | `tracking_speed_kmh` not `Tracking_Speed_KMH` |
| **Snake_case** | `fuel_level` not `fuelLevel` or `fuel-level` |
| **Unit suffix** | Always include unit unless self-evident (lat/lng) |
| **No verbs** | `tracking_speed_kmh` not `tracking_measure_speed` |
| **Prefix always** | Prevents collision with other systems on same VM instance |

---

## 3. Label Strategy

Labels (also called tags) are key-value pairs attached to metrics for filtering and grouping.

### Standard Labels

| Label | Cardinality | Purpose |
|-------|-------------|---------|
| `device_id` | Medium (thousands) | Filter by specific device |
| `device_type` | Low (handful) | Group by device model |
| `customer_id` | Low (tens to hundreds) | Multi-tenant filtering |
| `region` | Low (handful) | Geographic grouping |

### Cardinality Rules

```
Label cardinality decision:
|
+-- How many unique values will this label have?
    |
    +-- 1-100 values --> Safe. Use as label.
    |   +-- device_type: "GPS_OBD2", "GPS_ONLY", "OBD2_ONLY"
    |   +-- customer_id: "CUST001" through "CUST050"
    |   +-- region: "North", "South", "East", "West"
    |
    +-- 100-10,000 values --> Caution. Only if frequently filtered.
    |   +-- device_id: Acceptable, most queries filter by device
    |   +-- vehicle_id: Acceptable if mapped 1:1 with device
    |
    +-- 10,000+ values --> NEVER use as label.
        +-- timestamp --> NEVER (use the metric timestamp)
        +-- message --> NEVER (use VictoriaLogs)
        +-- request_id --> NEVER (use VictoriaLogs)
        +-- user_agent --> NEVER (use VictoriaLogs)
```

**Why cardinality matters:** Every unique label combination creates a new time series. 10K devices x 5 device_types = 50K series (fine). 10K devices x 1M request_ids = 10 billion series (VictoriaMetrics crashes).

---

## 4. Write API

### Prometheus Text Format (Recommended)

```
Write endpoint: POST /api/v1/import/prometheus

Format: {metric_name}{labels} {value} {timestamp_ms}

Example payload (multiple metrics, one request):
tracking_speed_kmh{device_id="DEV001",device_type="GPS_OBD2"} 85.3 1705312325000
tracking_latitude{device_id="DEV001",device_type="GPS_OBD2"} 10.762 1705312325000
tracking_longitude{device_id="DEV001",device_type="GPS_OBD2"} 106.660 1705312325000
tracking_fuel_level_percent{device_id="DEV001",device_type="GPS_OBD2"} 62.1 1705312325000
```

### JSON Line Format (Alternative)

```
Write endpoint: POST /api/v1/import

Format: JSON lines (one JSON object per line)

{"metric":{"__name__":"tracking_speed_kmh","device_id":"DEV001"},"values":[85.3],"timestamps":[1705312325000]}
```

### Batch Writing Pattern

| Principle | Rule |
|-----------|------|
| **Batch, don't send one by one** | Collect metrics for 1-5 seconds, send in batch |
| **One request per device per interval** | Group all metrics from same device + timestamp |
| **Retry with backoff** | VictoriaMetrics may be temporarily unavailable |
| **Buffer in memory** | If VictoriaMetrics is down, buffer up to N seconds |

---

## 5. Query API (PromQL)

### Common Query Patterns

| Need | PromQL | Description |
|------|--------|-------------|
| **Last value** | `last_over_time(tracking_speed_kmh{device_id="DEV001"}[5m])` | Most recent speed in last 5 minutes |
| **Average** | `avg_over_time(tracking_speed_kmh{device_id="DEV001"}[1h])` | Average speed over 1 hour |
| **Maximum** | `max_over_time(tracking_speed_kmh{device_id="DEV001"}[24h])` | Peak speed in 24 hours |
| **Rate of change** | `rate(tracking_odometer_km{device_id="DEV001"}[1h])` | Distance rate (speed) from odometer |
| **Count online** | `count(tracking_device_online == 1)` | Number of online devices |
| **By customer** | `avg_over_time(tracking_speed_kmh{customer_id="CUST001"}[1h])` | Average speed for all devices of customer |
| **Threshold** | `tracking_speed_kmh > 120` | All devices currently exceeding 120 km/h |

### Query Endpoints

| Endpoint | Use Case |
|----------|----------|
| `/api/v1/query?query=...&time=...` | Instant query (single point in time) |
| `/api/v1/query_range?query=...&start=...&end=...&step=...` | Range query (time series chart) |
| `/api/v1/export?match[]=...` | Raw data export (all samples) |
| `/api/v1/labels` | List all label names |
| `/api/v1/label/{name}/values` | List values for a label |

### Step Selection for Range Queries

```
Choosing the step parameter:
|
+-- Dashboard real-time view (last 5 minutes)
|   +-- step=5s (high resolution)
|
+-- Last hour chart
|   +-- step=15s
|
+-- Last 24 hours chart
|   +-- step=1m (60-second resolution)
|
+-- Last 7 days chart
|   +-- step=5m
|
+-- Last 30 days chart
|   +-- step=1h
|
+-- Rule of thumb: aim for 200-500 data points per chart
    +-- step = (end - start) / 300
```

---

## 6. Retention Configuration

```
VictoriaMetrics retention:
|
+-- Start flag: -retentionPeriod=90d
|   +-- All data older than 90 days is automatically deleted
|
+-- Common retention periods:
    +-- Development: 7d (save disk space)
    +-- Production (small): 90d
    +-- Production (standard): 1y
    +-- Production (regulated): 3y-7y (with downsampling)
```

---

## 7. Metric vs Log Decision

```
New data point arrives. Metric or Log?
|
+-- Is it a number that you will aggregate? (sum, avg, max, rate)
|   +-- YES --> VictoriaMetrics metric
|   |   +-- speed: 85.3 --> avg_over_time, max_over_time
|   |   +-- temperature: 72.1 --> trend charts
|   |   +-- fuel_level: 62% --> rate of change
|   +-- NO --> Continue
|
+-- Is it a discrete event with a message?
|   +-- YES --> VictoriaLogs event
|   |   +-- "Device connected" --> event, not a number
|   |   +-- "Firmware update started" --> event with details
|   |   +-- "Geofence exit detected" --> event with context
|   +-- NO --> Continue
|
+-- Is it a boolean state? (online/offline, moving/stopped)
    +-- Use BOTH:
        +-- VictoriaMetrics: tracking_device_online{device_id="DEV001"} 1
        +-- VictoriaLogs: {"event_type":"device.connected","device_id":"DEV001"}
        +-- Metric for counting/graphing, event for searching/auditing
```

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| High-cardinality labels | Memory explosion, slow queries | Keep labels to device_id, type, customer |
| Storing events as metrics | Metrics are numeric, events have context | Use VictoriaLogs for events |
| No retention policy | Disk fills up, no cleanup | Set `-retentionPeriod` from day one |
| Querying without time bounds | Scans entire retention period | Always specify time range `[5m]`, `[1h]` |
| One HTTP request per metric | Network overhead, slow ingestion | Batch metrics per device per interval |
| Using metric name as data | `speed_85_kmh` instead of value 85.3 | Value goes in the metric, not the name |
| Timestamps in labels | Infinite cardinality | Use the metric's native timestamp |

---

> **Principle:** VictoriaMetrics answers one question brilliantly: "How did this number change over time?" If your data fits that pattern -- numeric, time-stamped, aggregatable -- it belongs in VictoriaMetrics. Everything else belongs elsewhere.
