'use client';

import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { DevicePosition } from '@/types/device.types';

const STATUS_COLORS: Record<string, string> = {
  running: '#10b981',
  stopped: '#f59e0b',
  disconnected: '#a1a1aa',
};

function createVehicleIcon(status: string) {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.disconnected;
  return L.divIcon({
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
    html: `
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid #fff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      "></div>
    `,
  });
}

interface VehicleMarkerProps {
  position: DevicePosition;
  isSelected?: boolean;
  onClick?: (position: DevicePosition) => void;
}

export function VehicleMarker({ position, onClick }: VehicleMarkerProps) {
  const icon = createVehicleIcon(position.currentStatus);

  function formatLastSeen(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  }

  return (
    <Marker
      position={[position.latitude, position.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(position),
      }}
    >
      <Popup>
        <div style={{ minWidth: 160, fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
            {position.deviceName}
          </div>
          <div style={{ fontSize: 12, color: '#71717a', marginBottom: 2 }}>
            ID: {position.deviceId}
          </div>
          <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: STATUS_COLORS[position.currentStatus] ?? '#a1a1aa',
                display: 'inline-block',
              }}
            />
            {position.currentStatus}
          </div>
          <div style={{ fontSize: 11, color: '#a1a1aa' }}>
            Last seen: {formatLastSeen(position.lastSeenAt)}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
