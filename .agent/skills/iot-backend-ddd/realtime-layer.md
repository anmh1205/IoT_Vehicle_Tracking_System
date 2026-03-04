# Real-time Layer

> WebSocket pushes state changes. REST queries state. They complement, not compete.

## Technology Decision

```
Why Socket.IO over alternatives:
│
├── Raw WebSocket
│   ├── No auto-reconnect
│   ├── No room abstraction
│   └── Manual protocol design
│
├── MQTT in frontend (REJECTED)
│   ├── Exposes broker to public internet
│   ├── No session-based auth integration
│   ├── Browser MQTT libraries are heavy
│   └── Mixing concerns (IoT protocol in UI)
│
└── Socket.IO (CHOSEN)
    ├── Auto-reconnect with backoff
    ├── Room abstraction (join/leave by entity)
    ├── Namespace isolation
    ├── Middleware support (auth on handshake)
    └── Fallback to polling if WS fails
```

## Integration Point

```
src/infrastructure/realtime/
├── socket-server.ts        # Socket.IO server setup, attach to HTTP
├── socket-auth.ts          # Handshake authentication middleware
├── socket-events.ts        # Event handlers (join room, leave room)
└── socket-emitter.ts       # Emit helper (used by domain services)

Flow:
MQTT Broker → MqttBridge → Backend API → Socket.IO → Frontend
                                │
                                └── Domain services call socket-emitter
                                    to push updates to connected clients
```

## Event Naming Convention

```
Format: snake_case, past tense or present action
│
├── device_status_changed     # Device online/offline
├── telemetry_update          # New telemetry data point
├── alert_triggered           # Alert condition met
├── alert_acknowledged        # Alert resolved by user
├── firmware_progress         # OTA update progress
├── geofence_violation        # Vehicle entered/exited zone
├── trip_started              # Trip recording began
├── trip_ended                # Trip recording stopped
└── export_completed          # Export job finished
```

## Room Strategy

```
Room types:
│
├── device:{deviceId}         # Updates for specific device
│   └── Who joins: Dashboard viewing single device
│
├── customer:{customerId}     # Updates for all customer's devices
│   └── Who joins: Customer's dashboard overview
│
├── dashboard                 # Global stats, system-wide events
│   └── Who joins: Admin dashboard
│
├── alerts:{customerId}       # Alert notifications for customer
│   └── Who joins: Alert monitoring panel
│
└── export:{userId}           # Export job progress for specific user
    └── Who joins: User waiting for export
```

## Authentication on Connection

```
Handshake flow:
│
├── Client connects with auth token in handshake
│   socket = io("ws://backend:3000", {
│     auth: { token: sessionToken }
│   })
│
├── Socket.IO middleware validates token
│   ├── Extract token from socket.handshake.auth
│   ├── Verify session in database (same as REST auth)
│   ├── Attach user to socket.data.user
│   └── Reject connection if invalid
│
└── After auth, client can join rooms based on user's permissions
    ├── User with customerId=5 can join customer:5
    ├── Admin can join dashboard
    └── User cannot join another customer's room
```

## WebSocket vs REST Decision

```
Use WebSocket (Socket.IO) when:
├── Server needs to push to client without request
├── Data changes frequently (telemetry, device status)
├── Multiple clients need same update simultaneously
├── Progress updates (firmware OTA, export jobs)
└── Real-time notifications (alerts)

Use REST when:
├── Client initiates request for specific data
├── CRUD operations (create, update, delete)
├── One-time queries (reports, exports trigger)
├── Operations that need request/response confirmation
└── Data that does not change in real-time
```

## Broadcast vs Emit Decision

```
Broadcast to room:
├── Status change affects all viewers (device went offline)
├── New data point for shared dashboard
├── Alert triggered (all monitoring users see it)
└── Use: io.to("room:id").emit(event, data)

Emit to specific client:
├── Operation result for requesting user only
├── Export completed (only the user who triggered it)
├── Permission-specific data
└── Use: socket.emit(event, data)
```

## Frontend Sync Pattern

```
Socket.IO + TanStack Query coordination:
│
├── REST (TanStack Query): Source of truth for reads
│   ├── Initial data load
│   ├── Paginated lists
│   └── Detailed views
│
├── Socket.IO: Invalidation signal
│   ├── Receives "device_status_changed"
│   ├── Calls queryClient.invalidateQueries(["devices"])
│   ├── TanStack Query refetches fresh data from REST
│   └── UI updates automatically
│
└── Direct Socket.IO data: Only for high-frequency updates
    ├── Telemetry stream (too frequent for REST polling)
    ├── GPS coordinates (real-time map movement)
    └── Stored in Zustand, not TanStack Query cache
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| MQTT.js in browser | Exposes broker, no auth integration | Socket.IO from backend |
| No auth on WebSocket | Anyone can listen to data | Validate session on handshake |
| Sending full entity on every update | Bandwidth waste | Send delta or ID + let client refetch |
| One global room for everything | No isolation, permission leak | Room per entity or customer |
| Polling REST instead of WebSocket | Unnecessary load, delayed updates | Push via Socket.IO, invalidate cache |
| WebSocket for CRUD operations | Wrong tool, no request/response | REST for CRUD, WS for push |
