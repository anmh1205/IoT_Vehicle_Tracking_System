# Session Tracking

> Know which devices are alive. React to disconnections, not discover them hours later.

## What is a Device Session?

```
A session is the period between MQTT CONNECT and DISCONNECT:
│
├── Session start: device connects to broker
│   ├── Record: device_id, connected_at, ip_address, client_info
│   └── Update: device status -> online
│
├── Session active: device publishes messages
│   ├── Update: last_seen_at on every message (or periodically)
│   └── Track: message count, bytes transferred (optional)
│
└── Session end: device disconnects
    ├── Record: disconnected_at, disconnect_reason
    ├── Calculate: session_duration = disconnected_at - connected_at
    └── Update: device status -> offline
```

## Online/Offline Detection Methods

```
How to detect device connectivity?
│
├── Method 1: Broker Events (recommended)
│   ├── EMQX fires: client.connected, client.disconnected
│   ├── Delivery: webhook to backend API or MQTT system topic
│   ├── Pro: real-time, authoritative, covers all disconnect types
│   ├── Con: requires broker configuration
│   └── Best for: production systems
│
├── Method 2: MQTT System Topics
│   ├── Subscribe to: $SYS/brokers/+/clients/+/connected
│   ├── Bridge subscribes to system topics
│   ├── Pro: no webhook setup needed
│   ├── Con: broker-specific topic format, may not cover all events
│   └── Best for: Mosquitto or brokers without webhook support
│
├── Method 3: MQTT Last Will and Testament (LWT)
│   ├── Device sets will message on CONNECT: "offline" on v1/{device_id}/status
│   ├── Broker publishes will message on unexpected disconnect
│   ├── Pro: standard MQTT feature, works with any broker
│   ├── Con: only fires on unexpected disconnect, not graceful disconnect
│   └── Best for: supplement to other methods
│
└── Method 4: Heartbeat Timeout (fallback)
    ├── Device publishes heartbeat every N minutes
    ├── Backend checks: no message for 2*N minutes -> mark offline
    ├── Pro: works without broker events
    ├── Con: delayed detection (up to 2*N minutes), requires cron/scheduler
    └── Best for: fallback when broker events unavailable
```

## Detection Method Decision

```
Which method to use?
│
├── EMQX broker with webhook support
│   └── Use: Broker Events (webhook) + LWT as supplement
│
├── Mosquitto or basic broker
│   └── Use: MQTT System Topics + LWT + Heartbeat Timeout
│
├── Cannot modify broker config
│   └── Use: Heartbeat Timeout (only option)
│
└── Production recommendation
    ├── Primary: Broker webhook (client.connected / client.disconnected)
    ├── Supplement: LWT for unexpected disconnects
    └── Fallback: Heartbeat timeout for missed events
```

## Last-Seen Tracking

```
Updating last_seen_at:
│
├── On every MQTT message? (simplest)
│   ├── Pro: most accurate last_seen
│   ├── Con: high database write frequency
│   └── Acceptable for: < 1000 devices
│
├── On periodic interval? (throttled)
│   ├── Update last_seen_at at most once per 60 seconds per device
│   ├── Use in-memory timestamp, flush to database periodically
│   ├── Pro: reduces database writes significantly
│   └── Best for: > 1000 devices
│
└── On session events only?
    ├── Update only on connect/disconnect
    ├── Pro: minimal writes
    ├── Con: last_seen reflects session, not last message
    └── Acceptable for: devices that connect/disconnect frequently
```

## Session History Data Model

```
device_sessions table:
├── id                  # Primary key
├── device_id           # FK to devices
├── connected_at        # Session start timestamp
├── disconnected_at     # Session end timestamp (null if still connected)
├── duration_seconds    # Computed or stored
├── ip_address          # Device IP at connection time
├── client_info         # MQTT client version, protocol version
├── disconnect_reason   # normal, keepalive_timeout, broker_restart, etc.
└── created_at          # Row creation timestamp
```

## Real-Time Status via WebSocket

```
Emitting connectivity events to frontend:
│
├── Device comes online
│   ├── Backend receives broker webhook
│   ├── Update device status in PostgreSQL
│   ├── Emit Socket.IO event: "device:online"
│   │   └── Payload: { deviceId, connectedAt, ipAddress }
│   └── Dashboard updates device card to green/online
│
├── Device goes offline
│   ├── Backend receives broker webhook
│   ├── Update device status, close session record
│   ├── Emit Socket.IO event: "device:offline"
│   │   └── Payload: { deviceId, disconnectedAt, reason, duration }
│   └── Dashboard updates device card to gray/offline
│
└── Dashboard queries
    ├── GET /api/v1/devices/status/summary -> { online: 42, offline: 8, total: 50 }
    ├── GET /api/v1/devices?status=online -> list of online devices
    └── Real-time updates via Socket.IO after initial load
```

## Dashboard Metrics

| Metric | Source | Purpose |
|--------|--------|---------|
| **Online count** | devices WHERE status = 'online' | Fleet health overview |
| **Offline count** | devices WHERE status = 'offline' | Identify problems |
| **Avg session duration** | AVG(duration_seconds) from device_sessions | Connection stability |
| **Reconnection frequency** | COUNT sessions per device per day | Detect flapping devices |
| **Last seen** | devices.last_seen_at | Identify stale devices |
| **Uptime percentage** | SUM(online_duration) / total_time | SLA monitoring |

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Polling device status on timer | Delayed detection, wasted resources | Use broker events or webhooks |
| No offline detection at all | Stale devices appear online forever | Implement at least heartbeat timeout |
| Updating last_seen on every message without throttle | Database write storm at scale | Throttle to once per 60s per device |
| No session history | Cannot diagnose connection problems | Store session records with connect/disconnect times |
| Only using LWT | Misses graceful disconnects | Combine LWT with broker events |
| Blocking webhook handler | Slow handler delays broker event processing | Process webhook asynchronously, return 200 immediately |
