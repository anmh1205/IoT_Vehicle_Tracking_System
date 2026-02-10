'use client';

import { Circle, Polygon } from 'react-leaflet';

export function GeofenceLayer({ geofence }: { geofence: any }) {
  if (!geofence) return null;
  if (geofence.geofenceType === 'circle' && geofence.centerLatitude && geofence.centerLongitude) {
    return <Circle center={[Number(geofence.centerLatitude), Number(geofence.centerLongitude)]} radius={Number(geofence.radiusMeters ?? 300)} pathOptions={{ color: geofence.isActive ? '#2563eb' : '#94a3b8' }} />;
  }

  if (Array.isArray(geofence.coordinates) && geofence.coordinates.length > 2) {
    return <Polygon positions={geofence.coordinates.map((p: any) => [Number(p.lat), Number(p.lng)])} pathOptions={{ color: geofence.isActive ? '#2563eb' : '#94a3b8' }} />;
  }

  return null;
}
