'use client';
import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
const STATUS_LABELS: Record<string, string> = {
  running: 'Đang chạy',
  online: 'Trực tuyến',
  stopped: 'Dừng',
  disconnected: 'Mất kết nối',
};
const makeIcon = (status: string) =>
  L.divIcon({
    className: 'vehicle-marker',
    html: `<div style="width:14px;height:14px;border-radius:999px;background:${status === 'running' || status === 'online' ? '#22c55e' : status === 'stopped' ? '#f59e0b' : '#ef4444'};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.2);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
export const VehicleMarker = ({
  position,
  onSelect,
}: {
  position: any;
  onSelect: (id: string) => void;
}) => {
  return (
    <Marker
      position={[position.lat, position.lon]}
      icon={makeIcon(position.status)}
      eventHandlers={{ click: () => onSelect(position.deviceId) }}
    >
      <Popup>
        <div className="text-sm">
          <div className="font-medium">{position.deviceName}</div>
          <div>
            {STATUS_LABELS[position.status] ?? position.status} - {position.speed} km/h
          </div>
        </div>
      </Popup>
    </Marker>
  );
};
