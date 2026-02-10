import * as tripRepo from '@/domain/trip/repositories/trip.repository';
import type { Trip, TripListQuery, TripPublic } from '@/domain/trip/types/trip.types';

const sanitizeTrip = (t: Trip): TripPublic => ({
  id: t.id,
  tripCode: t.trip_code,
  vehicleId: t.vehicle_id,
  deviceId: t.device_id,
  driverName: t.driver_name,
  driverPhone: t.driver_phone,
  startLocation: t.start_location,
  startLatitude: t.start_latitude,
  startLongitude: t.start_longitude,
  endLocation: t.end_location,
  endLatitude: t.end_latitude,
  endLongitude: t.end_longitude,
  plannedStart: t.planned_start?.toISOString() ?? null,
  plannedEnd: t.planned_end?.toISOString() ?? null,
  actualStart: t.actual_start?.toISOString() ?? null,
  actualEnd: t.actual_end?.toISOString() ?? null,
  distanceKm: t.distance_km,
  fuelUsedLiters: t.fuel_used_liters,
  status: t.status,
  notes: t.notes,
  createdAt: t.created_at.toISOString(),
  updatedAt: t.updated_at.toISOString(),
});

export const listTrips = async (
  query: TripListQuery,
): Promise<{ items: TripPublic[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const result = await tripRepo.findAll(query);

  return {
    items: result.trips.map(sanitizeTrip),
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};
