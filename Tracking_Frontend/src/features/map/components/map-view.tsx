'use client';

import { MapContainer } from 'react-leaflet';
import { useMemo } from 'react';
import { useMapStore } from '@/lib/stores/map-store';
import { MapLayerSwitcher } from './map-layer-switcher';
import { VehicleMarker } from './vehicle-marker';
import { GeofenceLayer } from './geofence-layer';
import { useGeofences } from '@/features/geofences/hooks/use-geofences';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

export function MapView() {
  const positions = useMapStore((s) => s.positions);
  const selectedDeviceId = useMapStore((s) => s.selectedDeviceId);
  const selectDevice = useMapStore((s) => s.selectDevice);
  const showGeofences = useMapStore((s) => s.showGeofences);

  const geofenceQuery = useGeofences();
  const geofences = geofenceQuery.data?.items ?? geofenceQuery.data?.data?.items ?? [];
  const center = useMemo<[number, number]>(() => {
    if (selectedDeviceId && positions.get(selectedDeviceId)) {
      const current = positions.get(selectedDeviceId)!;
      return [current.lat, current.lon];
    }
    const first = Array.from(positions.values())[0];
    if (first) return [first.lat, first.lon];
    return [10.762622, 106.660172];
  }, [positions, selectedDeviceId]);

  return (
    <MapContainer center={center} zoom={12} className="h-full w-full" preferCanvas>
      <MapLayerSwitcher />
      {Array.from(positions.values()).map((item) => <VehicleMarker key={item.deviceId} position={item} onSelect={selectDevice} />)}
      {showGeofences && geofences.map((gf: any) => <GeofenceLayer key={gf.id} geofence={gf} />)}
    </MapContainer>
  );
}
