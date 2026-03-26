'use client';
import { Marker, Popup } from 'react-leaflet';
import { createDeviceMarkerIcon } from './marker-icon';
import { MAP_STATUS_LABELS } from '@/features/map/constants/map-config';
import type { DevicePosition } from '@/features/map/types';
export const DeviceMarker = ({
  position,
  onSelect,
}: {
  position: DevicePosition;
  onSelect: (deviceId: string) => void;
}) => {
  return (
    <Marker
      position={[position.lat, position.lon]}
      icon={createDeviceMarkerIcon(position.status, position.heading)}
      eventHandlers={{ click: () => onSelect(position.deviceId) }}
    >
      <Popup>
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{position.deviceName}</p>
          <p className="text-xs text-muted-foreground">ID: {position.deviceId}</p>
          <p>Trạng thái: {MAP_STATUS_LABELS[position.status]}</p>
          <p>Tốc độ: {position.speed} km/h</p>
          <p>
            Vĩ độ/Kinh độ: {position.lat.toFixed(5)}, {position.lon.toFixed(5)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
};
