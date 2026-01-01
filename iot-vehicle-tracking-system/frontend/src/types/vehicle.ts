/**
 * Vehicle Types - Aligned with backend Vehicle entity
 */
import type { BaseEntity, QueryParams } from './common';

// Backend status enum: 'active' | 'inactive' | 'maintenance' | 'retired'
export type VehicleStatus = 'active' | 'inactive' | 'maintenance' | 'retired';

// Availability status for rental feature
export type AvailabilityStatus = 'available' | 'rented' | 'maintenance' | 'reserved' | 'inactive';

export interface Vehicle extends BaseEntity {
  vehicleId: string;
  plateNumber: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  vehicleType?: string;      // sedan, suv, truck, etc.
  vin?: string;              // Vehicle Identification Number
  seats?: number;
  transmission?: string;     // automatic, manual
  fuelType?: string;         // gasoline, diesel, electric, hybrid
  mileageKm?: number;
  registrationNumber?: string;
  insuranceExpiry?: string;  // Date string
  status: VehicleStatus;
  // Rental pricing fields (Phase 2)
  rentalPricePerDay?: number;
  rentalPricePerHour?: number;
  depositAmount?: number;
  availabilityStatus?: AvailabilityStatus;
  // Relations
  ownerId?: number;
  deviceId?: number;
  // Computed/runtime fields
  lastLocation?: VehicleLocation;
}

export interface VehicleLocation {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

export interface CreateVehicleDto {
  vehicleId: string;
  plateNumber: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  vehicleType?: string;
  vin?: string;
  seats?: number;
  transmission?: string;
  fuelType?: string;
  mileageKm?: number;
  registrationNumber?: string;
  insuranceExpiry?: string;
  status?: VehicleStatus;
  ownerId?: number;
  deviceId?: number;
}

export interface UpdateVehicleDto {
  plateNumber?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  vehicleType?: string;
  vin?: string;
  seats?: number;
  transmission?: string;
  fuelType?: string;
  mileageKm?: number;
  registrationNumber?: string;
  insuranceExpiry?: string;
  status?: VehicleStatus;
  ownerId?: number;
  deviceId?: number;
}

export interface QueryVehicleDto extends QueryParams {
  status?: VehicleStatus;
  ownerId?: number;
}

