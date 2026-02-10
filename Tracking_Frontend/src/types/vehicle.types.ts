export type VehicleStatus = 'active' | 'inactive' | 'maintenance' | 'retired';

export interface Vehicle {
  id: number;
  vehicleId: string;
  plateNumber: string | null;
  deviceId: string | null;
  customerId: number | null;
  vehicleType: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  vin: string | null;
  seats: number;
  transmission: string | null;
  fuelType: string | null;
  mileageKm: number;
  registrationNumber: string | null;
  insuranceExpiry: string | null;
  status: VehicleStatus;
  iconType: string;
  colorHex: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleInput {
  vehicleId: string;
  plateNumber?: string;
  deviceId?: string;
  customerId?: number;
  vehicleType?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  vin?: string;
  seats?: number;
  transmission?: string;
  fuelType?: string;
  mileageKm?: number;
  registrationNumber?: string;
  insuranceExpiry?: string;
  iconType?: string;
  colorHex?: string;
  notes?: string;
}

export interface UpdateVehicleInput extends Partial<CreateVehicleInput> {}

export interface VehicleListQuery {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
