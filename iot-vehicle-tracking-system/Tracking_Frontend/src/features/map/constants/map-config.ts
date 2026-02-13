import type { DeviceMapStatus, MapLayer, MapViewport } from '@/features/map/types';

export const DEFAULT_MAP_VIEWPORT: MapViewport = {
  center: [10.762622, 106.660172],
  zoom: 12,
};

export const MAP_LAYER_CONFIG: Record<
  MapLayer,
  {
    label: string;
    url: string;
    attribution: string;
  }
> = {
  street: {
    label: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
};

export const MAP_STATUS_COLORS: Record<DeviceMapStatus, string> = {
  running: '#22c55e',
  stopped: '#6b7280',
  error: '#ef4444',
  disconnected: '#eab308',
};

export const MAP_STATUS_LABELS: Record<DeviceMapStatus, string> = {
  running: 'Running',
  stopped: 'Stopped',
  error: 'Error',
  disconnected: 'Disconnected',
};

export const MAP_REALTIME_THROTTLE_MS = 500;
