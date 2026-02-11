import L from 'leaflet';
import { MAP_STATUS_COLORS } from '@/features/map/constants/map-config';
import type { DeviceMapStatus } from '@/features/map/types';
export const createDeviceMarkerIcon = (status: DeviceMapStatus, heading = 0): L.DivIcon => {
  const color = MAP_STATUS_COLORS[status] ?? MAP_STATUS_COLORS.disconnected;
  return L.divIcon({
    className: 'device-marker-icon',
    html: `<div style="position:relative;width:30px;height:30px;transform:rotate(${heading}deg);">
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
          <path fill="${color}" d="M16 2c6.6 0 12 5.4 12 12 0 9.2-12 16-12 16S4 23.2 4 14C4 7.4 9.4 2 16 2z"/>
          <circle cx="16" cy="14" r="5" fill="#ffffff"/>
        </svg>
      </div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};
