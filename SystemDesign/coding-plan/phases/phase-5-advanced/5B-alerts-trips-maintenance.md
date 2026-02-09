# Sub-Phase 5B: Alerts, Trips & Maintenance UI

> **Context:** ~4KB | **Max Files:** 12 | **Est. Time:** 1 session

## Summary
Implement Alert management, Trip tracking with replay, và Maintenance scheduling pages.

## Tasks
| ID     | Description            | Files                                                     |
| ------ | ---------------------- | --------------------------------------------------------- |
| FE-040 | Alerts page            | `app/(dashboard)/alerts/page.tsx`                         |
| FE-041 | Alert list + filters   | `components/alerts/alert-list.tsx`, `alert-filters.tsx`   |
| FE-042 | Alert detail modal     | `components/alerts/alert-detail-modal.tsx`                |
| FE-043 | Trips page             | `app/(dashboard)/trips/page.tsx`                          |
| FE-044 | Trip list + detail     | `components/trips/trip-list.tsx`, `trip-detail.tsx`       |
| FE-045 | Trip replay            | `components/trips/trip-replay.tsx`                        |
| FE-046 | Maintenance page       | `app/(dashboard)/maintenance/page.tsx`                    |
| FE-047 | Maintenance calendar   | `components/maintenance/maintenance-calendar.tsx`         |
| FE-048 | Vehicle/Customer pages | `app/(dashboard)/vehicles/page.tsx`, `customers/page.tsx` |

## Backend API Contract (Input từ BE Phase 2E)
### Alerts
| Endpoint                             | Method | Response                        |
| ------------------------------------ | ------ | ------------------------------- |
| `GET /api/v1/alerts`                 | GET    | `{ data: Alert[], pagination }` |
| `GET /api/v1/alerts/:id`             | GET    | `{ data: AlertDetail }`         |
| `PUT /api/v1/alerts/:id/acknowledge` | PUT    | Acknowledge alert               |
| `PUT /api/v1/alerts/:id/resolve`     | PUT    | Resolve alert                   |

### Trips
| Endpoint                          | Method | Response                         |
| --------------------------------- | ------ | -------------------------------- |
| `GET /api/v1/trips`               | GET    | `{ data: Trip[], pagination }`   |
| `GET /api/v1/trips/:id`           | GET    | `{ data: TripDetail }`           |
| `GET /api/v1/trips/:id/telemetry` | GET    | `{ tripId, points[], events[] }` |

### Maintenance
| Endpoint                      | Method | Response                              |
| ----------------------------- | ------ | ------------------------------------- |
| `GET /api/v1/maintenance`     | GET    | `{ data: Maintenance[], pagination }` |
| `POST /api/v1/maintenance`    | POST   | `{ data: Maintenance }`               |
| `PUT /api/v1/maintenance/:id` | PUT    | `{ data: Maintenance }`               |

## Type Definitions
```typescript
interface Alert {
  id: number;
  vehicleId: string;
  deviceId: string;
  alertType: 'speeding' | 'geofence_enter' | 'geofence_exit' | 'harsh_braking' | 'idle_too_long' | 'low_battery' | 'device_offline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  title: string;
  message: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

interface Trip {
  id: number;
  tripCode: string;
  vehicleId: string;
  driverName: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startLocation: string;
  endLocation: string;
  distanceKm: number;
  plannedStart: string;
  actualStart?: string;
  actualEnd?: string;
}

interface TripTelemetry {
  tripId: number;
  points: Array<{
    ts: number;
    lat: number;
    lon: number;
    spd: number;
    fuel?: number;
  }>;
  events: Array<{
    ts: number;
    type: string;
    lat: number;
    lon: number;
  }>;
}

interface Maintenance {
  id: number;
  vehicleId: string;
  maintenanceType: 'oil_change' | 'tire_rotation' | 'brake_service' | 'engine_service' | 'inspection' | 'other';
  title: string;
  scheduledDate: string;
  completedDate?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  cost?: number;
  notes?: string;
}
```

## WebSocket Events
```typescript
// Namespace: /dashboard
socket.on('alert:new', (alert: Alert) => {
  // Add to alert list, show notification
});

socket.on('alert:updated', (data: { alertId: number; status: string }) => {
  // Update alert status in list
});
```

## Trip Replay Component
```typescript
// components/trips/trip-replay.tsx
function TripReplay({ tripId }: { tripId: number }) {
  const { data: telemetry } = useQuery(['trip-telemetry', tripId], () => fetchTripTelemetry(tripId));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Playback controls
  useEffect(() => {
    if (!isPlaying || !telemetry) return;
    const interval = setInterval(() => {
      setCurrentIndex(i => Math.min(i + 1, telemetry.points.length - 1));
    }, 100);  // 10x speed
    return () => clearInterval(interval);
  }, [isPlaying, telemetry]);
  
  return (
    <div>
      <MapWithPath points={telemetry?.points} currentIndex={currentIndex} />
      <PlaybackControls
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        progress={currentIndex / (telemetry?.points.length || 1)}
        onSeek={setCurrentIndex}
      />
    </div>
  );
}
```

## Maintenance Calendar Pattern
```typescript
// Using react-big-calendar or similar
function MaintenanceCalendar() {
  const { data: maintenances } = useMaintenances();
  
  const events = maintenances?.map(m => ({
    id: m.id,
    title: `${m.vehicleId}: ${m.title}`,
    start: new Date(m.scheduledDate),
    end: new Date(m.scheduledDate),
    color: getStatusColor(m.status),
  }));
  
  return <Calendar events={events} onSelectEvent={handleSelect} />;
}
```

## Alert Status Flow
```
    ┌─────────┐     acknowledge     ┌──────────────┐     resolve     ┌──────────┐
    │ Active  │ ─────────────────► │ Acknowledged │ ──────────────► │ Resolved │
    └─────────┘                     └──────────────┘                 └──────────┘
         │                                                                 │
         │                           dismiss                               │
         └──────────────────────────────────────────────────────────┐     │
                                                                     ▼     ▼
                                                                ┌───────────────┐
                                                                │   Dismissed   │
                                                                └───────────────┘
```

## Dependencies
- ✅ Phase 4A-4C done (Auth, layout, base pages)
- ✅ Phase 2E done (Alerts, Trips, Maintenance APIs)
- ✅ Phase 5A done (Map component reused for trip replay)

## Verification
- [ ] Alert list: filters by status, severity
- [ ] Alert acknowledge/resolve: updates status
- [ ] Trip list: filters by status, date range
- [ ] Trip replay: playback on map works
- [ ] Maintenance calendar: shows scheduled items
- [ ] Vehicle/Customer CRUD: works correctly

## Full Spec Reference
- [30-frontend-architecture.md](./../../30-frontend-architecture.md) — Frontend architecture
- [21-backend-api-endpoints.md](./../../21-backend-api-endpoints.md) — API details
