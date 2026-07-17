import L from 'leaflet';
import { MAP_STATUS_COLORS } from '@/features/map/constants/map-config';
import type { DeviceMapStatus } from '@/features/map/types';

const markerIconCache = new Map<string, L.DivIcon>();

const normalizeHeadingForIcon = (heading = 0) => {
  if (!Number.isFinite(heading)) {
    return 0;
  }

  return Math.round(((heading % 360) + 360) % 360);
};

export const createDeviceMarkerIcon = (status: DeviceMapStatus, heading = 0): L.DivIcon => {
  const color = MAP_STATUS_COLORS[status] ?? MAP_STATUS_COLORS.disconnected;
  const normalizedHeading = normalizeHeadingForIcon(heading);
  const cacheKey = `${status}:${normalizedHeading}`;
  const cachedIcon = markerIconCache.get(cacheKey);

  if (cachedIcon) {
    return cachedIcon;
  }

  const icon = L.divIcon({
    className: 'device-marker-icon',
    html: `<div style="position:relative;width:40px;height:40px;transform:rotate(${normalizedHeading}deg);filter:drop-shadow(0 6px 10px rgba(15,23,42,0.28));">
      <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
        <path d="M32 4l7 11H25L32 4Z" fill="${color}" stroke="#ffffff" stroke-width="2.6" stroke-linejoin="round"/>
        <rect x="18" y="14" width="28" height="40" rx="13" fill="${color}" stroke="#ffffff" stroke-width="2.6"/>
        <path d="M24 19h16c4.4 0 8 3.6 8 8v7H16v-7c0-4.4 3.6-8 8-8Z" fill="rgba(255,255,255,0.28)"/>
        <rect x="22" y="20" width="20" height="11" rx="5.5" fill="rgba(255,255,255,0.7)"/>
        <rect x="22" y="35" width="20" height="12" rx="4.5" fill="#ffffff"/>
        <rect x="21" y="15" width="22" height="5" rx="2.5" fill="rgba(255,255,255,0.18)"/>
        <circle cx="18" cy="25" r="3.5" fill="#111827"/>
        <circle cx="46" cy="25" r="3.5" fill="#111827"/>
        <circle cx="18" cy="43" r="3.5" fill="#111827"/>
        <circle cx="46" cy="43" r="3.5" fill="#111827"/>
        <rect x="27" y="37" width="10" height="8" rx="2" fill="${color}" opacity="0.2"/>
        <circle cx="24" cy="52" r="2" fill="#f8fafc"/>
        <circle cx="40" cy="52" r="2" fill="#f8fafc"/>
      </svg>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });

  markerIconCache.set(cacheKey, icon);

  return icon;
};
