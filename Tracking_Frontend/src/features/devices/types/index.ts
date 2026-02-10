export interface Device {
  id: number;
  deviceId: string;
  deviceName: string;
  currentStatus: 'running' | 'stopped' | 'disconnected';
  imei: string | null;
  firmwareVersion: string | null;
  vehiclePlate?: string | null;
  customerName?: string | null;
  lastSeenAt: string | null;
  latitude: number | null;
  longitude: number | null;
}
