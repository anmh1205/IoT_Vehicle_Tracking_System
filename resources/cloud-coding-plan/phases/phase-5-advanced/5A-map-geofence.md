# Phase 5A — Map View & Geofence Management

> Live vehicle tracking map (Leaflet), geofence CRUD with map editor, real-time position updates.
> FSD: `features/map/` and `features/geofences/`

---

## CRITICAL RULES

```
1. Map: Leaflet via react-leaflet (dynamic import, no SSR)
2. Geofence editor: @geoman-io/leaflet-geoman-free (NOT react-leaflet-draw)
3. Map page: FULL HEIGHT layout, NO PageContainer header — uses custom MapSidebar
4. Geofence list page: PageContainer + DataTable (standard pattern)
5. Geofence form: Split layout Dialog — form left 40%, map editor right 60%
6. Clustering: leaflet.markercluster for performance
7. Canvas renderer for 500+ markers
8. Vietnamese labels
```

---

## Dependencies (install in this phase)

```bash
npm i react-leaflet leaflet @geoman-io/leaflet-geoman-free leaflet.markercluster
npm i -D @types/leaflet @types/leaflet.markercluster
```

---

## Task List

| ID     | Description                | Files                                                                        |
| ------ | -------------------------- | ---------------------------------------------------------------------------- |
| FE-080 | Map types + store          | `features/map/types/`, `lib/stores/map-store.ts`                             |
| FE-081 | Map page                   | `app/dashboard/map/page.tsx`                                                 |
| FE-082 | MapView component          | `features/map/components/map-view.tsx`                                       |
| FE-083 | VehicleMarker              | `features/map/components/vehicle-marker.tsx`                                 |
| FE-084 | VehiclePopup               | `features/map/components/vehicle-popup.tsx`                                  |
| FE-085 | GeofenceLayer              | `features/map/components/geofence-layer.tsx`                                 |
| FE-086 | MapSidebar                 | `features/map/components/map-sidebar.tsx`                                    |
| FE-087 | MapToolbar                 | `features/map/components/map-toolbar.tsx`                                    |
| FE-088 | MapLayerSwitcher           | `features/map/components/map-layer-switcher.tsx`                             |
| FE-089 | DeviceCluster              | `features/map/components/device-cluster.tsx`                                 |
| FE-08A | MobileDeviceDrawer         | `features/map/components/mobile-device-drawer.tsx`                           |
| FE-08B | SelectedDeviceCard         | `features/map/components/selected-device-card.tsx`                           |
| FE-08C | Map hooks (3)              | `features/map/hooks/*.ts`                                                    |
| FE-08D | Map API                    | `lib/api/map.ts`                                                             |
| FE-08E | MarkerIconFactory          | `features/map/components/marker-icon.ts`                                     |
| FE-08F | DeviceSearch               | `features/map/components/device-search.tsx`                                  |
| FE-08G | DeviceFilter               | `features/map/components/device-filter.tsx`                                  |
| FE-08H | DeviceFilterCompact        | `features/map/components/device-filter-compact.tsx`                          |
| FE-08I | DeviceListItem             | `features/map/components/device-list-item.tsx`                               |
| FE-08J | MapControls                | `features/map/components/map-controls.tsx`                                   |
| FE-090 | Geofence types             | `features/geofences/types/index.ts`                                          |
| FE-091 | Geofence schema            | `lib/validations/geofence.schema.ts`                                         |
| FE-092 | Geofence API               | `lib/api/geofences.ts`                                                       |
| FE-093 | Geofence hooks (5)         | `features/geofences/hooks/*.ts`                                              |
| FE-094 | Geofence list page         | `app/dashboard/geofences/page.tsx`                                           |
| FE-095 | Geofence columns           | `features/geofences/components/geofence-columns.tsx`                         |
| FE-096 | Geofence form + map editor | `features/geofences/components/geofence-form.tsx`, `geofence-map-editor.tsx` |
| FE-097 | GeofenceVehicleBinder      | `features/geofences/components/geofence-vehicle-binder.tsx`                  |

---

## Backend API Contract

