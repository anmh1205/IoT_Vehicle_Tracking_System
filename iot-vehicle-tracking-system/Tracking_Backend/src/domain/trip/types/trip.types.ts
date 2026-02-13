export interface Trip {
  id: number;
  trip_code: string;
  vehicle_id: string | null;
  device_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  start_location: string | null;
  start_latitude: number | null;
  start_longitude: number | null;
  end_location: string | null;
  end_latitude: number | null;
  end_longitude: number | null;
  planned_start: Date | null;
  planned_end: Date | null;
  actual_start: Date | null;
  actual_end: Date | null;
  distance_km: number | null;
  fuel_used_liters: number | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TripPublic {
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
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
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

export interface UpdateTripInput extends Partial<Omit<CreateTripInput, 'tripCode'>> {}

export interface TripListQuery {
  page?: number;
  limit?: number;
  status?: string;
  vehicleId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
