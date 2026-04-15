'use client';

import { Marker } from 'react-leaflet';
import type { DevicePosition } from '@/features/map/types';
import { createDeviceMarkerIcon } from './marker-icon';

export const DeviceMarker = ({
  position,
  onSelect,
}: {
  position: DevicePosition;
  onSelect: (deviceId: string) => void;
}) => (
  <Marker
    position={[position.lat, position.lon]}
    icon={createDeviceMarkerIcon(position.status, position.heading)}
    eventHandlers={{ click: () => onSelect(position.deviceId) }}
  />
);
