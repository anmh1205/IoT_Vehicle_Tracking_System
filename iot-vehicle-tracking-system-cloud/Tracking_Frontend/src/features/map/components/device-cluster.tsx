'use client';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { divIcon, point } from 'leaflet';
import { DeviceMarker } from './device-marker';
import type { DevicePosition } from '@/features/map/types';

const resolveClusterTier = (count: number) => {
  if (count >= 100) {
    return 'xl';
  }
  if (count >= 40) {
    return 'lg';
  }
  if (count >= 15) {
    return 'md';
  }
  return 'sm';
};

const createClusterIcon = (cluster: { getChildCount: () => number }) => {
  const count = cluster.getChildCount();
  const tier = resolveClusterTier(count);
  const iconSize =
    tier === 'xl' ? 70 : tier === 'lg' ? 64 : tier === 'md' ? 58 : 52;

  return divIcon({
    html: `<span class="tracking-map-cluster__count">${count}</span>`,
    className: `tracking-map-cluster tracking-map-cluster--${tier}`,
    iconSize: point(iconSize, iconSize, true),
  });
};

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
      maxClusterRadius={64}
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
      iconCreateFunction={createClusterIcon}
    >
      {devices.map((device) => (
        <DeviceMarker key={device.deviceId} position={device} onSelect={onSelect} />
      ))}
    </MarkerClusterGroup>
  );
};
