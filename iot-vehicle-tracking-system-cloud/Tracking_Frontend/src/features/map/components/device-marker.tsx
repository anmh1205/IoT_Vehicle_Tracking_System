'use client';

import { memo, useMemo } from 'react';
import { Marker } from 'react-leaflet';
import type { DevicePosition } from '@/features/map/types';
import { createDeviceMarkerIcon } from './marker-icon';

const normalizeHeadingForCompare = (heading = 0) =>
  Number.isFinite(heading) ? Math.round(((heading % 360) + 360) % 360) : 0;

const DeviceMarkerComponent = ({
  position,
  onSelect,
}: {
  position: DevicePosition;
  onSelect: (deviceId: string) => void;
}) => {
  const markerPosition = useMemo<[number, number]>(
    () => [position.lat, position.lon],
    [position.lat, position.lon],
  );
  const markerIcon = useMemo(
    () => createDeviceMarkerIcon(position.status, position.heading),
    [position.heading, position.status],
  );
  const eventHandlers = useMemo(
    () => ({ click: () => onSelect(position.deviceId) }),
    [onSelect, position.deviceId],
  );

  return (
    <Marker
      position={markerPosition}
      icon={markerIcon}
      eventHandlers={eventHandlers}
    />
  );
};

export const DeviceMarker = memo(
  DeviceMarkerComponent,
  (previous, next) =>
    previous.onSelect === next.onSelect &&
    previous.position.deviceId === next.position.deviceId &&
    previous.position.lat === next.position.lat &&
    previous.position.lon === next.position.lon &&
    previous.position.status === next.position.status &&
    normalizeHeadingForCompare(previous.position.heading) ===
      normalizeHeadingForCompare(next.position.heading),
);
