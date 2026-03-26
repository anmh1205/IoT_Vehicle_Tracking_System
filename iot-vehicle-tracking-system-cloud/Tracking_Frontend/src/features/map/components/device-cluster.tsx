'use client';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { DeviceMarker } from './device-marker';
import type { DevicePosition } from '@/features/map/types';
export const DeviceCluster = ({
  devices,
  onSelect,
}: {
  devices: DevicePosition[];
  onSelect: (deviceId: string) => void;
}) => {
  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={50}
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
    >
      {devices.map((device) => (
        <DeviceMarker key={device.deviceId} position={device} onSelect={onSelect} />
      ))}
    </MarkerClusterGroup>
  );
};
