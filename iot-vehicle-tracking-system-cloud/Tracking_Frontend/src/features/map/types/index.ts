export type DeviceMapStatus = 'running' | 'stopped' | 'error' | 'disconnected' | 'online';

export interface DevicePosition {
  deviceId: string;
  deviceName: string;
  vehiclePlate: string | null;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  status: DeviceMapStatus;
  timestamp: number | null;
  battery?: number | null;
  vibration?: number | null;
  temperature?: number | null;
}

export type MapLayer = 'street' | 'satellite';

export interface MapViewport {
  center: [number, number];
  zoom: number;
}
