import type { DeviceMapStatus, DevicePosition, MapLayer, MapViewport } from '@/features/map/types';

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
    label: 'Đường phố',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    label: 'Vệ tinh',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
};

export const MAP_STATUS_COLORS: Record<DeviceMapStatus, string> = {
  running: '#22c55e',
  online: '#0ea5e9',
  stopped: '#6b7280',
  error: '#ef4444',
  disconnected: '#eab308',
};

export const MAP_STATUS_LABELS: Record<DeviceMapStatus, string> = {
  running: 'Đang gửi dữ liệu',
  online: 'Còn heartbeat',
  stopped: 'Chậm nhịp',
  error: 'Lỗi telemetry',
  disconnected: 'Mất kết nối',
};

export const MAP_STATUS_FILTER_OPTIONS: Array<{
  value: DeviceMapStatus;
  label: string;
}> = [
  { value: 'running', label: MAP_STATUS_LABELS.running },
  { value: 'online', label: MAP_STATUS_LABELS.online },
  { value: 'stopped', label: MAP_STATUS_LABELS.stopped },
  { value: 'error', label: MAP_STATUS_LABELS.error },
  { value: 'disconnected', label: MAP_STATUS_LABELS.disconnected },
];

export const MAP_REALTIME_THROTTLE_MS = 500;

export const parseMapTimestamp = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }
  return null;
};

export const hasValidMapCoordinates = (
  position: Pick<DevicePosition, 'lat' | 'lon'> | { lat: number; lon: number },
) =>
  Number.isFinite(position.lat) &&
  Number.isFinite(position.lon) &&
  Math.abs(position.lat) <= 90 &&
  Math.abs(position.lon) <= 180 &&
  !(position.lat === 0 && position.lon === 0);
