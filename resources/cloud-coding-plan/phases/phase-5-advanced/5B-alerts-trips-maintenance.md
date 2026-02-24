# Phase 5B — Alerts, Trips, Maintenance & Violations

> Alert management (CRUD + status flow), Trip tracking (route map + replay), Maintenance scheduling (calendar), Violations (filtered alerts view).
> FSD: `features/alerts/`, `features/trips/`, `features/maintenance/`, `features/violations/`

---

## CRITICAL RULES

```
1. Alerts: status flow active→acknowledged→resolved/dismissed (NOT arbitrary)
2. Trips: detail page /trips/[id] with route map (speed-colored polyline) + replay controls
3. Maintenance: calendar view using recharts or custom shadcn Calendar + events
4. Violations: REUSE alert API filtered by alertType (speeding, harsh_braking, idle_too_long) — NO separate backend endpoint
5. All charts: recharts. All tables: DataTable. All text: Vietnamese
6. Trip replay: play/pause, speed control, scrubber timeline
```

---

## Task List

| ID     | Description           | Files                                                      |
| ------ | --------------------- | ---------------------------------------------------------- |
| FE-100 | Alert types           | `features/alerts/types/index.ts`                           |
| FE-101 | Alert schema          | `lib/validations/alert.schema.ts`                          |
| FE-102 | Alert API             | `lib/api/alerts.ts`                                        |
| FE-103 | Alert hooks (6)       | `features/alerts/hooks/*.ts`                               |
| FE-104 | Alerts page           | `app/dashboard/alerts/page.tsx`                            |
| FE-105 | Alert columns         | `features/alerts/components/alert-columns.tsx`             |
| FE-106 | Alert filters         | `features/alerts/components/alert-filters.tsx`             |
| FE-107 | Alert detail modal    | `features/alerts/components/alert-detail-modal.tsx`        |
| FE-108 | Alert real-time       | `features/alerts/hooks/use-alert-realtime.ts`              |
| FE-110 | Trip types            | `features/trips/types/index.ts`                            |
| FE-111 | Trip schema           | `lib/validations/trip.schema.ts`                           |
| FE-112 | Trip API              | `lib/api/trips.ts`                                         |
| FE-113 | Trip hooks (6)        | `features/trips/hooks/*.ts`                                |
| FE-114 | Trips page            | `app/dashboard/trips/page.tsx`                             |
| FE-115 | Trip columns          | `features/trips/components/trip-columns.tsx`               |
| FE-116 | Trip form             | `features/trips/components/trip-form.tsx`                  |
| FE-117 | Trip detail page      | `app/dashboard/trips/[id]/page.tsx`                        |
| FE-118 | Trip route map        | `features/trips/components/trip-route-map.tsx`             |
| FE-119 | Trip replay controls  | `features/trips/components/trip-replay-controls.tsx`       |
| FE-11A | Trip telemetry chart  | `features/trips/components/trip-telemetry-chart.tsx`       |
| FE-120 | Maintenance types     | `features/maintenance/types/index.ts`                      |
| FE-121 | Maintenance schema    | `lib/validations/maintenance.schema.ts`                    |
| FE-122 | Maintenance API       | `lib/api/maintenance.ts`                                   |
| FE-123 | Maintenance hooks (5) | `features/maintenance/hooks/*.ts`                          |
| FE-124 | Maintenance page      | `app/dashboard/maintenance/page.tsx`                       |
| FE-125 | Maintenance columns   | `features/maintenance/components/maintenance-columns.tsx`  |
| FE-126 | Maintenance form      | `features/maintenance/components/maintenance-form.tsx`     |
| FE-127 | Maintenance calendar  | `features/maintenance/components/maintenance-calendar.tsx` |
| FE-128 | Mileage forecaster    | `features/maintenance/components/mileage-forecaster.tsx`   |
| FE-130 | Violations page       | `app/dashboard/violations/page.tsx`                        |
| FE-131 | Violation columns     | `features/violations/components/violation-columns.tsx`     |
| FE-132 | Violation stats       | `features/violations/components/violation-stats.tsx`       |

---

## Backend API Contract

