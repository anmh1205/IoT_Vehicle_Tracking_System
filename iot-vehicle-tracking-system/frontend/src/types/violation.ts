/**
 * Violation Types
 */
import type { BaseEntity, QueryParams, DateRange } from './common';

export type ViolationType = 
  | 'speeding' 
  | 'harsh_braking' 
  | 'harsh_acceleration' 
  | 'geofence_breach'
  | 'unauthorized_use';

export interface Violation extends BaseEntity {
  vehicleId: number;
  tripId?: number;
  type: ViolationType;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  value?: number; // e.g., speed value for speeding
  threshold?: number; // e.g., speed limit
  description?: string;
}

export interface QueryViolationDto extends QueryParams, Partial<DateRange> {
  vehicleId?: number;
  tripId?: number;
  type?: ViolationType;
}

