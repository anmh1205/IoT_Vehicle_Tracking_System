# WebSocket Event Contract (Socket.IO)

> Hợp đồng sự kiện WebSocket giữa Backend và Frontend.
> Đây là **single source of truth** cho tất cả event names và payload schemas.
>
> ⚠️ **QUAN TRỌNG:** Frontend KHÔNG kết nối trực tiếp tới EMQX.
> Tất cả real-time data đi qua Socket.IO từ Backend.

---

## 1. Namespaces

| Namespace        | Auth Required        | Purpose                     |
| ---------------- | -------------------- | --------------------------- |
| `/dashboard`     | Yes (Session Token)  | Dashboard real-time updates |
| `/devices`       | Yes (Session Token)  | Device status + position    |
| `/firmware`      | Yes (Session Token)  | Firmware assignment updates |
| `/exports`       | Yes (Session Token)  | Export job completion        |
| `/notifications` | Yes (Session Token)  | Push notifications + alerts |

> ⚠️ **Auth dùng Session Token** (KHÔNG phải JWT Bearer). Token được extract theo thứ tự:
> `socket.handshake.auth.token` → `socket.handshake.query.token` → `Authorization: Bearer` header.
> Token được validate qua SHA-256 hash lookup trong bảng `user_sessions`.
>
> Các namespace `/mobile` và `/iot` là future work (Phase 6 và Phase 3).

---

## 2. Authentication

### 2.1 User Namespaces (Session Token)

```typescript
// Frontend connects with session token (NOT JWT)
const socket = io(`${SOCKET_URL}/devices`, {
  auth: (cb) => cb({ token: useAuthStore.getState().token }),
  reconnectionAttempts: Infinity,
  reconnectionDelayMax: 30000,
});
```

> **Backend middleware** (`socket-auth.middleware.ts`) extracts token theo thứ tự:
> 1. `socket.handshake.auth.token`
> 2. `socket.handshake.query.token`
> 3. `Authorization: Bearer <token>` header
>
> Token được hash SHA-256, lookup trong bảng `user_sessions`, rồi load user từ `users`.

### 2.2 IoT Namespace (Device Token)

```typescript
// Backend middleware validates device token
io.of('/iot').use(async (socket, next) => {
  const deviceToken = socket.handshake.auth.deviceToken;
  if (!deviceToken) return next(new Error('Device token required'));

  const device = await deviceService.validateDeviceToken(deviceToken);
  if (!device) return next(new Error('Invalid device token'));

  socket.data.deviceId = device.device_id;
  next();
});
```

---

## 3. Events: Server → Client

### 3.1 `/devices` Namespace

| Event Name          | Payload Schema                                                                                            | Description              |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------ |
| `device:status`     | `{ deviceId: string, status: 'running' \| 'stopped' \| 'disconnected', timestamp: string }`              | Device status changed    |
| `device:session`    | `{ deviceId: string, sessionId: number, action: 'start' \| 'end', timestamp: string }`                   | Session started/ended    |
| `device:position`   | `{ deviceId: string, lat: number, lon: number, speed: number, heading: number, timestamp: string }`      | Real-time position       |

### 3.2 `/dashboard` Namespace

| Event Name       | Payload Schema                                                                                       | Description            |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ---------------------- |
| `alert:new`      | `{ alertId: number, deviceId: string, vehicleId: string, type: string, value: number, threshold: number, timestamp: string }` | New alert triggered |
| `stats:update`   | `{ onlineDevices: number, totalAlerts: number, activeTrips: number, timestamp: string }`             | Dashboard stats update |
| `trip:update`    | `{ tripId: number, deviceId: string, status: 'active' \| 'completed', distance: number }`           | Trip status change     |

### 3.3 `/iot` Namespace

| Event Name             | Payload Schema                                                                                                | Description                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `telemetry:{deviceId}` | `{ deviceId: string, lat: number, lon: number, speed: number, rpm: number, fuel: number, timestamp: number }` | Telemetry data for device  |
| `command:ack`          | `{ deviceId: string, commandId: string, status: 'received' \| 'executed' \| 'failed', timestamp: string }`   | Command acknowledgement    |

