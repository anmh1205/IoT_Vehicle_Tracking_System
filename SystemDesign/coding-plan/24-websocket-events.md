# WebSocket Event Contract (Socket.IO)

> Hợp đồng sự kiện WebSocket giữa Backend và Frontend.
> Đây là **single source of truth** cho tất cả event names và payload schemas.
>
> ⚠️ **QUAN TRỌNG:** Frontend KHÔNG kết nối trực tiếp tới EMQX.
> Tất cả real-time data đi qua Socket.IO từ Backend.

---

## 1. Namespaces

| Namespace        | Auth Required    | Purpose                     |
| ---------------- | ---------------- | --------------------------- |
| `/dashboard`     | Yes (Bearer)     | Dashboard real-time updates |
| `/devices`       | Yes (Bearer)     | Device status changes       |
| `/firmware`      | Yes (Bearer)     | Firmware assignment updates |
| `/exports`       | Yes (Bearer)     | Export job progress         |
| `/notifications` | Yes (Bearer)     | Push notifications          |
| `/mobile`        | Yes (Bearer)     | Mobile app events           |
| `/iot`           | Yes (Device Token) | IoT device data stream (restricted) |

> ⚠️ **`/iot` namespace requires Device Token authentication**, NOT public access.
> Only authenticated devices can emit/receive on this namespace.

---

## 2. Authentication

### 2.1 User Namespaces (Bearer Token)

```typescript
// Frontend connects with fresh token on each connect/reconnect
const socket = io(`${SOCKET_URL}/devices`, {
  auth: (cb) => cb({ token: useAuthStore.getState().token }),
  reconnectionAttempts: Infinity,
  reconnectionDelayMax: 30000,
});
```

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

```typescript
// realtime/mqtt-event-listener.ts
import { Server } from 'socket.io';

export function setupMqttEventListener(io: Server, mqttClient: MqttClient): void {
  // Subscribe to internal events from MQTT Bridge
  mqttClient.subscribe('internal/events/#', { qos: 1 });

  mqttClient.on('message', (topic: string, payload: Buffer) => {
    let data: unknown;
    try {
      data = JSON.parse(payload.toString());
    } catch {
      logger.warn(`Malformed internal event on ${topic}`);
      return;
    }

    const [, , , type] = topic.split('/'); // internal/events/device/{type}

    switch (type) {
      case 'status':
        io.of('/devices').emit('device:status', data);
        break;
      case 'data':
        const { deviceId, ...telemetry } = data as TelemetryEvent;
        io.of('/devices').emit('device:position', data);
        io.of('/iot').emit(`telemetry:${deviceId}`, telemetry);
        break;
      case 'alert':
        io.of('/dashboard').emit('alert:new', data);
        break;
      case 'session':
        io.of('/devices').emit('device:session', data);
        break;
    }
  });
}
```
