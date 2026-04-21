export type DeviceMapStatus = 'running' | 'stopped' | 'error' | 'disconnected' | 'online';

export interface DevicePosition {
  deviceId: string;
  deviceName: string;
  vehicleId?: string | null;
  vehiclePlate: string | null;
  customerName?: string | null;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  status: DeviceMapStatus;
  timestamp: number | null;
  battery?: number | null;
  deviceBattery?: number | null;
  vehicleBattery?: number | null;
  vibration?: number | null;
  temperature?: number | null;
  engineTemperature?: number | null;
  rpm?: number | null;
  activeAlertCount?: number;
  activeAlertTitles?: string[];
}

export type MapLayer = 'street' | 'satellite';

export interface MapViewport {
  center: [number, number];
  zoom: number;
}
