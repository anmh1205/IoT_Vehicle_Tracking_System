# Telemetry Processing

> Raw data is noise. Validated, normalized, and routed data is signal.

## Processing Pipeline

```
Raw MQTT message enters the system:
│
├── 1. Parse
│   ├── Select parser based on device_type or topic pattern
│   ├── Convert raw payload (JSON, binary, CSV) to structured object
│   ├── Extract: device_id, timestamp, location, sensor readings
│   └── If parse fails: send to dead letter topic, log error, skip
│
├── 2. Validate
│   ├── Required fields present? (device_id, timestamp)
│   ├── Latitude in range? (-90 to 90)
│   ├── Longitude in range? (-180 to 180)
│   ├── Speed reasonable? (0 to 300 km/h for vehicles)
│   ├── Timestamp not in future? Not too old? (e.g., < 24h)
│   ├── Sensor values within physical limits?
│   └── If validation fails: log warning, drop or flag message
│
├── 3. Normalize
│   ├── Map device-specific fields to common schema (NormalizedTelemetry)
│   ├── Convert units if needed (mph -> km/h, F -> C)
│   ├── Ensure consistent field names regardless of device brand
│   └── Attach metadata: received_at, parser_name, raw_topic
│
├── 4. Route to storage
│   ├── State data -> PostgreSQL
│   │   └── Update devices.last_seen_at, latest position, etc.
│   ├── Time-series metrics -> VictoriaMetrics
│   │   └── GPS coordinates, speed, fuel level, engine RPM
│   ├── Events -> VictoriaLogs
│   │   └── Ignition on/off, door open/close, error events
│   └── Each storage has independent write path (one failure does not block others)
│
├── 5. Check thresholds
│   ├── Compare values against configured thresholds
│   ├── Speed > max_speed? -> trigger overspeed alert
│   ├── Fuel < min_fuel? -> trigger low fuel alert
│   ├── Temperature > max_temp? -> trigger overheating alert
│   └── See rule-engine-concept.md for details
│
└── 6. Emit real-time events
    ├── Socket.IO: broadcast to dashboard subscribers
    ├── Event: "telemetry:update" with device_id, latest data
    ├── Event: "device:position" with lat/lng for map updates
    └── Emit only to rooms subscribed to this device or customer
```

## Parse Stage Details

```
Parser selection:
│
├── IDeviceParser interface
│   ├── canParse(topic, deviceType) -> boolean
│   ├── parse(topic, payload) -> NormalizedTelemetry
│   └── name: string (for logging/debugging)
│
├── Parser Registry
│   ├── Map of device_type -> parser instance
│   ├── Fallback: default JSON parser for unknown types
│   └── Adding new device: implement interface, register, done
│
└── Common parsers:
    ├── JSON Generic: standard key-value JSON payloads
    ├── Binary Protocol: packed bytes with header/checksum
    ├── Teltonika: GPS tracker-specific codec
    └── See iot-mqtt-pipeline/parser-strategy.md for full details
```

## Validate Stage Details

```
Validation rules (configurable per device_type):
│
├── Structural validation
│   ├── device_id: non-empty string
│   ├── timestamp: valid ISO date or Unix epoch
│   └── At least one data point (location or metric)
│
├── Range validation
│   ├── latitude: -90 to 90
│   ├── longitude: -180 to 180
│   ├── speed: 0 to MAX_SPEED (configurable, e.g., 300)
│   ├── altitude: -500 to 50000 (meters)
│   ├── heading: 0 to 360
│   ├── fuel_level: 0 to 100 (percentage)
│   └── temperature: -50 to 200 (Celsius, configurable)
│
├── Temporal validation
│   ├── Timestamp not in future (allow 5min clock skew)
│   ├── Timestamp not too old (configurable, e.g., 24h max)
│   └── Timestamps should be monotonically increasing per device
│
└── Deduplication
    ├── Same device_id + same timestamp = duplicate
    ├── Strategy: skip duplicate, keep first
    └── Implementation: in-memory LRU cache of recent message hashes
```

## Normalize Stage Details

```
NormalizedTelemetry schema:
│
├── deviceId: string
├── timestamp: Date (UTC)
├── location:
│   ├── latitude: number
│   ├── longitude: number
│   ├── altitude: number | null
│   ├── speed: number | null        # Always in km/h
│   ├── heading: number | null      # 0-360 degrees
│   └── satellites: number | null
├── metrics:
│   ├── Record<string, number>      # All numeric sensor readings
│   └── Examples: fuel_level, rpm, coolant_temp, battery_voltage
├── metadata:
│   ├── Record<string, string>      # Non-numeric context
│   └── Examples: firmware_version, ignition_state, door_status
├── receivedAt: Date                # When bridge received message
└── parserName: string              # Which parser processed this
```

## Route Stage Details

```
Where does each data type go?
│
├── PostgreSQL (relational state)
│   ├── devices.last_position_lat, last_position_lng
│   ├── devices.last_seen_at
│   ├── devices.current_speed (latest value)
│   └── Purpose: current state queries, API responses
│
├── VictoriaMetrics (time-series)
│   ├── vehicle_speed{device_id="X"} 85.5
│   ├── vehicle_fuel_level{device_id="X"} 72.3
│   ├── vehicle_latitude{device_id="X"} 21.0285
│   ├── vehicle_longitude{device_id="X"} 105.8542
│   └── Purpose: historical charts, trend analysis, reporting
│
└── VictoriaLogs (events)
    ├── { type: "ignition_on", device_id: "X", timestamp: "..." }
    ├── { type: "geofence_enter", device_id: "X", zone: "warehouse" }
    ├── { type: "overspeed", device_id: "X", speed: 120, limit: 80 }
    └── Purpose: event timeline, audit trail, alert history
```

## Processing Volume Decision

```
How to handle processing at scale?
│
├── Low volume (< 100 messages/second)
│   ├── Inline processing: parse/validate/store in MQTT message handler
│   ├── Direct database writes per message
│   ├── Simplest architecture
│   └── Good for: small fleet, prototype, MVP
│
├── Medium volume (100 - 1000 messages/second)
│   ├── Batch writes: buffer messages, flush every N seconds or N messages
│   ├── In-memory buffer with periodic flush to database
│   ├── Pro: reduces database write pressure
│   ├── Con: small data loss risk on crash (buffer not persisted)
│   └── Good for: production fleet, moderate scale
│
└── High volume (> 1000 messages/second)
    ├── Async processing: MQTT handler enqueues, workers process
    ├── Queue: Redis Streams, NATS JetStream, or Kafka
    ├── Multiple worker processes consuming from queue
    ├── Pro: horizontally scalable, back-pressure handling
    ├── Con: most complex, more infrastructure
    └── Good for: large fleet, multi-tenant platform
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| No validation (accept any data) | Bad data pollutes storage, breaks dashboards | Validate at ingestion boundary, reject invalid |
| No normalization | Downstream code handles every device format differently | Normalize to common schema at ingestion |
| Processing blocks MQTT handler | Slow processing causes message backlog | Async processing or batch writes |
| Single storage for everything | PostgreSQL becomes bottleneck for time-series at scale | Route to purpose-built database per data type |
| No dead letter handling | Parse errors silently dropped, cannot debug | Dead letter topic or table for failed messages |
| Emitting all data to all WebSocket clients | Bandwidth waste, privacy issue | Room-based emission, only to subscribed clients |
| No deduplication | Same reading stored multiple times | Hash-based dedup with LRU cache |
