# VictoriaLogs Patterns for IoT

> "VictoriaLogs stores what HAPPENED and WHEN. Every entry is an event -- a discrete occurrence with context. If you need to search 'when did X happen?' or 'what events occurred for device Y?', VictoriaLogs is the answer."

---

## 1. When to Use VictoriaLogs

```
Is this data a VictoriaLogs event?
|
+-- Is it a discrete occurrence? (something happened at a point in time)
|   +-- YES --> Continue
|   +-- NO --> Not an event
|       +-- "speed is 85 km/h" --> VictoriaMetrics (continuous measurement)
|       +-- "device name is Truck-01" --> PostgreSQL (entity attribute)
|
+-- Does it have context beyond a number? (message, details, actor)
|   +-- YES --> VictoriaLogs
|   |   +-- "User admin updated geofence North-Zone at 14:32"
|   |   +-- "Device DEV001 disconnected after 3h45m uptime"
|   |   +-- "Firmware v2.1.3 deployed to 45 devices by operator John"
|   +-- NO --> Probably a metric
|       +-- "Temperature: 72.1" --> VictoriaMetrics
|
+-- Will you search it by content or filter fields?
    +-- YES --> VictoriaLogs
    +-- NO --> Reconsider if you need to store it at all
```

---

## 2. Structured Logging Format

All log events MUST be structured JSON. Never store free-text log lines.

### Standard Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_time` | ISO 8601 | Yes | Event timestamp (VictoriaLogs reserved field) |
| `_msg` | string | Yes | Human-readable event description |
| `level` | string | No | Log level: info, warn, error, debug |
| `event_type` | string | Yes | Machine-readable event classification |
| `device_id` | string | Conditional | Device that triggered the event |
| `user_id` | string | Conditional | User that triggered the event |
| `customer_id` | string | Conditional | Tenant context |
| `request_id` | string | No | Correlation ID for distributed tracing |
| `service` | string | Yes | Originating service name |
| `source` | string | No | Subsystem or module within service |

### Field Rules

```
Field naming decision:
|
+-- Is it a VictoriaLogs reserved field?
|   +-- _time, _msg, _stream --> Use as-is (prefixed with underscore)
|
+-- Is it a standard field used across all events?
|   +-- event_type, device_id, level, service --> snake_case, consistent
|
+-- Is it event-specific context?
    +-- Add to the JSON body with descriptive snake_case names
    +-- firmware_version, old_status, new_status, threshold_value
```

---

## 3. Event Type Taxonomy

### Naming Convention

```
{domain}.{action}
|
+-- domain: the business entity or system area
+-- action: past tense verb describing what happened
|
+-- Examples:
    +-- device.connected
    +-- device.disconnected
    +-- device.registered
    +-- firmware.deployed
    +-- firmware.update_failed
    +-- alert.triggered
    +-- alert.acknowledged
    +-- user.login
    +-- user.logout
    +-- geofence.entered
    +-- geofence.exited
    +-- trip.started
    +-- trip.ended
    +-- system.started
    +-- system.error
```

### Event Type Categories

| Category | Event Types | Description |
|----------|------------|-------------|
| **Device Lifecycle** | `device.connected`, `device.disconnected`, `device.registered`, `device.deregistered` | Device state transitions |
| **Firmware** | `firmware.deployed`, `firmware.update_started`, `firmware.update_completed`, `firmware.update_failed` | OTA update events |
| **Alerts** | `alert.triggered`, `alert.acknowledged`, `alert.resolved`, `alert.escalated` | Alert lifecycle |
| **User Actions** | `user.login`, `user.logout`, `user.created`, `user.role_changed` | Auth and user management |
| **Data Operations** | `export.started`, `export.completed`, `export.failed` | Data export events |
| **Geofence** | `geofence.entered`, `geofence.exited`, `geofence.created`, `geofence.modified` | Geographic boundary events |
| **System** | `system.started`, `system.stopped`, `system.error`, `system.config_changed` | Infrastructure events |

---

## 4. Write API

### Endpoint

```
POST /insert/jsonline

Content-Type: application/stream+json

Each line is one JSON object. No array wrapper, no commas between lines.
```

### Example Payloads

**Device connection event:**
```
{"_time":"2025-01-15T14:32:05Z","_msg":"Device DEV001 connected from 192.168.1.100","level":"info","event_type":"device.connected","device_id":"DEV001","device_type":"GPS_OBD2","customer_id":"CUST001","service":"mqtt-bridge","ip_address":"192.168.1.100","protocol":"mqtt5"}
```

**Alert triggered event:**
```
{"_time":"2025-01-15T14:32:10Z","_msg":"Speed alert: DEV001 at 135 km/h exceeds limit 120 km/h","level":"warn","event_type":"alert.triggered","device_id":"DEV001","customer_id":"CUST001","service":"backend","alert_type":"speed_threshold","current_value":135,"threshold_value":120,"unit":"kmh"}
```

**Firmware update event:**
```
{"_time":"2025-01-15T14:32:15Z","_msg":"Firmware v2.1.3 deployed to DEV001 by admin","level":"info","event_type":"firmware.deployed","device_id":"DEV001","service":"backend","firmware_version":"2.1.3","deployed_by":"admin","previous_version":"2.1.2"}
```

### Batch Writing Pattern