```
# Map Positions
GET /api/v1/devices/positions    → Position[] (all online devices)

# Geofences
GET    /api/v1/geofences          ?page&limit&isActive&search
GET    /api/v1/geofences/:id
POST   /api/v1/geofences          { name, type, coordinates, radius?, isActive, vehicleIds }
PUT    /api/v1/geofences/:id      { name, coordinates, radius?, isActive, vehicleIds }
DELETE /api/v1/geofences/:id

# Socket.IO events
device:position → { deviceId, lat, lon, speed, heading, timestamp }
geofence:enter  → { deviceId, geofenceId, geofenceName, timestamp }
geofence:exit   → { deviceId, geofenceId, geofenceName, timestamp }
```

---

## FE-080: Map Types + Zustand Store

```typescript
// features/map/types/index.ts
export interface DevicePosition {
  deviceId: string;
  deviceName: string;
  vehiclePlate: string | null;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  status: 'running' | 'stopped' | 'disconnected';
  timestamp: number;
}

export interface Geofence {
  id: number;
  name: string;
  type: 'circle' | 'polygon';
  coordinates: [number, number][] | [number, number]; // polygon vertices or center
  radius: number | null; // for circle
  isActive: boolean;
  vehicleIds: number[];
  vehicleCount: number;
  createdAt: string;
}
```

```typescript
// lib/stores/map-store.ts
import { create } from 'zustand';
import type { DevicePosition } from '@/features/map/types';

interface MapState {
  positions: Map<string, DevicePosition>;
  selectedDeviceId: string | null;
  followMode: boolean;
  showGeofences: boolean;
  mapViewport: { center: [number, number]; zoom: number };
  updatePosition: (pos: DevicePosition) => void;
  updateBatch: (positions: DevicePosition[]) => void;
  selectDevice: (deviceId: string | null) => void;
  toggleFollowMode: () => void;
  toggleGeofences: () => void;
  setMapViewport: (viewport: { center: [number, number]; zoom: number }) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  positions: new Map(),
  selectedDeviceId: null,
  followMode: false,
  showGeofences: true,
  mapViewport: { center: [10.762622, 106.660172] as [number, number], zoom: 12 },

  updatePosition: (pos) => set((s) => {
    const next = new Map(s.positions);
    next.set(pos.deviceId, pos);
    return { positions: next };
  }),

  updateBatch: (positions) => set((s) => {
    const next = new Map(s.positions);
    for (const p of positions) next.set(p.deviceId, p);
    return { positions: next };
  }),

  selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),
  toggleFollowMode: () => set((s) => ({ followMode: !s.followMode })),
  toggleGeofences: () => set((s) => ({ showGeofences: !s.showGeofences })),
  setMapViewport: (viewport) => set({ mapViewport: viewport }),
}));
```

---

## FE-081: Map Page

```tsx
// app/dashboard/map/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { MapSidebar } from '@/features/map/components/map-sidebar';
import { MapToolbar } from '@/features/map/components/map-toolbar';
import { useMapRealtime } from '@/features/map/hooks/use-map-realtime';
import { useDevicePositions } from '@/features/map/hooks/use-device-positions';

const MapView = dynamic(() => import('@/features/map/components/map-view').then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="flex-1 bg-muted animate-pulse" />,
});

export default function MapPage() {
  useDevicePositions(); // initial fetch
  useMapRealtime();     // live updates

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <MapSidebar />
      <div className="relative flex-1">
        <MapView />
        <MapToolbar />
      </div>
    </div>
  );
}
```

> ⚠️ NO PageContainer. Map page uses full-height flex layout.

---

## FE-082: MapView

```tsx
// features/map/components/map-view.tsx
'use client';

import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useMapStore } from '@/lib/stores/map-store';
import { VehicleMarker } from './vehicle-marker';
import { GeofenceLayer } from './geofence-layer';
import { MapLayerSwitcher } from './map-layer-switcher';
import { useGeofences } from '@/features/geofences/hooks/use-geofences';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [10.762622, 106.660172]; // Ho Chi Minh
const DEFAULT_ZOOM = 12;

export function MapView() {
  const positions = useMapStore((s) => s.positions);
  const showGeofences = useMapStore((s) => s.showGeofences);
  const { data: geofences } = useGeofences({ isActive: true });

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full z-0"
      preferCanvas={true}
    >
      <MapLayerSwitcher />

      {Array.from(positions.values()).map((pos) => (
        <VehicleMarker key={pos.deviceId} position={pos} />
      ))}

      {showGeofences && geofences?.data?.map((gf: any) => (
        <GeofenceLayer key={gf.id} geofence={gf} />
      ))}

      <FollowSelectedDevice />
    </MapContainer>
  );
}

// Auto-pan to selected device
function FollowSelectedDevice() {
  const map = useMap();
  const selectedId = useMapStore((s) => s.selectedDeviceId);
  const followMode = useMapStore((s) => s.followMode);
  const positions = useMapStore((s) => s.positions);

  if (followMode && selectedId) {
    const pos = positions.get(selectedId);
    if (pos) map.setView([pos.lat, pos.lon], map.getZoom());
  }
  return null;
}
```

