export interface Driver {
  id: number;
  driver_code: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  license_type: string | null;
  license_expiry: Date | null;
  date_of_birth: Date | null;
  address: string | null;
  avatar_url: string | null;
  status: 'active' | 'inactive' | 'suspended';
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export type DriverTripStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface DriverAssignment {
  tripCount: number;
  activeTripCount: number;
  latestTripId: number | null;
  latestTripCode: string | null;
  latestTripStatus: DriverTripStatus | null;
  latestTripAt: string | null;
  latestVehicleId: string | null;
  latestDeviceId: string | null;
  latestStartLocation: string | null;
  latestEndLocation: string | null;
  activeTripCode: string | null;
  activeVehicleId: string | null;
  activeDeviceId: string | null;
}

export interface DriverRecentTrip {
  id: number;
  tripCode: string;
  vehicleId: string | null;
  deviceId: string | null;
  status: DriverTripStatus;
  plannedStart: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  startLocation: string | null;
  endLocation: string | null;
  distanceKm: number | null;
  updatedAt: string;
}

export interface DriverPublic {
  id: number;
  driverCode: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  licenseNumber: string | null;
  licenseType: string | null;
  licenseExpiry: string | null;
  dateOfBirth: string | null;
  address: string | null;
  avatarUrl: string | null;
  status: 'active' | 'inactive' | 'suspended';
  notes: string | null;
  assignment: DriverAssignment | null;
  recentTrips?: DriverRecentTrip[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDriverInput {
  driverCode: string;
  fullName: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  licenseType?: string;
  licenseExpiry?: string;
  dateOfBirth?: string;
  address?: string;
  avatarUrl?: string;
  status?: 'active' | 'inactive' | 'suspended';
  notes?: string;
}

export interface UpdateDriverInput extends Partial<CreateDriverInput> {}

export interface DriverListQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