| Principle | Rule |
|-----------|------|
| **Batch multiple events** | Collect events, send as multi-line body |
| **Newline-delimited** | One JSON object per line, newline separator |
| **No wrapping array** | NOT `[{...}, {...}]` -- just `{...}\n{...}\n` |
| **Flush interval** | Buffer for 1-5 seconds, then flush |
| **Include all context** | Each event is self-contained (no references to other events) |

---

## 5. Query API (LogsQL)

### Endpoint

```
GET /select/logsql/query?query=...&start=...&end=...&limit=...
```

### Common Query Patterns

| Need | LogsQL Query |
|------|-------------|
| **By device** | `device_id:exact("DEV001")` |
| **By event type** | `event_type:exact("device.connected")` |
| **By level** | `level:exact("error")` |
| **By time range** | `_time:[2025-01-15, 2025-01-16]` |
| **Full-text search** | `_msg:*firmware*` |
| **Combined filters** | `device_id:exact("DEV001") AND event_type:exact("alert.triggered")` |
| **By service** | `service:exact("mqtt-bridge")` |
| **Error search** | `level:exact("error") AND service:exact("backend")` |
| **By customer** | `customer_id:exact("CUST001") AND event_type:exact("device.disconnected")` |
| **Correlation** | `request_id:exact("req-abc-123")` |

### Query Construction Decision

```
Building a LogsQL query:
|
+-- Start with the most selective filter
|   +-- device_id or event_type (narrows results most)
|
+-- Add time range
|   +-- _time:[start, end]
|   +-- Always include time bounds (prevents full scan)
|
+-- Add additional filters
|   +-- level, service, customer_id
|
+-- Add text search last (most expensive)
    +-- _msg:*keyword*
```

---

## 6. Streams

VictoriaLogs organizes data into streams. A stream is defined by a set of constant fields.

### Stream Strategy for IoT

```
Stream selection:
|
+-- What fields are constant for a group of logs?
|   +-- service name (all logs from backend share "service":"backend")
|   +-- device_type (all GPS_OBD2 devices share this label)
|
+-- Recommended stream fields:
    +-- _stream:{service="mqtt-bridge"}
    +-- _stream:{service="backend"}
    +-- _stream:{service="frontend"}
    +-- Each service gets its own stream
    +-- Do NOT use device_id as stream field (too many streams)
```

---

## 7. Retention Strategy

```
VictoriaLogs retention decision:
|
+-- Event type determines retention
    |
    +-- Operational events (device.connected, device.disconnected)
    |   +-- 30-90 days (debugging, monitoring)
    |
    +-- Audit events (user.login, config.changed, firmware.deployed)
    |   +-- 1-7 years (compliance, legal)
    |
    +-- Error events (system.error, firmware.update_failed)
    |   +-- 90-365 days (post-mortem analysis)
    |
    +-- VictoriaLogs retention is set globally
    |   +-- Set to the LONGEST required period
    |   +-- Or use separate VictoriaLogs instances for different retention
    |
    +-- Events are cheaper to store than metrics
        +-- A single event: ~200-500 bytes
        +-- A single metric sample: ~1.5 bytes but millions per second
        +-- Keep events longer than raw metrics
```

---

## 8. Event vs Metric Decision (Detailed)

| Signal | Metric (VictoriaMetrics) | Event (VictoriaLogs) |
|--------|------------------------|---------------------|
| "Speed is 85 km/h" | YES (numeric, continuous) | NO |
| "Device connected" | Counter: YES (increment) | Detail: YES (with context) |
| "Firmware updated to v2.1.3" | NO | YES (discrete, contextual) |
| "Temperature exceeded 80C" | The value: YES | The alert event: YES |
| "User logged in" | Login count: YES | Login detail: YES |
| "Geofence entered" | Entry count: YES | Entry detail: YES |
| "System error occurred" | Error count: YES | Error detail: YES |

**Pattern for state changes:** Many state changes produce BOTH a metric and an event.

```
Device goes offline:
|
+-- VictoriaMetrics: tracking_device_online{device_id="DEV001"} 0
|   +-- For: dashboards, counting, alerting on metric thresholds
|
+-- VictoriaLogs: {"event_type":"device.disconnected","device_id":"DEV001",
|                   "uptime_seconds":13500,"last_ip":"192.168.1.100",
|                   "disconnect_reason":"timeout"}
    +-- For: searching, debugging, audit trail, rich context
```

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Unstructured log lines | Cannot filter or search reliably | Always use structured JSON |
| Missing `event_type` field | Cannot classify or filter events | Every event gets an event_type |
| Logging metrics as events | Generates millions of events per day | Numeric measurements go to VictoriaMetrics |
| No `_time` field | VictoriaLogs uses ingestion time (inaccurate) | Always set `_time` explicitly |
| device_id as stream field | Creates thousands of streams | Use service name as stream |
| No time bounds on queries | Full-scan across entire retention | Always include `_time` range |
| Free-text `_msg` only | No machine-readable classification | Add `event_type` + structured fields |
| Logging every telemetry point | Duplicates VictoriaMetrics data | Log only events and state changes |

---

> **Principle:** VictoriaLogs is the searchable audit trail for your IoT system. Every event answers "what happened, when, to what, and by whom." Structure events consistently, classify them with event_type, and always include enough context to understand the event without looking elsewhere.
