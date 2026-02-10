export interface DevicePosition {
  deviceId: string;
  deviceName: string;
  vehiclePlate: string | null;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  status: 'running' | 'stopped' | 'disconnected';
  timestamp: number;
}

export interface GeofenceMapItem {
  id: number;
  name: string;
  geofenceType: 'circle' | 'polygon' | 'rectangle';
  centerLatitude?: number;
  centerLongitude?: number;
  radiusMeters?: number;
  coordinates?: { lat: number; lng: number }[];
  isActive: boolean;
}
