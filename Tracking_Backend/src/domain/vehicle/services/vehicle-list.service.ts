import * as vehicleRepo from '@/domain/vehicle/repositories/vehicle.repository';
import type { Vehicle, VehicleListQuery, VehiclePublic } from '@/domain/vehicle/types/vehicle.types';

const sanitizeVehicle = (v: Vehicle): VehiclePublic => ({
  id: v.id,
  vehicleId: v.vehicle_id,
  plateNumber: v.plate_number,
  deviceId: v.device_id,
  customerId: v.customer_id,
  vehicleType: v.vehicle_type,
  brand: v.brand,
  model: v.model,
  year: v.year,
  color: v.color,
  vin: v.vin,
  seats: v.seats,
  transmission: v.transmission,
  fuelType: v.fuel_type,
  mileageKm: v.mileage_km,
  registrationNumber: v.registration_number,
  insuranceExpiry: v.insurance_expiry?.toISOString() ?? null,
  status: v.status,
  iconType: v.icon_type,
  colorHex: v.color_hex,
  notes: v.notes,
  createdAt: v.created_at.toISOString(),
  updatedAt: v.updated_at.toISOString(),
});

export const listVehicles = async (
  query: VehicleListQuery,
): Promise<{ items: VehiclePublic[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const result = await vehicleRepo.findAll(query);

  return {
    items: result.vehicles.map(sanitizeVehicle),
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};
