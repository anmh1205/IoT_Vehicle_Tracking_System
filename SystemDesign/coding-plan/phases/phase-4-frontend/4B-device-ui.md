# Sub-Phase 4B: Device UI

> **Context:** ~4KB | **Max Files:** 12 | **Est. Time:** 1 session

## Summary
Implement Device management UI: device list với filtering/pagination, device detail modal, device CRUD forms, và real-time status updates via WebSocket.

## Tasks
| ID     | Description           | Files                                             |
| ------ | --------------------- | ------------------------------------------------- |
| FE-010 | Device list page      | `app/(dashboard)/devices/page.tsx`                |
| FE-011 | Device list component | `components/devices/device-list.tsx`              |
| FE-012 | Device filters        | `components/devices/device-filters.tsx`           |
| FE-013 | Device detail modal   | `components/devices/device-detail-modal.tsx`      |
| FE-014 | Device CRUD forms     | `components/devices/device-form.tsx`              |
| FE-015 | Device API hooks      | `hooks/useDevices.ts`, `hooks/useDeviceDetail.ts` |
| FE-016 | Device real-time hook | `hooks/useDeviceRealtime.ts`                      |
| FE-017 | Device types          | `types/device.types.ts`                           |

## Backend API Contract (Input từ BE Phase 2B)
| Endpoint                        | Method | Description                 | Response                         |
| ------------------------------- | ------ | --------------------------- | -------------------------------- |
| `GET /api/v1/devices`           | GET    | List với pagination, filter | `{ data: Device[], pagination }` |
| `GET /api/v1/devices/:id`       | GET    | Chi tiết device + sessions  | `{ data: DeviceDetail }`         |
| `POST /api/v1/devices`          | POST   | Tạo device mới              | `{ data: Device }`               |
| `PUT /api/v1/devices/:id`       | PUT    | Update device               | `{ data: Device }`               |
| `DELETE /api/v1/devices/:id`    | DELETE | Xóa device                  | `{ success: true }`              |
| `GET /api/v1/devices/positions` | GET    | All device positions        | `{ data: Position[] }`           |

## Type Definitions (từ Backend)
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
}
```

## WebSocket Events (real-time updates)
```typescript
// Namespace: /devices
// Events to subscribe:
socket.on('device:status', (data: { deviceId: string; status: string; timestamp: string }) => {
  // Update device status in list
});

socket.on('device:session', (data: { deviceId: string; sessionId: number; action: 'start' | 'end' }) => {
  // Update session info
});

// Namespace: /iot
socket.on('telemetry:{deviceId}', (data: { lat: number; lon: number; speed: number; timestamp: number }) => {
  // Update position (khi viewing device detail)
});
```

## Real-time Hook Pattern
```typescript
// hooks/useDeviceRealtime.ts
export function useDeviceRealtime(deviceId: string | null) {
  const [status, setStatus] = useState<string | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  
  useEffect(() => {
    if (!deviceId) return;
    
    const socket = getSocket('/devices');
    socket.on('device:status', (data) => {
      if (data.deviceId === deviceId) setStatus(data.status);
    });
    
    // Subscribe to IoT namespace for telemetry
    const iotSocket = getSocket('/iot');
    iotSocket.emit('subscribe', { deviceId });
    iotSocket.on(`telemetry:${deviceId}`, setPosition);
    
    return () => {
      socket.off('device:status');
      iotSocket.emit('unsubscribe', { deviceId });
      iotSocket.off(`telemetry:${deviceId}`);
    };
  }, [deviceId]);
  
  return { status, position };
}
```

## Component Structure
```
components/devices/
├── device-list.tsx           # Table with sorting, pagination
├── device-filters.tsx        # Status filter, search
├── device-card.tsx           # Card view option
├── device-detail-modal.tsx   # Modal with tabs: Info, Sessions, Chart
├── device-form.tsx           # Create/Edit form
├── device-status-badge.tsx   # Status indicator
└── device-session-table.tsx  # Session history
```

## Dependencies
- ✅ Phase 4A done (Auth context, API client, layout)
- ✅ Phase 2B done (Device API available)
- ➡️ Phase 5A (Map/Geofence) sẽ dùng device positions

## Verification
- [ ] `npm run build` — no errors
- [ ] Device list: loads với pagination, filtering works
- [ ] Device detail modal: shows info, sessions
- [ ] Real-time: status changes update UI without refresh
- [ ] CRUD: create, update, delete devices

## Full Spec Reference
- [30-frontend-architecture.md](./../../30-frontend-architecture.md) — Frontend architecture
- [24-websocket-events.md](./../../24-websocket-events.md) — WebSocket event contract