```
# Alerts
GET    /api/v1/alerts              ?page&limit&alertType&severity&status&deviceId&from&to
GET    /api/v1/alerts/:id
POST   /api/v1/alerts              { vehicleId, deviceId, alertType, severity, title, message, lat, lon }
PUT    /api/v1/alerts/:id/acknowledge
PUT    /api/v1/alerts/:id/resolve  { resolutionNotes? }
PUT    /api/v1/alerts/:id/dismiss
DELETE /api/v1/alerts/:id

# Trips
GET    /api/v1/trips               ?page&limit&vehicleId&status&from&to
GET    /api/v1/trips/:id           → TripDetail (with route points)
POST   /api/v1/trips               { vehicleId, deviceId, startLocation, endLocation? }
PUT    /api/v1/trips/:id           { endLocation, notes }
DELETE /api/v1/trips/:id
PUT    /api/v1/trips/:id/start
PUT    /api/v1/trips/:id/end

# Maintenance
GET    /api/v1/maintenance         ?page&limit&vehicleId&type&status&from&to
GET    /api/v1/maintenance/:id
POST   /api/v1/maintenance         { vehicleId, type, description, scheduledDate, mileageThreshold?, cost? }
PUT    /api/v1/maintenance/:id     { status, completedDate, actualCost, notes }
DELETE /api/v1/maintenance/:id
```

---

## ALERTS MODULE

### FE-100: Alert Types

```typescript
// features/alerts/types/index.ts
export interface Alert {
  id: number;
  vehicleId: number;
  vehiclePlate: string;
  deviceId: string;
  alertType: 'speeding' | 'geofence_enter' | 'geofence_exit' | 'harsh_braking' | 'idle_too_long' | 'low_battery' | 'device_offline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  title: string;
  message: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
}

export interface AlertFilters {
  page?: number; limit?: number; alertType?: string; severity?: string;
  status?: string; deviceId?: string; from?: string; to?: string;
}
```

### FE-104: Alerts Page

PageContainer + DataTable + AlertFilters + AlertDetailModal. Bulk actions:
- Checkbox selection
- "Xác nhận tất cả" button → bulk acknowledge
- "Giải quyết tất cả" button → bulk resolve

### FE-106: Alert Filters

Row of Select/DatePicker:
- alertType Select (all types)
- severity Select (low/medium/high/critical)
- status Select (active/acknowledged/resolved/dismissed)
- DateRangePicker (from/to) with presets: Hôm nay, 7 ngày, 30 ngày, Tùy chọn

### FE-107: Alert Detail Modal

Dialog showing:
- Alert info (type, severity Badge, status Badge, title, message, timestamps)
- Mini map (Leaflet) showing alert location pin
- Action buttons based on status:
  - Active → "Xác nhận" + "Bỏ qua"
  - Acknowledged → "Giải quyết" (with resolutionNotes Textarea)

### FE-108: Alert Real-time

Socket `alert:new` → toast notification with severity color:
- critical → toast.error with persistent duration
- high → toast.warning
- medium/low → toast.info

---

## TRIPS MODULE

### FE-110: Trip Types

```typescript
// features/trips/types/index.ts
export interface Trip {
  id: number;
  vehicleId: number;
  vehiclePlate: string;
  deviceId: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startLocation: string;
  endLocation: string | null;
  startTime: string | null;
  endTime: string | null;
  distanceKm: number;
  durationMinutes: number;
  maxSpeed: number;
  avgSpeed: number;
  notes: string | null;
  createdAt: string;
}

export interface TripDetail extends Trip {
  routePoints: TripRoutePoint[];
}

export interface TripRoutePoint {
  lat: number;
  lon: number;
  speed: number;
  timestamp: string;
}
```

### FE-114: Trips Page

PageContainer + DataTable. Columns: vehiclePlate, startLocation→endLocation, status Badge, startTime, endTime, distanceKm, avgSpeed, actions (View/Edit/Delete).

### FE-117: Trip Detail Page

