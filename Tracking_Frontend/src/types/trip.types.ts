export type TripStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface Trip {
  id: number;
  tripCode: string;
  vehicleId: string | null;
  deviceId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  startLocation: string | null;
  startLatitude: number | null;
  startLongitude: number | null;
  endLocation: string | null;
  endLatitude: number | null;
  endLongitude: number | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  distanceKm: number | null;
  fuelUsedLiters: number | null;
  status: TripStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripInput {
  tripCode: string;
  vehicleId?: string;
  deviceId?: string;
  driverName?: string;
  driverPhone?: string;
  startLocation?: string;
  endLocation?: string;
  plannedStart?: string;
  plannedEnd?: string;
  notes?: string;
}

export interface UpdateTripInput {
  vehicleId?: string;
  deviceId?: string;
  driverName?: string;
  driverPhone?: string;
  startLocation?: string;
  endLocation?: string;
  plannedStart?: string;
  plannedEnd?: string;
  notes?: string;
}

export interface TripListQuery {
  page?: number;
  limit?: number;
  status?: string;
  vehicleId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