---

## FE-083: VehicleMarker

Custom `divIcon` with:
- Color by status: running=green, stopped=amber, disconnected=red
- Arrow rotated by `heading`
- Click → `useMapStore.selectDevice(deviceId)` + show VehiclePopup

---

## FE-085: GeofenceLayer

Renders Circle (for type=circle) or Polygon (for type=polygon) with:
- Semi-transparent fill
- Tooltip with geofence name
- Blue stroke, dashed for inactive

---

## FE-08E: MarkerIconFactory

```typescript
// features/map/components/marker-icon.ts
import L from 'leaflet';

const STATUS_COLORS = {
  running: '#22c55e',
  stopped: '#6b7280',
  error: '#ef4444',
  disconnected: '#eab308',
} as const;

export function createDeviceMarkerIcon(status: string, heading?: number): L.DivIcon {
  const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.disconnected;
  return L.divIcon({
    className: 'device-marker',
    html: `<div style="transform: rotate(${heading ?? 0}deg)">
      <svg viewBox="0 0 32 32" fill="${color}" width="32" height="32">
        <path d="M16 2L6 28h20L16 2z"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}
```

---

## FE-08F: DeviceSearch

Search input (shadcn Input + Search icon) that filters the device list panel in real-time. Uses `useMemo` to filter positions by `deviceName` or `vehiclePlate`. Debounced 300ms.

---

## FE-08G–08H: DeviceFilter / DeviceFilterCompact

**DeviceFilter** (desktop): DropdownMenu with checkboxes for status (running, stopped, disconnected) and device type filters.

**DeviceFilterCompact** (mobile): Same filters but rendered as horizontal pill/badge toggles for the bottom drawer.

---

## FE-08I: DeviceListItem

Each device row in the sidebar list:
- Status dot (color by status)
- Device name (bold) + vehicle plate (muted)
- Speed (km/h) on right side
- Click → `useMapStore.selectDevice(deviceId)` + map flyTo
- Active state highlight when selected

---

## FE-08J: MapControls

Floating control panel (top-right of map):
- Zoom in/out buttons
- Fullscreen toggle
- Fit all bounds (zoom to show all devices)
- MapLayerSwitcher (street/satellite)
- Follow mode toggle

---

## FE-086: MapSidebar

Collapsible sidebar (w-80, hidden on mobile → use Sheet):
- **Tab 1 "Phương tiện"**: Search input + scrollable list of DeviceListItems (status dot, name, plate, speed)
- **Tab 2 "Geofences"**: List of geofences with active toggle
- Click device → selectDevice + pan map
- **SelectedDeviceCard**: When a device is selected, show detailed card at bottom (name, status, speed, lat/lon, link to device detail)

---

## FE-08A: MobileDeviceDrawer

On mobile (responsive), MapSidebar becomes a Sheet (bottom drawer):
- Drag handle
- Compact device list
- Selected device card expands in drawer

---

## FE-08C: Map Hooks

```typescript
// features/map/hooks/use-device-positions.ts
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mapServices } from '@/lib/api/map';
import { useMapStore } from '@/lib/stores/map-store';

export function useDevicePositions() {
  const updateBatch = useMapStore((s) => s.updateBatch);
  const { data } = useQuery({
    queryKey: ['device-positions'],
    queryFn: mapServices.getPositions,
    refetchInterval: 30_000, // fallback polling
  });

  useEffect(() => {
    if (data?.data) updateBatch(data.data);
  }, [data]);
}
```

```typescript
// features/map/hooks/use-map-realtime.ts
import { useEffect } from 'react';
import { useSocket } from '@/components/providers/socket-provider';
import { useMapStore } from '@/lib/stores/map-store';

