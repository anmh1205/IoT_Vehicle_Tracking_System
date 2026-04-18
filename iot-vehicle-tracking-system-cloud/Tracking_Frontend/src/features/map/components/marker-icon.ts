import L from 'leaflet';
import { MAP_STATUS_COLORS } from '@/features/map/constants/map-config';
import type { DeviceMapStatus } from '@/features/map/types';
export const createDeviceMarkerIcon = (status: DeviceMapStatus, heading = 0): L.DivIcon => {
  const color = MAP_STATUS_COLORS[status] ?? MAP_STATUS_COLORS.disconnected;
  const normalizedHeading = Number.isFinite(heading) ? heading : 0;

  return L.divIcon({
    className: 'device-marker-icon',
    html: `<div style="position:relative;width:34px;height:34px;transform:rotate(${normalizedHeading}deg);filter:drop-shadow(0 2px 6px rgba(15,23,42,0.38));">
      <svg viewBox="0 0 56 56" width="34" height="34" aria-hidden="true">
        <path d="M28 5l5 8h-10l5-8z" fill="${color}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
        <rect x="15" y="10" width="26" height="36" rx="10" fill="${color}" stroke="#ffffff" stroke-width="2"/>
        <rect x="19" y="14" width="18" height="10" rx="4" fill="rgba(255,255,255,0.42)"/>
        <rect x="19" y="28" width="18" height="10" rx="3" fill="#ffffff"/>
        <circle cx="21" cy="43" r="3" fill="#111827"/>
        <circle cx="35" cy="43" r="3" fill="#111827"/>
      </svg>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
};
