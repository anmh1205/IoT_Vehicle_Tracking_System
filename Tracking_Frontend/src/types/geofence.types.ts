export interface Geofence {
  id: number;
  name: string;
  description: string | null;
  geofenceType: 'circle' | 'polygon' | 'rectangle';
  centerLatitude: number | null;
  centerLongitude: number | null;
  radiusMeters: number | null;
  coordinates: Array<{ lat: number; lng: number }> | null;
  triggerOn: 'enter' | 'exit' | 'both';
  isActive: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  color: string;
  displayHidden: boolean;
  createdAt: string;
}

export interface CreateGeofenceInput {
  name: string;
  geofenceType?: string;
  centerLatitude?: number;
  centerLongitude?: number;
  radiusMeters?: number;
  coordinates?: Array<{ lat: number; lng: number }>;
  triggerOn?: string;
  color?: string;
  description?: string;
}

export interface UpdateGeofenceInput extends Partial<CreateGeofenceInput> {
  isActive?: boolean;
}
