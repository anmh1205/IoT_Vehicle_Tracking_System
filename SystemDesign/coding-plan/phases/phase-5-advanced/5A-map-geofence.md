# Sub-Phase 5A: Map & Geofence UI

> **Context:** ~4KB | **Max Files:** 10 | **Est. Time:** 1 session

## Summary
Implement Map view với real-time vehicle positions, geofence management (draw, edit, delete), và vehicle tracking overlay.

## Tasks
| ID     | Description             | Files                                      |
| ------ | ----------------------- | ------------------------------------------ |
| FE-030 | Map page                | `app/(dashboard)/map/page.tsx`             |
| FE-031 | Map component (Leaflet) | `components/map/map-container.tsx`         |
| FE-032 | Vehicle markers         | `components/map/vehicle-marker.tsx`        |
| FE-033 | Geofence layer          | `components/map/geofence-layer.tsx`        |
| FE-034 | Geofence editor         | `components/map/geofence-editor.tsx`       |
| FE-035 | Vehicle popup           | `components/map/vehicle-popup.tsx`         |
| FE-036 | Map controls            | `components/map/map-controls.tsx`          |
| FE-037 | Map hooks               | `hooks/useMap.ts`, `hooks/useGeofences.ts` |

## Backend API Contract (Input từ BE Phase 2B, 2E)
### Device Positions
| Endpoint                        | Method | Response               |
| ------------------------------- | ------ | ---------------------- |
| `GET /api/v1/devices/positions` | GET    | `{ data: Position[] }` |

### Geofences
| Endpoint                              | Method | Response                           |
| ------------------------------------- | ------ | ---------------------------------- |
| `GET /api/v1/geofences`               | GET    | `{ data: Geofence[], pagination }` |
| `POST /api/v1/geofences`              | POST   | `{ data: Geofence }`               |
| `PUT /api/v1/geofences/:id`           | PUT    | `{ data: Geofence }`               |
| `DELETE /api/v1/geofences/:id`        | DELETE | `{ success: true }`                |
| `POST /api/v1/geofences/:id/vehicles` | POST   | Assign vehicles                    |

## Type Definitions
```typescript
interface Position {
  id: string;       // deviceId
  lat: number;
  lon: number;
  spd: number;      // speed
  ts: number;       // timestamp (epoch)
  s: string;        // status short ('r'=running, 's'=stopped, 'd'=disconnected)
}

interface Geofence {
  id: number;
  name: string;
  geofenceType: 'circle' | 'polygon' | 'rectangle';
  centerLatitude?: number;
  centerLongitude?: number;
  radiusMeters?: number;
  coordinates?: { lat: number; lng: number }[] | null;  // For polygon
  triggerOn: 'enter' | 'exit' | 'both';
  isActive: boolean;
  color: string;
  vehicles: string[];  // vehicleIds assigned
}
```

## WebSocket Events (real-time positions)
```typescript
// Namespace: /devices
socket.on('positions:batch', (positions: Position[]) => {
  // Update all markers at once (batch update for performance)
});

// Namespace: /dashboard (geofence alerts)
socket.on('geofence:triggered', (data: {
  vehicleId: string;
  geofenceId: number;
  action: 'enter' | 'exit';
  timestamp: string;
}) => {
  // Show geofence alert notification
});
```

## Map Component Pattern
```typescript
// components/map/map-container.tsx
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

export function VehicleMap() {
  const positions = usePositions();  // Real-time positions
  const geofences = useGeofences();
  
  return (
    <MapContainer center={[21.0285, 105.8542]} zoom={13}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {/* Vehicle markers */}
      {positions.map(pos => (
        <VehicleMarker key={pos.id} position={pos} />
      ))}
      
      {/* Geofence layers */}
      {geofences.map(geo => (
        <GeofenceLayer key={geo.id} geofence={geo} />
      ))}
      
      {/* Geofence draw controls (admin only) */}
      <GeofenceEditor onSave={handleSaveGeofence} />
    </MapContainer>
  );
}
```

## Geofence Editor Pattern
```typescript
// Using react-leaflet-draw for geofence creation
import { FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';

function GeofenceEditor({ onSave }) {
  const handleCreated = (e) => {
    const { layerType, layer } = e;
    
    if (layerType === 'circle') {
      const { lat, lng } = layer.getLatLng();
      const radius = layer.getRadius();
      onSave({ geofenceType: 'circle', centerLatitude: lat, centerLongitude: lng, radiusMeters: radius });
    }
    
    if (layerType === 'polygon') {
      const coordinates = layer.getLatLngs()[0].map(ll => ({ lat: ll.lat, lng: ll.lng }));
      onSave({ geofenceType: 'polygon', coordinates });
    }
  };
  
  return (
    <FeatureGroup>
      <EditControl
        position="topright"
        draw={{ circle: true, polygon: true, rectangle: true, marker: false, polyline: false }}
        onCreated={handleCreated}
      />
    </FeatureGroup>
  );
}
```

## Performance Considerations
```typescript
// ⚠️ QUAN TRỌNG cho map performance:
1. Batch position updates (không update từng marker riêng)
2. Use clustering cho nhiều vehicles (Leaflet.markercluster)
3. Debounce geofence check API calls
4. Disable REST polling khi WebSocket connected

// Disable REST polling pattern:
if (socket.connected) {
  clearInterval(pollingInterval);
}
socket.on('disconnect', () => {
  pollingInterval = setInterval(fetchPositions, 5000);
});
```

## Dependencies
- ✅ Phase 4A-4B done (Auth, Device API)
- ✅ Phase 2B, 2E done (Positions API, Geofence API)
- ➡️ Phase 5B can run parallel

## Verification
- [ ] Map loads với vehicle markers
- [ ] Markers update real-time via WebSocket
- [ ] Geofence draw: circle, polygon, rectangle
- [ ] Geofence save: persists to backend
- [ ] Geofence alerts: triggered on enter/exit

## Full Spec Reference
- [30-frontend-architecture.md](./../../30-frontend-architecture.md) — Frontend architecture
- [24-websocket-events.md](./../../24-websocket-events.md) — WebSocket event contract
