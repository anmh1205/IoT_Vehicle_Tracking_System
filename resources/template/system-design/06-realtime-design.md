# Real-time Design

> Socket.IO và MQTT communication design

---

## 1. Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  REAL-TIME ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  IoT Devices ──────────▶ EMQX (MQTT) ──────▶ MQTT Bridge    │
│                                                   │          │
│                                                   ▼          │
│                                            Event Bus         │
│                                                   │          │
│                                                   ▼          │
│  Dashboard/Mobile ◀──── Socket.IO Server ◀───────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. MQTT Design

### 2.1 Topic Structure

```
# Device → Server (Publish)
v1/{device_id}/rawdata      # Sensor data
v1/{device_id}/status       # Status updates (online/offline)
v1/{device_id}/error        # Error reports
v1/{device_id}/firmware     # Firmware update status

# Server → Device (Subscribe by device)
v1/{device_id}/commands     # Commands from server
v1/{device_id}/config       # Configuration updates
v1/{device_id}/ota          # OTA firmware instructions
```

### 2.2 Payload Formats

#### Raw Data (Device → Server)

```json
{
  "device_id": "DEVICE_001",
  "auth_token": "device_auth_token",
  "timestamp": 1704067200000,
  "uptime": 3600,
  "data": {
    "sensor1": 25.5,
    "sensor2": 65.0,
    "battery": 4.15,
    "latitude": 21.0285,
    "longitude": 105.8542
  }
}
```

#### Status (Device → Server)

```json
{
  "device_id": "DEVICE_001",
  "status": "running",
  "session_id": 123,
  "timestamp": 1704067200000
}
```

#### Command (Server → Device)

```json
{
  "command": "update_config",
  "params": {
    "report_interval": 5000,
    "threshold": 30
  },
  "correlation_id": "cmd_123",
  "timestamp": 1704067200000
}
```

#### OTA Update (Server → Device)

```json
{
  "command": "ota_update",
  "version": "1.1.0",
  "url": "https://server/fw/1.1.0.bin",
  "sha256": "abc123...",
  "size": 1048576
}
```

### 2.3 QoS Levels

| Topic Type | QoS | Reason |
|------------|-----|--------|
| rawdata | 0 | High frequency, loss acceptable |
| status | 1 | Important, ensure delivery |
| error | 1 | Critical, ensure delivery |
| commands | 1 | Important, ensure delivery |
| ota | 2 | Critical, exactly once |

### 2.4 EMQX Configuration

```yaml
# Authentication
authentication:
  - mechanism: password_based
    backend: http
    method: post
    url: "http://backend:3000/api/v1/mqtt/auth"

# ACL
authorization:
  - type: http
    method: post
    url: "http://backend:3000/api/v1/mqtt/acl"
```

---

## 3. Socket.IO Design

### 3.1 Namespaces

```
/                       # Default (connection only)
├── /dashboard          # Dashboard updates
├── /devices            # Device-specific updates
├── /iot                # IoT data stream
└── /notifications      # User notifications
```

### 3.2 Events by Namespace

#### /dashboard

| Event | Direction | Description |
|-------|-----------|-------------|
| `stats.updated` | Server → Client | Dashboard stats changed |
| `activity.new` | Server → Client | New activity log entry |
| `alert.created` | Server → Client | New alert triggered |
| `alert.resolved` | Server → Client | Alert resolved |

#### /devices

| Event | Direction | Description |
|-------|-----------|-------------|
| `device.status.changed` | Server → Client | Device status changed |
| `device.data.received` | Server → Client | New sensor data |
| `device.location.updated` | Server → Client | Location updated (GPS) |
| `device.config.updated` | Server → Client | Config changed |
| `device.error.reported` | Server → Client | Error reported |

#### /iot

| Event | Direction | Description |
|-------|-----------|-------------|
| `sensor.data` | Server → Client | Real-time sensor data |
| `sensor.alert` | Server → Client | Sensor threshold alert |

#### /notifications

| Event | Direction | Description |
|-------|-----------|-------------|
| `notification.received` | Server → Client | New notification |
| `notification.read` | Client → Server | Mark as read |
| `notification.clear` | Client → Server | Clear notifications |

### 3.3 Event Payloads

#### device.status.changed

```typescript
{
  deviceId: "DEVICE_001",
  status: "running" | "stopped" | "disconnected",
  previousStatus: "stopped",
  timestamp: "2024-01-01T12:00:00Z"
}
```

#### device.data.received

