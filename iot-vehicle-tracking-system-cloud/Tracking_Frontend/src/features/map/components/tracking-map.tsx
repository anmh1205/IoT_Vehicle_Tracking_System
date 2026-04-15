'use client';
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useGeofences } from '@/features/geofences/hooks/use-geofences';
import { hasValidMapCoordinates, MAP_LAYER_CONFIG } from '@/features/map/constants/map-config';
import type { DevicePosition } from '@/features/map/types';
import { useMapStore } from '@/features/map/store/map-store';
import { GeofenceLayer } from './geofence-layer';
import { DeviceCluster } from './device-cluster';
import { MapControls } from './map-controls';

const FollowSelectedDevice = ({ device }: { device: DevicePosition | null }) => {
  const map = useMap();
  const followMode = useMapStore((state) => state.followMode);

  useEffect(() => {
    if (!followMode || !device || !hasValidMapCoordinates(device)) {
      return;
    }
    map.flyTo([device.lat, device.lon], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.5,
    });
  }, [device, followMode, map]);
  return null;
};

const RevealSelectedDevice = ({ device }: { device: DevicePosition | null }) => {
  const map = useMap();
  const followMode = useMapStore((state) => state.followMode);

  useEffect(() => {
    if (followMode || !device || !hasValidMapCoordinates(device)) {
      return;
    }
    map.panInside([device.lat, device.lon], {
      animate: true,
      duration: 0.4,
      paddingTopLeft: [340, 24],
      paddingBottomRight: [24, 24],
    });
  }, [device, followMode, map]);

  return null;
};

const filterDevices = (
  devices: DevicePosition[],
  searchTerm: string,
  statusFilter: 'all' | DevicePosition['status'],
) =>
  devices.filter((device) => {
    const keyword = searchTerm.trim().toLowerCase();
    const matchesSearch =
      keyword.length === 0 ||
      device.deviceName.toLowerCase().includes(keyword) ||
      device.deviceId.toLowerCase().includes(keyword) ||
      (device.vehiclePlate ?? '').toLowerCase().includes(keyword);
    const matchesStatus = statusFilter === 'all' || statusFilter === device.status;
    return matchesSearch && matchesStatus;
  });
export const TrackingMap = () => {
  const positions = useMapStore((state) => state.positions);
  const selectedDeviceId = useMapStore((state) => state.selectedDeviceId);
  const setSelectedDevice = useMapStore((state) => state.setSelectedDevice);
  const showGeofences = useMapStore((state) => state.showGeofences);
  const mapLayer = useMapStore((state) => state.mapLayer);
  const mapViewport = useMapStore((state) => state.mapViewport);
  const searchTerm = useMapStore((state) => state.searchTerm);
  const statusFilter = useMapStore((state) => state.statusFilter);
  const devices = useMemo(() => Array.from(positions.values()), [positions]);
  const filteredDevices = useMemo(
    () => filterDevices(devices, searchTerm, statusFilter),
    [devices, searchTerm, statusFilter],
  );
  const selectedDevice = selectedDeviceId ? (positions.get(selectedDeviceId) ?? null) : null;
  const mapDevices = useMemo(
    () => filteredDevices.filter((device) => hasValidMapCoordinates(device)),
    [filteredDevices],
  );
  const geofenceQuery = useGeofences();
  const geofences = geofenceQuery.data?.items ?? geofenceQuery.data?.data?.items ?? [];
  const layer = MAP_LAYER_CONFIG[mapLayer];
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={mapViewport.center}
        zoom={mapViewport.zoom}
        className="h-full w-full"
        preferCanvas
      >
        <TileLayer attribution={layer.attribution} url={layer.url} />

        <DeviceCluster devices={mapDevices} onSelect={setSelectedDevice} />

        {showGeofences
          ? geofences.map((geofence: any) => (
              <GeofenceLayer key={geofence.id} geofence={geofence} />
            ))
          : null}

        <MapControls devices={mapDevices} />
        <RevealSelectedDevice device={selectedDevice} />
        <FollowSelectedDevice device={selectedDevice} />
      </MapContainer>
    </div>
  );
};
