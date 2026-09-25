'use client';

import { memo, useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import type { DevicePosition } from '@/features/map/types';
import { createDeviceMarkerIcon } from './marker-icon';

const normalizeHeadingForCompare = (heading = 0) =>
  Number.isFinite(heading) ? Math.round(((heading % 360) + 360) % 360) : 0;

const formatSpeed = (speed: number | undefined | null): string => {
  if (speed === undefined || speed === null || !Number.isFinite(speed) || speed < 0.5) {
    return '0 km/h';
  }
  return `${Math.round(speed)} km/h`;
};

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

  const label = position.vehiclePlate || position.deviceName || position.deviceId;
  const speedText = formatSpeed(position.speed);

  return (
    <Marker
      position={markerPosition}
      icon={markerIcon}
      eventHandlers={eventHandlers}
    >
      <Tooltip
        direction="bottom"
        offset={[0, 10]}
        permanent
        className="device-marker-label"
      >
        <span className="device-marker-label__text">{label} · {speedText}</span>
      </Tooltip>
    </Marker>
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
    previous.position.speed === next.position.speed &&
    previous.position.vehiclePlate === next.position.vehiclePlate &&
    previous.position.deviceName === next.position.deviceName &&
    normalizeHeadingForCompare(previous.position.heading) ===
      normalizeHeadingForCompare(next.position.heading),
);
