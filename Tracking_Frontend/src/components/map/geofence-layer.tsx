'use client';

import { Circle, Polygon, Popup } from 'react-leaflet';
import type { Geofence } from '@/types/geofence.types';

interface GeofenceLayerProps {
  geofence: Geofence;
  onClick?: (geofence: Geofence) => void;
}

export function GeofenceLayer({ geofence, onClick }: GeofenceLayerProps) {
  if (geofence.displayHidden) return null;

  const color = geofence.color || '#3b82f6';
  const fillOpacity = 0.15;
  const weight = 2;

  const popup = (
    <Popup>
      <div style={{ minWidth: 140, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
          {geofence.name}
        </div>
        {geofence.description && (
          <div style={{ fontSize: 12, color: '#71717a', marginBottom: 4 }}>
            {geofence.description}
          </div>
        )}
        <div style={{ fontSize: 12, color: '#a1a1aa' }}>
          Trigger: {geofence.triggerOn} | {geofence.isActive ? 'Active' : 'Inactive'}
        </div>
      </div>
    </Popup>
  );

  if (geofence.geofenceType === 'circle') {
    if (geofence.centerLatitude == null || geofence.centerLongitude == null || geofence.radiusMeters == null) {
      return null;
    }
    return (
      <Circle
        center={[geofence.centerLatitude, geofence.centerLongitude]}
        radius={geofence.radiusMeters}
        pathOptions={{ color, fillColor: color, fillOpacity, weight }}
        eventHandlers={{ click: () => onClick?.(geofence) }}
      >
        {popup}
      </Circle>
    );
  }

  if (geofence.geofenceType === 'polygon' || geofence.geofenceType === 'rectangle') {
    if (!geofence.coordinates || geofence.coordinates.length < 3) {
      return null;
    }
    const positions = geofence.coordinates.map((c) => [c.lat, c.lng] as [number, number]);
    return (
      <Polygon
        positions={positions}
        pathOptions={{ color, fillColor: color, fillOpacity, weight }}
        eventHandlers={{ click: () => onClick?.(geofence) }}
      >
        {popup}
      </Polygon>
    );
  }

  return null;
}
