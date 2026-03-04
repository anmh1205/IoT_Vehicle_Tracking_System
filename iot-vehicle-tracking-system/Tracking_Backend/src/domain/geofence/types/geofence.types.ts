export interface Geofence {
  id: number;
  name: string;
  description: string | null;
  geofence_type: 'circle' | 'polygon' | 'rectangle';
  center_latitude: number | null;
  center_longitude: number | null;
  radius_meters: number | null;
  coordinates: unknown | null;
  trigger_on: 'enter' | 'exit' | 'both';
  is_active: boolean;
  notify_email: boolean;
  notify_push: boolean;
  color: string;
  display_hidden: boolean;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface GeofencePublic {
  id: number;
  name: string;
  description: string | null;
  geofenceType: 'circle' | 'polygon' | 'rectangle';
  centerLatitude: number | null;
  centerLongitude: number | null;
  radiusMeters: number | null;
  coordinates: unknown | null;
  triggerOn: 'enter' | 'exit' | 'both';
  isActive: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  color: string;
  displayHidden: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGeofenceInput {
  name: string;
  geofenceType?: string;
  centerLatitude?: number;
  centerLongitude?: number;
  radiusMeters?: number;
  coordinates?: unknown;
  triggerOn?: string;
  notifyEmail?: boolean;
  notifyPush?: boolean;
  color?: string;
  description?: string;
}

export interface UpdateGeofenceInput extends Partial<CreateGeofenceInput> {
  isActive?: boolean;
  displayHidden?: boolean;
}

export interface GeofenceListQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
  geofenceType?: string;
  search?: string;
}
