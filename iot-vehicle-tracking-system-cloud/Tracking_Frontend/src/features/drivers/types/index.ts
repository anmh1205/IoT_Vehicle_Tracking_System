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

export interface Driver {
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
  status?: 'active' | 'inactive' | 'suspended';
  notes?: string;
}

export type UpdateDriverInput = Partial<CreateDriverInput>;
