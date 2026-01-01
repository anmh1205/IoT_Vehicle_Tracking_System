/**
 * Trip Types
 */
import type { BaseEntity, QueryParams, DateRange } from './common';

export type TripStatus = 'active' | 'completed' | 'cancelled';

export interface Trip extends BaseEntity {
  vehicleId: number;
  driverId?: number;
  status: TripStatus;
  startTime: string;
  endTime?: string;
  startLocation?: TripLocation;
  endLocation?: TripLocation;
  distance?: number;
  duration?: number;
  maxSpeed?: number;
  avgSpeed?: number;
}

export interface TripLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface TripEvent {
  id: number;
  tripId: number;
  type: string;
  timestamp: string;
  location?: TripLocation;
  data?: Record<string, unknown>;
}

export interface TripRoute {
  tripId: number;
  points: Array<{
    latitude: number;
    longitude: number;
    timestamp: string;
    speed?: number;
  }>;
}

export interface QueryTripDto extends QueryParams, Partial<DateRange> {
  vehicleId?: number;
  status?: TripStatus;
}

