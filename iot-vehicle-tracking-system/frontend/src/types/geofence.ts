/**
 * Geofence Types
 */
import type { BaseEntity, QueryParams } from './common';

export type GeofenceType = 'circle' | 'polygon';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Geofence extends BaseEntity {
  name: string;
  description?: string;
  type: GeofenceType;
  isActive: boolean;
  // For circle type
  center?: GeoPoint;
  radius?: number;
  // For polygon type
  coordinates?: GeoPoint[];
  // Assigned vehicles
  vehicleIds?: number[];
}

export interface CreateGeofenceDto {
  name: string;
  description?: string;
  type: GeofenceType;
  center?: GeoPoint;
  radius?: number;
  coordinates?: GeoPoint[];
}

export interface UpdateGeofenceDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  center?: GeoPoint;
  radius?: number;
  coordinates?: GeoPoint[];
}

export interface AssignVehiclesToGeofenceDto {
  vehicleIds: number[];
}

export interface QueryGeofenceDto extends QueryParams {
  isActive?: boolean;
  type?: GeofenceType;
}