### 3.4 `/firmware` Namespace

| Event Name          | Payload Schema                                                                       | Description             |
| ------------------- | ------------------------------------------------------------------------------------ | ----------------------- |
| `firmware:progress` | `{ deviceId: string, version: string, progress: number, status: string }`            | OTA update progress     |
| `firmware:complete` | `{ deviceId: string, version: string, success: boolean, message?: string }`          | OTA update completed    |

### 3.5 `/exports` Namespace

| Event Name       | Payload Schema                                                                    | Description          |
| ---------------- | --------------------------------------------------------------------------------- | -------------------- |
| `export:progress`| `{ exportId: string, progress: number, status: 'processing' \| 'complete' \| 'error' }` | Export job progress |
| `export:ready`   | `{ exportId: string, downloadUrl: string, expiresAt: string }`                   | Export file ready     |

### 3.6 `/notifications` Namespace

| Event Name            | Payload Schema                                                                      | Description          |
| --------------------- | ----------------------------------------------------------------------------------- | -------------------- |
| `notification:new`    | `{ id: number, type: string, title: string, message: string, timestamp: string }`  | New notification     |
| `notification:count`  | `{ unread: number }`                                                                | Unread count update  |

---

## 4. Events: Client → Server

### 4.1 `/devices` Namespace

| Event Name             | Payload Schema             | Description                    |
| ---------------------- | -------------------------- | ------------------------------ |
| `subscribe:device`     | `{ deviceId: string }`     | Subscribe to device updates    |
| `unsubscribe:device`   | `{ deviceId: string }`     | Unsubscribe from device        |
| `subscribe:positions`  | `{ deviceIds: string[] }`  | Subscribe to position updates  |

### 4.2 `/iot` Namespace

| Event Name       | Payload Schema                                        | Description                |
| ---------------- | ----------------------------------------------------- | -------------------------- |
| `command:send`   | `{ deviceId: string, command: string, params: object }` | Send command to device   |

### 4.3 `/notifications` Namespace

| Event Name              | Payload Schema          | Description               |
| ----------------------- | ----------------------- | ------------------------- |
| `notification:read`     | `{ id: number }`        | Mark notification as read |
| `notification:read-all` | `{}`                    | Mark all as read          |

---

## 5. Error Events (All Namespaces)

| Event Name       | Payload Schema                                               | Description        |
| ---------------- | ------------------------------------------------------------ | ------------------ |
| `error`          | `{ code: string, message: string, correlationId?: string }`  | Server-side error  |
| `connect_error`  | `{ message: string }`                                        | Connection error   |

### Error Codes

| Code                  | Description                          |
| --------------------- | ------------------------------------ |
| `UNAUTHORIZED`        | Invalid or expired auth token        |
| `FORBIDDEN`           | Insufficient permissions             |
| `DEVICE_NOT_FOUND`    | Device ID does not exist             |
| `RATE_LIMITED`        | Too many events                      |
| `INTERNAL_ERROR`      | Unexpected server error              |

---

## 6. Data Flow: MQTT → Socket.IO

```
IoT Device
    │
    │ MQTT: v1/{device_id}/rawdata
    ▼
EMQX Broker
    │
    ├──► Tracking_MqttBridge
    │       │
    │       ├── Write to VictoriaMetrics (time-series)
    │       ├── Write to VictoriaLogs (events)
    │       ├── Batch update PostgreSQL (device state)
    │       │
    │       └── Publish: internal/events/device/data
    │
    └──► (internal topic)
            │
            ▼
    Tracking_Backend (mqtt-event-listener.ts)
            │
            ├── Emit: /devices → device:status
            ├── Emit: /devices → device:position
            ├── Emit: /dashboard → alert:new
            ├── Emit: /dashboard → stats:update
            └── Emit: /iot → telemetry:{deviceId}
```

---

## 7. Frontend Integration Pattern

