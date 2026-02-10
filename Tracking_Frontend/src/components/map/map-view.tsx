'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { VehicleMarker } from './vehicle-marker';
import { GeofenceLayer } from './geofence-layer';
import type { DevicePosition } from '@/types/device.types';
import type { Geofence } from '@/types/geofence.types';

// Fix Leaflet default icon issue in Next.js bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const VIETNAM_CENTER: [number, number] = [21.0285, 105.8542];
const DEFAULT_ZOOM = 6;

export interface MapViewProps {
  positions: DevicePosition[];
  geofences: Geofence[];
  selectedDeviceId?: string | null;
  onSelectDevice?: (position: DevicePosition) => void;
  onSelectGeofence?: (geofence: Geofence) => void;
}

function FlyToDevice({ deviceId, positions }: { deviceId: string | null | undefined; positions: DevicePosition[] }) {
  const map = useMap();

  useEffect(() => {
    if (!deviceId) return;
    const pos = positions.find((p) => p.deviceId === deviceId);
    if (pos) {
      map.flyTo([pos.latitude, pos.longitude], 15, { duration: 1.2 });
    }
  }, [deviceId, positions, map]);

  return null;
}

export default function MapView({
  positions,
  geofences,
  selectedDeviceId,
  onSelectDevice,
  onSelectGeofence,
}: MapViewProps) {
  return (
    <MapContainer
      center={VIETNAM_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      zoomControl={true}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToDevice deviceId={selectedDeviceId} positions={positions} />

      {geofences.map((gf) => (
        <GeofenceLayer key={gf.id} geofence={gf} onClick={onSelectGeofence} />
      ))}

      {positions.map((pos) => (
        <VehicleMarker key={pos.deviceId} position={pos} onClick={onSelectDevice} />
      ))}
    </MapContainer>
  );
}
