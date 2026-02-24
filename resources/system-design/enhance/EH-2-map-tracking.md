# EH-2 — Map & Tracking Overhaul

> Map view đầy đủ tính năng: tracking real-time, device panel, search, cluster, mobile drawer.
> **Deps**: EH-0 (shared hooks), EH-1 (device components)

---

## CRITICAL RULES

```
1. Map PHẢI responsive — mobile dùng bottom drawer thay sidebar
2. react-leaflet + react-leaflet-cluster CHO MAP
3. Realtime positions qua Socket.IO (KHÔNG polling trừ fallback)
4. Throttle position events ≤ 2Hz (mỗi 500ms) để KHÔNG block UI thread
5. Canvas renderer cho trail > 1000 points
6. Ref IVM26: E:\anmh1205\ivm26\IVM26_Frontend\frontend_v2\src\features\map\
```

---

## Task List

| ID      | Description                                                               | Files (trong src/features/map/)        | Ref IVM26 (bytes) |
| ------- | ------------------------------------------------------------------------- | -------------------------------------- | ----------------- |
| EH-2-01 | Rewrite `tracking-map.tsx` — main component với controls, popup, realtime | `components/tracking-map.tsx`          | 15,887            |
| EH-2-02 | Device list panel — sidebar liệt kê devices trên map                      | `components/device-list-panel.tsx`     | 8,274             |
| EH-2-03 | Device list item — mỗi device trong panel                                 | `components/device-list-item.tsx`      | 6,585             |
| EH-2-04 | Selected device card — popup/card chi tiết khi click marker               | `components/selected-device-card.tsx`  | 9,551             |
| EH-2-05 | Device search — tìm kiếm device trên map                                  | `components/device-search.tsx`         | 1,764             |
| EH-2-06 | Device filter — bộ lọc status/type                                        | `components/device-filter.tsx`         | 5,687             |
| EH-2-07 | Device filter compact — mobile version                                    | `components/device-filter-compact.tsx` | 5,589             |
| EH-2-08 | Device cluster — marker grouping                                          | `components/device-cluster.tsx`        | 1,855             |
| EH-2-09 | Rewrite `device-marker.tsx` — marker với status icon, popup               | `components/device-marker.tsx`         | 2,486             |
| EH-2-10 | Marker icon factory — create icon by status/type                          | `components/marker-icon.ts`            | 6,496             |
| EH-2-11 | Map controls — zoom, layers, fullscreen                                   | `components/map-controls.tsx`          | 5,460             |
| EH-2-12 | Map layer switcher — street/satellite toggle                              | `components/map-layer-switcher.tsx`    | 2,699             |
| EH-2-13 | Mobile device drawer — bottom sheet cho mobile                            | `components/mobile-device-drawer.tsx`  | 7,563             |
| EH-2-14 | Map constants/config                                                      | `constants/map-config.ts`              | —                 |
| EH-2-15 | Map store — Zustand store cho map state                                   | `store/map-store.ts`                   | —                 |

---

## Architecture

```
MapPage (app/dashboard/map/page.tsx)
├── [Desktop] DeviceListPanel (sidebar left, 320px)
│   ├── DeviceSearch
│   ├── DeviceFilter  
│   └── DeviceListItem[] (scrollable)
│       └── Click → selectedDeviceId + flyTo
├── TrackingMap (main area, flex-1)
│   ├── TileLayer (street/satellite)
│   ├── DeviceCluster
│   │   └── DeviceMarker[] (custom divIcon by status)
│   │       └── Click → SelectedDeviceCard popup
│   ├── MapControls (floating top-right)
│   │   ├── Zoom in/out
│   │   ├── MapLayerSwitcher
│   │   ├── Fullscreen toggle
│   │   └── Fit all bounds
│   └── SelectedDeviceCard (floating bottom-center or sidebar)
└── [Mobile] MobileDeviceDrawer (bottom sheet)
    ├── DeviceFilterCompact
    ├── DeviceSearch
    └── DeviceListItem[] + SelectedDeviceCard
```

### Zustand Map Store

```typescript
// src/features/map/store/map-store.ts
interface MapState {
  selectedDeviceId: string | null;
  showGeofences: boolean;
  followMode: boolean;
  mapViewport: { center: [number, number]; zoom: number };
  
  // Actions
  setSelectedDevice: (id: string | null) => void;
  toggleGeofences: () => void;
  toggleFollowMode: () => void;
  setMapViewport: (viewport: { center: [number, number]; zoom: number }) => void;
}
```

### Marker Icon Factory

```typescript
// src/features/map/components/marker-icon.ts
import L from 'leaflet';

const STATUS_COLORS = {
  running: '#22c55e',  // green
  stopped: '#6b7280',  // gray
  error: '#ef4444',    // red
  disconnected: '#eab308', // yellow
} as const;

export function createDeviceMarkerIcon(status: string, heading?: number): L.DivIcon {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.disconnected;
  return L.divIcon({
    className: 'device-marker',
    html: `<div style="transform: rotate(${heading ?? 0}deg)">
      <svg viewBox="0 0 32 32" fill="${color}">...</svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}
```

### Realtime Pattern

```typescript
// Trong tracking-map.tsx
useRealtimeSubscription<DevicePositionPayload>({
  event: 'device:position',
  handler: (payload) => {
    // Throttle: buffer events, flush every 500ms
    positionBufferRef.current.set(payload.device_id, payload);
  }
});

useEffect(() => {
  const interval = setInterval(() => {
    const buffer = positionBufferRef.current;
    if (buffer.size === 0) return;
    // Batch update query cache
    queryClient.setQueryData(['device-positions'], (old) => {
      const updated = [...old];
      buffer.forEach((pos, id) => {
        const idx = updated.findIndex(d => d.device_id === id);
        if (idx >= 0) updated[idx] = { ...updated[idx], ...pos };
      });
      return updated;
    });
    buffer.clear();
  }, 500);
  return () => clearInterval(interval);
}, [queryClient]);
```

---

## Backend API Requirements

| Endpoint                       | Purpose                   | Notes                                                   |
| ------------------------------ | ------------------------- | ------------------------------------------------------- |
| `GET /api/v1/device/positions` | All device positions      | Có thể dùng existing `/api/v1/device` với fields filter |
| Socket `device:position`       | Realtime position updates | Kiểm tra backend emit format                            |
| Socket `device:status`         | Status change events      | Đã có                                                   |

---

## Verification Checklist

- [ ] Map hiển thị tất cả devices
- [ ] Markers có màu theo status (green/gray/red/yellow)
- [ ] Click marker → SelectedDeviceCard hiện
- [ ] Sidebar search filter hoạt động
- [ ] Layer switcher (street/satellite) hoạt động
- [ ] Clustering hoạt động ở zoom thấp
- [ ] Realtime position updates (≤ 500ms throttle)
- [ ] Mobile: bottom drawer thay sidebar
- [ ] Follow mode: auto-pan khi selected device di chuyển
- [ ] Fit all bounds: zoom to show all devices
