# QoS and Error Handling

> Reliability is a spectrum. Choose the right level for each message type.

## QoS Level Selection

```
QoS 0 (at most once): Fire and forget
├── No acknowledgment from broker
├── Message may be lost
├── Lowest overhead, highest throughput
├── Use for:
│   ├── High-frequency sensor telemetry (every 1-5 seconds)
│   ├── Periodic GPS coordinates (redundant, next one comes soon)
│   └── Environmental readings (temperature, humidity)
└── Acceptable loss: yes (next reading corrects)

QoS 1 (at least once): Acknowledged delivery
├── Broker acknowledges receipt
├── Message delivered at least once (may duplicate)
├── Moderate overhead
├── Use for:
│   ├── Status changes (online/offline, battery low)
│   ├── Alert-triggering events (speeding, geofence breach)
│   ├── Error reports from device
│   └── Firmware update acknowledgments
└── Acceptable loss: no (but duplicates OK with idempotent handling)

QoS 2 (exactly once): Guaranteed single delivery
├── Four-step handshake (PUBLISH, PUBREC, PUBREL, PUBCOMP)
├── Highest overhead, lowest throughput
├── Use for:
│   ├── Command execution confirmations (rare)
│   ├── Billing/metering events (if applicable)
│   └── Almost never in IoT (overhead too high)
└── Avoid unless: exact-once semantics are business-critical
```

## Decision Matrix

| Message Type | QoS | Reason |
|-------------|-----|--------|
| GPS coordinates (periodic) | 0 | High frequency, next reading corrects |
| OBD2 sensor readings | 0 | Periodic, redundant |
| Device status change | 1 | Must not miss online/offline |
| Alert event | 1 | Must reach server for notification |
| Error report | 1 | Need for diagnostics |
| Firmware update trigger (command) | 1 | Must reach device |
| Firmware ACK | 1 | Must confirm completion |
| OTA binary chunk | 1 | Must not lose chunks |
| Billing event | 2 | Exact-once required (rare in IoT) |

## Dead Letter Handling

```
When a message cannot be processed:
│
├── Parse failure (invalid JSON, unknown format)
│   ├── Publish to: dead-letter/parse-error/{original_topic}
│   ├── Include: original payload, error message, timestamp
│   └── Do NOT retry (same payload will fail again)
│
├── Validation failure (missing fields, out-of-range values)
│   ├── Log to VictoriaLogs with device_id and error details
│   ├── Increment error counter metric
│   └── Do NOT retry (data is invalid)
│
└── Storage failure (database down, timeout)
    ├── Retry with exponential backoff (transient error)
    ├── Buffer in memory (short outage)
    ├── If persistent: log to local file, alert ops team
    └── Do NOT publish to dead letter (message is valid)
```

## Reconnection Strategy

```
Exponential backoff with jitter:
│
├── Base delay: 1 second
├── Multiplier: 2x each attempt
├── Max delay: 60 seconds
├── Jitter: random 0-500ms added to each delay
│
├── Attempt 1: 1s    + jitter
├── Attempt 2: 2s    + jitter
├── Attempt 3: 4s    + jitter
├── Attempt 4: 8s    + jitter
├── Attempt 5: 16s   + jitter
├── Attempt 6: 32s   + jitter
├── Attempt 7+: 60s  + jitter (capped)
│
└── Why jitter?
    ├── Prevents thundering herd (all clients reconnect at same instant)
    └── Distributes reconnection load on broker
```

## Message Deduplication

```
QoS 1 can deliver duplicates. How to handle?
│
├── Idempotent writes (preferred)
│   ├── VictoriaMetrics: same timestamp + same metric = overwrites (natural dedup)
│   ├── PostgreSQL: UPSERT on (device_id, timestamp) or use last_updated check
│   └── VictoriaLogs: duplicate events are acceptable (query by time range)
│
├── Message ID tracking (when idempotency is not possible)
│   ├── Store recent message IDs in memory (Set or LRU cache)
│   ├── Check before processing
│   ├── TTL: 5 minutes (messages older than this are not retries)
│   └── Trade-off: memory usage vs dedup accuracy
│
└── MQTT 5.0 properties
    ├── Message Expiry Interval: auto-expire old messages
    └── Not a dedup mechanism, but prevents processing stale messages
```

## Offline Buffer Strategy

```
When downstream storage is temporarily unavailable:
│
├── In-memory buffer
│   ├── Queue messages in memory
│   ├── Set max buffer size (e.g., 10,000 messages or 50MB)
│   ├── Flush when storage recovers
│   ├── Pro: fast, simple
│   └── Con: lost on bridge restart
│
├── Persistent queue (for critical data)
│   ├── Write to local file or embedded queue (SQLite, LevelDB)
│   ├── Survives bridge restart
│   ├── Pro: durable
│   └── Con: added complexity, disk I/O
│
└── Decision:
    ├── Telemetry data (lossy-tolerant) -> in-memory buffer, drop if full
    └── Critical events (alerts, status) -> persistent queue or retry
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| QoS 2 for everything | Massive overhead, 4x handshake per message | QoS 0 for telemetry, QoS 1 for events |
| No dead letter handling | Bad messages silently disappear or crash bridge | Dead letter topic + logging |
| No backoff on reconnect | Hammers broker, causes cascading failure | Exponential backoff with jitter |
| Ignoring duplicates | Double-counting metrics, duplicate alerts | Idempotent writes or message ID tracking |
| Unbounded buffer | Memory exhaustion when storage is down long | Set max buffer size, drop oldest or least critical |
| Sync error handling | One slow error blocks all message processing | Async error handling, non-blocking logging |