```typescript
// hooks/realtime/useDeviceRealtime.ts
export function useDeviceRealtime(deviceId: string) {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket('/devices');

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('subscribe:device', { deviceId });

    const handleStatus = (data: DeviceStatusEvent) => {
      queryClient.setQueryData(
        queryKeys.devices.detail(deviceId),
        (old: Device | undefined) => old ? { ...old, currentStatus: data.status } : old
      );
    };

    const handlePosition = (data: DevicePositionEvent) => {
      queryClient.setQueryData(
        queryKeys.devices.positions(),
        (old: DevicePosition[] | undefined) =>
          old?.map(p => p.deviceId === deviceId ? { ...p, ...data } : p)
      );
    };

    socket.on('device:status', handleStatus);
    socket.on('device:position', handlePosition);

    return () => {
      socket.emit('unsubscribe:device', { deviceId });
      socket.off('device:status', handleStatus);
      socket.off('device:position', handlePosition);
    };
  }, [socket, isConnected, deviceId, queryClient]);
}
```

> ⚠️ **Race Condition Prevention:** When WebSocket is connected, disable TanStack Query
> `refetchInterval` to avoid REST responses overwriting fresher WebSocket data.
> See `30-frontend-architecture.md` for implementation.

---

## 8. Backend Emit Pattern

> **Pattern:** Event Bus (Node.js EventEmitter) — KHÔNG dùng MQTT internal topics.
> Services gọi `publishEvent()` → Event Bus → Socket.IO broadcast tới frontend.

### 8.1 Event Bus (`infrastructure/realtime/event-bus.util.ts`)

```typescript
// 12 typed events trong RealtimeEventMap
import { publishEvent } from '@/infrastructure/realtime';

// Gọi từ các service:
publishEvent('device.status.changed', { device_id, status, last_seen_at });
publishEvent('device.position.updated', { device_id, lat, lon, speed, heading });
publishEvent('dashboard.alert.created', { id, vehicle_id, alert_type, severity, title });
publishEvent('firmware.assignment.updated', { firmware_id, device_ids, status });
```

### 8.2 Event Bridges (`infrastructure/realtime/socket-server.util.ts`)

```typescript
// Internal event → Socket.IO namespace + event name
const registerEventBridges = (server: TypedIOServer): void => {
  subscribeEvent('device.status.changed', (payload) => {
    server.of('/devices').emit('device:status', payload);
  });

  subscribeEvent('dashboard.alert.created', (payload) => {
    server.of('/dashboard').emit('alert:new', payload);
    server.of('/notifications').emit('alert:new', payload); // dual-emit
  });

  subscribeEvent('command.acknowledged', (payload) => {
    server.of('/devices').to(`device:${payload.device_id}`).emit('command:ack', payload); // room-scoped
  });
  // ... 13 bridges total
};
```

### 8.3 Full Event Bridge Map

```
Internal Event                  → Namespace        → Socket Event
─────────────────────────────────────────────────────────────────────
device.status.changed           → /devices         → device:status
device.position.updated         → /devices         → device:position
device.session.started          → /devices         → device:session_start
device.session.ended            → /devices         → device:session_end
command.acknowledged            → /devices (room)  → command:ack
dashboard.stats.updated         → /dashboard       → stats:update
dashboard.alert.created         → /dashboard       → alert:new
dashboard.alert.created         → /notifications   → alert:new (dual)
dashboard.activity.created      → /dashboard       → activity:new
geofence.entered                → /notifications   → geofence:enter
geofence.exited                 → /notifications   → geofence:exit
export.completed                → /exports         → export:ready
firmware.assignment.updated     → /firmware         → firmware:assignment
```

### 8.4 Device Room Handlers (`/devices` namespace)

```typescript
// Client join/leave device rooms cho scoped events (e.g. command:ack)
socket.emit('device:join', { deviceId: 'DEV001' });   // Join room device:DEV001
socket.emit('device:leave', { deviceId: 'DEV001' });  // Leave room
```

### 8.5 Socket.IO Server Config

```typescript
const server = new Server(httpServer, {
  cors: { origin, credentials: true },
  path: '/ws',
  transports: ['websocket', 'polling'],
  serveClient: false,
  pingTimeout: 60_000,
  pingInterval: 25_000,
  connectTimeout: 45_000,
});
```
