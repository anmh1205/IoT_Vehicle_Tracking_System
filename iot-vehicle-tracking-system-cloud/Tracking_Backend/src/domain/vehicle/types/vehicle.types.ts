export interface Vehicle {
  id: number;
  vehicle_id: string;
  plate_number: string | null;
  device_id: string | null;
  customer_id: number | null;
  vehicle_type: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  vin: string | null;
  seats: number;
  transmission: string | null;
  fuel_type: string | null;
  mileage_km: number;
  registration_number: string | null;
  insurance_expiry: Date | null;
  status: 'active' | 'inactive' | 'maintenance' | 'retired';
  icon_type: string;
  color_hex: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface VehiclePublic {
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
  status: 'active' | 'inactive' | 'maintenance' | 'retired';
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