export function useMapRealtime() {
  const socket = useSocket();
  const updatePosition = useMapStore((s) => s.updatePosition);
  const positionBufferRef = useRef(new Map<string, any>());

  // Buffer incoming events
  useRealtimeSubscription<any>({
    event: 'device:position',
    handler: (payload) => {
      positionBufferRef.current.set(payload.deviceId, payload);
    },
  });

  // Flush buffer every 500ms (throttle)
  useEffect(() => {
    const interval = setInterval(() => {
      const buffer = positionBufferRef.current;
      if (buffer.size === 0) return;
      buffer.forEach((data) => {
        updatePosition({
          deviceId: data.deviceId,
          deviceName: data.deviceName || data.deviceId,
          vehiclePlate: data.vehiclePlate || null,
          lat: data.lat,
          lon: data.lon,
          speed: data.speed || 0,
          heading: data.heading || 0,
          status: data.status || 'running',
          timestamp: Date.now(),
        });
      });
      buffer.clear();
    }, 500);
    return () => clearInterval(interval);
  }, [updatePosition]);
}
```

---

## FE-094: Geofence List Page

Standard PageContainer + DataTable pattern:
- pageTitle: "Geofences"
- pageDescription: "Quản lý các vùng giám sát"
- Columns: name (sortable), type (Badge: circle/polygon), vehicleCount, isActive (Switch inline toggle), createdAt, actions
- GeofenceForm (split Dialog)
- ConfirmDialog for delete

---

## FE-096: Geofence Form + Map Editor

```
Split Dialog (max-w-4xl):
┌──────────────────┬──────────────────────────┐
│  Form (40%)      │  Map Editor (60%)        │
│  - name Input    │  Leaflet map with        │
│  - type Select   │  @geoman-io/leaflet-     │
│    (circle/poly) │  geoman-free             │
│  - radius Input  │  Draw polygon/circle     │
│    (if circle)   │  Edit existing shape     │
│  - isActive      │                          │
│    Switch        │  Shape → coordinates     │
│  - Vehicle       │  auto-sync to form       │
│    binder        │                          │
│  ─────────       │                          │
│  Cancel / Save   │                          │
└──────────────────┴──────────────────────────┘
```

### GeofenceMapEditor
```tsx
// features/geofences/components/geofence-map-editor.tsx
// Uses @geoman-io/leaflet-geoman-free
// Props: type ('circle' | 'polygon'), initialCoordinates, initialRadius
// Events: onChange(coordinates, radius?)
// On mount: enable pm controls for selected type
// On shape create: extract coordinates, call onChange
// On shape edit: update coordinates, call onChange
```

### GeofenceVehicleBinder
Multi-select combobox (shadcn Command) to select which vehicles this geofence applies to. Fetch vehicles with useQuery.

---

## FE-091: Geofence Schema

```typescript
// lib/validations/geofence.schema.ts
import { z } from 'zod';

export const geofenceSchema = z.object({
  name: z.string().min(1, 'Tên geofence là bắt buộc').max(100),
  type: z.enum(['circle', 'polygon'], { required_error: 'Chọn loại' }),
  coordinates: z.any(), // validated programmatically from map
  radius: z.coerce.number().min(50, 'Bán kính tối thiểu 50m').optional(),
  isActive: z.boolean().default(true),
  vehicleIds: z.array(z.number()).default([]),
});

export type GeofenceFormValues = z.infer<typeof geofenceSchema>;
```

---

## Performance Rules

1. Use `preferCanvas={true}` on MapContainer for 500+ markers
2. Use leaflet.markercluster for DeviceCluster
3. Throttle `device:position` Socket events to 1 update/sec per device
4. Use `useMemo` for marker icon generation
5. Lazy load map component with `dynamic()` + `{ ssr: false }`

---

## Verification Checklist

- [ ] Map page: full height, sidebar + map layout
- [ ] Vehicle markers appear at correct positions with status colors
- [ ] Click marker → popup with device info
- [ ] Real-time: markers move as positions update
- [ ] Follow mode: map pans to selected device
- [ ] Layer switcher: OpenStreetMap / Satellite
- [ ] Geofence layers: circles and polygons render on map
- [ ] Geofence list page: DataTable with CRUD
- [ ] Geofence form: split layout with map editor
- [ ] Geofence draw: polygon and circle drawing with @geoman-io
- [ ] Geofence vehicle binder: multi-select works
- [ ] Mobile: sidebar becomes bottom drawer
- [ ] Clustering works with many markers
- [ ] All text Vietnamese