```tsx
// app/dashboard/trips/[id]/page.tsx
'use client';

import { use } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { TripRouteMap } from '@/features/trips/components/trip-route-map';
import { TripReplayControls } from '@/features/trips/components/trip-replay-controls';
import { TripTelemetryChart } from '@/features/trips/components/trip-telemetry-chart';
import { useTripDetail } from '@/features/trips/hooks/use-trip-detail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: trip, isLoading } = useTripDetail(Number(id));

  return (
    <PageContainer pageTitle={`Chuyến đi #${id}`} pageDescription={trip?.vehiclePlate}>
      {/* Trip info cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <InfoCard label="Khoảng cách" value={`${trip?.distanceKm?.toFixed(1)} km`} />
        <InfoCard label="Thời gian" value={`${trip?.durationMinutes} phút`} />
        <InfoCard label="Tốc độ TB" value={`${trip?.avgSpeed} km/h`} />
        <InfoCard label="Tốc độ max" value={`${trip?.maxSpeed} km/h`} />
      </div>

      {/* Route map with replay */}
      <Card>
        <CardHeader><CardTitle>Lộ trình</CardTitle></CardHeader>
        <CardContent className="h-[400px]">
          <TripRouteMap routePoints={trip?.routePoints ?? []} />
        </CardContent>
      </Card>

      <TripReplayControls routePoints={trip?.routePoints ?? []} />

      {/* Telemetry chart */}
      <TripTelemetryChart routePoints={trip?.routePoints ?? []} />
    </PageContainer>
  );
}
```

### FE-118: Trip Route Map

Leaflet Polyline with speed-colored segments:
- Green: < 60 km/h
- Yellow: 60-80 km/h
- Orange: 80-100 km/h
- Red: > 100 km/h
- Start marker (green), End marker (red)
- Moving marker during replay (animated)

### FE-119: Trip Replay Controls

- Play/Pause button
- Speed selector: 1x, 2x, 5x, 10x
- Timeline scrubber (shadcn Slider)
- Current timestamp display
- useRef for animation frame loop

### FE-11A: Trip Telemetry Chart

recharts AreaChart: X=time, Y=speed. Color fill matching speed ranges. Tooltip shows timestamp + speed.

---

## MAINTENANCE MODULE

### FE-120: Maintenance Types

```typescript
// features/maintenance/types/index.ts
export interface Maintenance {
  id: number;
  vehicleId: number;
  vehiclePlate: string;
  type: 'oil_change' | 'tire_rotation' | 'brake_inspection' | 'general_service' | 'engine_check' | 'battery_replacement';
  description: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
  scheduledDate: string;
  completedDate: string | null;
  mileageThreshold: number | null;
  cost: number | null;
  actualCost: number | null;
  notes: string | null;
  createdAt: string;
}
```

### FE-124: Maintenance Page

Tabs: "Danh sách" (DataTable) + "Lịch" (Calendar view)

DataTable columns: vehiclePlate, type (Vietnamese label), status Badge (scheduled=blue, in_progress=amber, completed=green, overdue=red), scheduledDate, completedDate, cost, actions.

### FE-127: Maintenance Calendar

Card with shadcn Calendar + custom day rendering:
- Days with scheduled events: dot indicator
- Click day → show events for that day in side panel
- Color-coded: overdue=red, today=amber, future=blue

### FE-128: Mileage Forecaster

Card with recharts LineChart:
- Show vehicle mileage trend (last 30 days)
- Projected line (dashed) to next maintenance threshold
- Alert when projected date < 7 days away

---

## VIOLATIONS MODULE (Filtered Alerts)

### FE-130: Violations Page

```tsx
// app/dashboard/violations/page.tsx
'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { ViolationStats } from '@/features/violations/components/violation-stats';
import { DataTable } from '@/components/common/data-table';
import { getViolationColumns } from '@/features/violations/components/violation-columns';
import { useAlerts } from '@/features/alerts/hooks/use-alerts'; // REUSE alert hook
import type { AlertFilters } from '@/features/alerts/types';

const VIOLATION_TYPES = ['speeding', 'harsh_braking', 'idle_too_long'];

export default function ViolationsPage() {
  const filters: AlertFilters = { alertType: VIOLATION_TYPES.join(',') };
  const { data, isLoading } = useAlerts(filters);
  const columns = getViolationColumns();

  return (
    <PageContainer pageTitle="Vi phạm" pageDescription="Lịch sử vi phạm giao thông và vận hành">
      <ViolationStats data={data?.data} isLoading={isLoading} />
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        searchKey="vehiclePlate"
        searchPlaceholder="Tìm biển số..."
        isLoading={isLoading}
      />
    </PageContainer>
  );
}
```

### FE-132: Violation Stats

3 StatCards: Tổng vi phạm, Vượt tốc độ, Phanh gấp. Calculated client-side from filtered alert data.

---

## Verification Checklist

- [ ] Alerts: DataTable with all filter types, pagination
- [ ] Alerts: status flow (acknowledge → resolve with notes)
- [ ] Alerts: bulk selection + bulk actions
- [ ] Alerts: detail modal with mini-map
- [ ] Alerts: real-time toast on new alert
- [ ] Trips: DataTable with vehicle/date filters
- [ ] Trips: create/edit trip form
- [ ] Trip detail: route map with speed-colored polyline
- [ ] Trip detail: replay controls (play/pause/speed/scrubber)
- [ ] Trip detail: telemetry chart
- [ ] Maintenance: DataTable + calendar view toggle
- [ ] Maintenance: form with all fields
- [ ] Maintenance: calendar day click shows events
- [ ] Maintenance: mileage forecaster chart
- [ ] Violations: filtered alerts view, reuses alert API
- [ ] Violations: 3 stat cards
- [ ] All dates formatted Vietnamese (dd/MM/yyyy, relative time)
- [ ] All text Vietnamese
