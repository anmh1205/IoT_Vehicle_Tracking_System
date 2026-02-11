# Real-time Sync

> The frontend listens. It never speaks MQTT. Socket.IO is the bridge between IoT data and the user's screen.

---

## Architecture

```
Data flow (frontend perspective):
│
│  IoT Devices
│       │ MQTT
│       v
│  EMQX Broker
│       │
│       v
│  Tracking_MqttBridge (processes + stores)
│       │
│       v
│  Tracking_Backend (REST + Socket.IO server)
│       │
│       ├── REST API: TanStack Query fetches data
│       │
│       └── Socket.IO: pushes real-time events
│           │
│           v
│      Frontend (Socket.IO client)
│           │
│           ├── Low-frequency events --> invalidate TanStack Query
│           └── High-frequency events --> update Zustand store
```

## Why NOT MQTT in the Browser

```
MQTT.js in frontend (REJECTED):
│
├── Security
│   ├── Exposes MQTT broker to public internet
│   ├── Credentials visible in browser DevTools
│   ├── No session-based auth integration
│   └── ACL bypass risk
│
├── Complexity
│   ├── Browser MQTT libraries are heavy (~50KB)
│   ├── WebSocket MQTT requires separate port/config on broker
│   ├── Topic subscription management in frontend = mess
│   └── No room abstraction (broadcast everything)
│
├── Separation of concerns
│   ├── MQTT is an IoT protocol, not a UI protocol
│   ├── Frontend should not know MQTT topic structure
│   └── Backend transforms IoT data into UI-ready events
│
└── Socket.IO (CHOSEN):
    ├── Session auth on handshake (same as REST)
    ├── Room-based targeting (only relevant data)
    ├── Auto-reconnect with exponential backoff
    ├── Fallback to long-polling if WebSocket fails
    └── ~15KB client library
```

## Connection Lifecycle

```
Socket.IO client lifecycle:
│
├── User logs in successfully
│   └── Auth store receives token
│
├── Socket connection established
│   ├── Connect with auth token in handshake
│   │   io(BACKEND_URL, { auth: { token } })
│   ├── Backend validates token on handshake
│   ├── On success: socket connected
│   └── On failure: socket rejected, show error
│
├── Join relevant rooms
│   ├── Based on user's role and permissions
│   ├── socket.emit("join", { room: "customer:5" })
│   └── socket.emit("join", { room: "dashboard" })
│
├── Listen for events
│   ├── Register event handlers
│   ├── Each handler: invalidate query or update store
│   └── Handlers registered ONCE, not on every render
│
├── Reconnection handling
│   ├── Socket.IO auto-reconnects with backoff
│   ├── On reconnect: re-join rooms, re-sync state
│   ├── Show "Reconnecting..." indicator in header
│   └── On reconnect success: invalidate all active queries
│
└── User logs out
    ├── Disconnect socket
    ├── Clear auth store
    └── Clear all query caches
```

## Event Handling Strategy

```
When a socket event arrives:
│
├── Is this event high-frequency (> 1/second)?
│   ├── YES --> Update Zustand store directly
│   │   ├── GPS coordinates (map marker movement)
│   │   ├── Telemetry readings (live gauges)
│   │   └── No REST roundtrip (too expensive)
│   │
│   └── NO --> Invalidate TanStack Query
│       ├── device_status_changed --> invalidate ["devices"]
│       ├── alert_triggered --> invalidate ["alerts"]
│       ├── firmware_progress --> invalidate ["firmware", deviceId]
│       ├── export_completed --> invalidate ["exports"]
│       └── TanStack Query refetches from REST automatically
│
└── Special cases:
    ├── alert_triggered --> ALSO show toast notification
    ├── geofence_violation --> ALSO show toast + map highlight
    └── export_completed --> ALSO show download link in toast
```

## Connection State Indicator

```
Connection status UI (in header):
│
├── Connected:
│   ├── Green dot (subtle, not distracting)
│   └── Tooltip: "Real-time updates active"
│
├── Disconnected:
│   ├── Red dot
│   ├── Tooltip: "Real-time updates unavailable"
│   └── TanStack Query polling activates as fallback
│
├── Reconnecting:
│   ├── Yellow dot with pulse animation
│   └── Tooltip: "Reconnecting..."
│
└── Implementation:
    ├── Track state in Zustand or local state
    ├── socket.on("connect") --> connected
    ├── socket.on("disconnect") --> disconnected
    └── socket.on("reconnect_attempt") --> reconnecting
```

## Polling Fallback

```
When WebSocket is unavailable:
│
├── Detect disconnection
│   └── socket.on("disconnect") fires
│
├── Enable TanStack Query polling
│   ├── refetchInterval: 10_000 (10 seconds)
│   ├── Only on queries that need real-time data
│   ├── Dashboard stats, device list, alert count
│   └── refetchIntervalInBackground: false (save resources)
│
├── When WebSocket reconnects
│   ├── socket.on("connect") fires
│   ├── Disable polling (refetchInterval: false)
│   ├── Invalidate all active queries (fresh data)
│   └── Re-join rooms
│
└── Decision: Which queries get polling fallback?
    ├── Dashboard overview --> YES (must stay current)
    ├── Device status list --> YES (critical for monitoring)
    ├── Alert count badge --> YES (safety critical)
    ├── Vehicle detail page --> NO (user can refresh manually)
    └── Settings page --> NO (static data)
```

## Debounce and Batching

```
High-frequency update handling:
│
├── GPS coordinates (every 1-5 seconds per device):
│   ├── Throttle map marker updates to animation frames
│   ├── requestAnimationFrame for smooth map movement
│   └── Buffer in Zustand, render latest only
│
├── Telemetry readings (every 1-10 seconds):
│   ├── Batch updates: collect for 1 second, apply together
│   ├── Prevents rapid re-renders
│   └── Update chart data in batches, not per-point
│
├── Device status changes (sporadic):
│   ├── No debounce needed (infrequent)
│   └── Invalidate query immediately
│
└── Alert triggers (sporadic):
    ├── No debounce (safety-critical, show immediately)
    ├── Toast notification for each
    └── Invalidate alert list query
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| MQTT.js in browser | Security risk, heavy bundle, wrong abstraction | Socket.IO from backend |
| No reconnection handling | User stuck with stale data after disconnect | Socket.IO auto-reconnect + re-join rooms |
| No polling fallback | WebSocket failure = no updates at all | TanStack Query refetchInterval when disconnected |
| Registering listeners on every render | Memory leak, duplicate handlers | Register once in useEffect with cleanup |
| No connection state indicator | User does not know if data is live | Show connection status dot in header |
| Fetching via REST what Socket.IO already pushed | Redundant network calls | Invalidate query OR update store, not both |
| No debounce on high-frequency events | Excessive re-renders, dropped frames | Throttle to animation frame or batch per second |
