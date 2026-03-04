# Sub-Phase 2B: Device Module

> **Context:** ~4KB | **Max Files:** 10 | **Est. Time:** 1 session

## Summary
Implement device management module: CRUD operations, device list with filtering, device details with stats, device sessions history, và runtime analytics.

## Tasks
| ID     | Description                | Files                                                                             |
| ------ | -------------------------- | --------------------------------------------------------------------------------- |
| BE-010 | Device controller + routes | `api/controllers/device.controller.ts`, `api/routes/device.routes.ts`             |
| BE-011 | Device CRUD service        | `domain/device/services/device-crud.service.ts`                                   |
| BE-012 | Device list service        | `domain/device/services/device-list.service.ts`                                   |
| BE-013 | Device details service     | `domain/device/services/device-details.service.ts`                                |
| BE-014 | Device sessions service    | `domain/device/services/device-sessions.service.ts`                               |
| BE-015 | Device runtime service     | `domain/device/services/device-runtime.service.ts`                                |
| BE-016 | Device repositories        | `domain/device/repositories/device.repository.ts`, `device-session.repository.ts` |
| BE-017 | Device types + validators  | `domain/device/types/device.types.ts`, `api/validators/device.validator.ts`       |

## DB Schema (từ Phase 1A)
```sql
-- Tables cần dùng:
devices (
  id, device_id, device_name, auth_token, 
  current_status, last_seen_at, total_runtime_seconds,
  latitude, longitude, firmware_version, last_error_code, ...
)

device_sessions (
  id, device_id, status, 
  server_session_start, server_session_end,
  uptime, avg_vibration, min_vibration, max_vibration,
  data_points_count, ...
)

-- Key indexes:
idx_devices_device_id ON devices(device_id)
idx_devices_status ON devices(current_status)
idx_device_sessions_device_status ON device_sessions(device_id, status)
```

## API Contract (Output cho Frontend)
| Endpoint                           | Method | Description                 | Response                         |
| ---------------------------------- | ------ | --------------------------- | -------------------------------- |
| `GET /api/v1/devices`              | GET    | List với pagination, filter | `{ data: Device[], pagination }` |
| `GET /api/v1/devices/:id`          | GET    | Chi tiết device + stats     | `{ data: DeviceDetail }`         |
| `POST /api/v1/devices`             | POST   | Tạo device mới              | `{ data: Device }`               |
| `PUT /api/v1/devices/:id`          | PUT    | Update device               | `{ data: Device }`               |
| `DELETE /api/v1/devices/:id`       | DELETE | Xóa device                  | `{ success: true }`              |
| `GET /api/v1/devices/:id/sessions` | GET    | Session history             | `{ data: Session[] }`            |
| `GET /api/v1/devices/:id/runtime`  | GET    | Runtime analytics           | `{ data: RuntimeStats }`         |
| `GET /api/v1/devices/positions`    | GET    | All device positions        | `{ data: Position[] }`           |

## Response Types (cho Frontend)
```typescript
interface Device {
  id: number;
  deviceId: string;
  deviceName: string;
  currentStatus: 'running' | 'stopped' | 'disconnected';
  lastSeenAt: string | null;
  totalRuntimeSeconds: number;
  latitude: number | null;
  longitude: number | null;
  firmwareVersion: string | null;
  lastErrorCode: number;
}

interface DeviceDetail extends Device {
  imei: string | null;
  vibrationThreshold: number;
  requestInterval: number;
  config: Record<string, unknown>;
  currentSession: Session | null;
  recentSessions: Session[];
}

interface Session {
  id: number;
  status: 'running' | 'completed' | 'disconnected';
  serverSessionStart: string;
  serverSessionEnd: string | null;
  uptime: number | null;
  avgVibration: number | null;
  dataPointsCount: number;
}

interface Position {
  id: string;      // deviceId
  lat: number;
  lon: number;
  spd: number;     // speed
  ts: number;      // timestamp (epoch)
  s: string;       // status short
}
```

## WebSocket Events (cho Frontend real-time)
| Event                  | Payload                                 | Namespace  |
| ---------------------- | --------------------------------------- | ---------- |
| `device:status`        | `{ deviceId, status, timestamp }`       | `/devices` |
| `device:session`       | `{ deviceId, sessionId, action: 'start' | 'end' }`   | `/devices` |
| `telemetry:{deviceId}` | `{ lat, lon, speed, timestamp }`        | `/iot`     |

## Dependencies
- ✅ Phase 2A done (auth middleware required)
- ✅ Phase 1 done (devices, device_sessions tables)
- ➡️ Phase 2C (Support modules) cần device types
- ➡️ Phase 4B (FE Device UI) sẽ dùng API này

## Verification
- [ ] `npx tsc --noEmit 2>&1 | head -20` — no errors
- [ ] Device list API: `GET /api/v1/devices` returns paginated list
- [ ] Device detail API: `GET /api/v1/devices/:id` returns device with sessions
- [ ] Auth required: 401 without token

## Full Spec Reference
- [20-backend-architecture.md#section-3.2](./../../20-backend-architecture.md) — Device domain
- [21-backend-api-endpoints.md](./../../21-backend-api-endpoints.md) — API details