```typescript
{
  deviceId: "DEVICE_001",
  timestamp: "2024-01-01T12:00:00Z",
  data: {
    sensor1: 25.5,
    sensor2: 65.0
  }
}
```

#### device.location.updated

```typescript
{
  deviceId: "DEVICE_001",
  latitude: 21.0285,
  longitude: 105.8542,
  speed: 60.5,
  timestamp: "2024-01-01T12:00:00Z"
}
```

#### alert.created

```typescript
{
  id: 123,
  deviceId: "DEVICE_001",
  deviceName: "Device A",
  type: "threshold_exceeded",
  severity: "warning",
  message: "Temperature exceeded 30°C",
  value: 32.5,
  threshold: 30,
  timestamp: "2024-01-01T12:00:00Z"
}
```

### 3.4 Room Strategy

```typescript
// User joins device-specific room
socket.join(`device:${deviceId}`);

// Broadcast to device room
io.to(`device:${deviceId}`).emit('device.data.received', data);

// User joins user-specific room (notifications)
socket.join(`user:${userId}`);

// Broadcast to all dashboard users
io.of('/dashboard').emit('stats.updated', stats);
```

### 3.5 Authentication

```typescript
// Client connection with auth
const socket = io('/devices', {
  auth: {
    token: 'jwt_token'
  }
});

// Server middleware
io.of('/devices').use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const user = verifyJWT(token);
    socket.data.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});
```

---

## 4. Event Bus (Internal)

### 4.1 Event Flow

```
MQTT Bridge
    │
    │ eventBus.emit('device.data.received', data)
    ▼
Event Bus (EventEmitter)
    │
    │ Multiple listeners
    ├──▶ Socket.IO Handler → Broadcast to clients
    ├──▶ Alert Handler → Check thresholds
    └──▶ Analytics Handler → Update stats
```

### 4.2 Event Types

```typescript
// Event types
type EventType =
  | 'device.status.changed'
  | 'device.data.received'
  | 'device.location.updated'
  | 'device.error.reported'
  | 'alert.created'
  | 'alert.resolved'
  | 'session.started'
  | 'session.ended';

// Event bus usage
eventBus.emit('device.data.received', {
  deviceId: 'DEVICE_001',
  timestamp: Date.now(),
  data: { ... }
});

eventBus.on('device.data.received', (data) => {
  // Handle event
});
```

---

## 5. Connection Management

### 5.1 MQTT Reconnection

```typescript
const client = mqtt.connect(brokerUrl, {
  reconnectPeriod: 5000,      // 5 seconds
  connectTimeout: 30000,      // 30 seconds
  clean: true,
  clientId: `bridge-${process.pid}`
});

client.on('reconnect', () => {
  logger.warn('MQTT reconnecting...');
});

client.on('offline', () => {
  logger.warn('MQTT offline');
});
```

### 5.2 Socket.IO Reconnection

```typescript
// Client
const socket = io(serverUrl, {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});

socket.on('reconnect', (attempt) => {
  console.log('Reconnected after', attempt, 'attempts');
});

socket.on('reconnect_failed', () => {
  console.log('Reconnection failed');
});
```

### 5.3 Heartbeat / Keep-alive

```typescript
// MQTT keep-alive (built-in)
{
  keepalive: 60  // seconds
}

// Socket.IO ping/pong (built-in)
{
  pingTimeout: 20000,
  pingInterval: 25000
}
```

---

## 6. Scaling Considerations

### 6.1 MQTT Shared Subscription

```
# Multiple bridge workers share load
$share/bridge-group/v1/+/rawdata
```

### 6.2 Socket.IO with Redis Adapter

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### 6.3 Sticky Sessions

```nginx
upstream backend {
    ip_hash;  # Sticky sessions
    server backend1:3000;
    server backend2:3000;
}
```

---

## 7. Monitoring

### 7.1 Metrics

```promql
# MQTT metrics
mqtt_messages_received_total{topic}
mqtt_messages_processed_total{status}
mqtt_processing_duration_seconds

# Socket.IO metrics
socketio_connections_current{namespace}
socketio_events_emitted_total{event}
socketio_events_received_total{event}
```

### 7.2 Health Checks

```typescript
// MQTT Bridge health
{
  "status": "healthy",
  "mqtt": "connected",
  "buffer_size": 15,
  "uptime": 86400
}

// Socket.IO health
{
  "status": "healthy",
  "connections": 150,
  "namespaces": {
    "/dashboard": 10,
    "/devices": 100,
    "/notifications": 40
  }
}
```
