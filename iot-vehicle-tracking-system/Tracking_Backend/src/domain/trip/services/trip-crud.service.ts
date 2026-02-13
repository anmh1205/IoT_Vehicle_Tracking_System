import {
  createNotFoundError,
  createConflictError,
  createValidationError,
} from '@/shared/utils/errors.util';
import * as tripRepo from '@/domain/trip/repositories/trip.repository';
import { logger } from '@/infrastructure/logger';
import type {
  Trip,
  CreateTripInput,
  UpdateTripInput,
  TripPublic,
} from '@/domain/trip/types/trip.types';

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

export const getTripById = async (id: number): Promise<TripPublic> => {
  const trip = await tripRepo.findById(id);
  if (!trip) {
    throw createNotFoundError(`Trip with ID ${id} not found`);
  }
  return sanitizeTrip(trip);
};

export const createTrip = async (input: CreateTripInput): Promise<TripPublic> => {
  const existing = await tripRepo.findByTripCode(input.tripCode);
  if (existing) {
    throw createConflictError(`Trip with code "${input.tripCode}" already exists`);
  }

  const trip = await tripRepo.create(input);
  logger.info(`Trip "${input.tripCode}" created successfully`);
  return sanitizeTrip(trip);
};

export const updateTrip = async (id: number, input: UpdateTripInput): Promise<TripPublic> => {
  const existing = await tripRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Trip with ID ${id} not found`);
  }

  const updated = await tripRepo.update(id, input);
  if (!updated) {
    throw createNotFoundError(`Trip with ID ${id} not found`);
  }

  logger.info(`Trip "${existing.trip_code}" updated successfully`);
  return sanitizeTrip(updated);
};

export const deleteTrip = async (id: number): Promise<void> => {
  const existing = await tripRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Trip with ID ${id} not found`);
  }

  await tripRepo.remove(id);
  logger.info(`Trip "${existing.trip_code}" deleted successfully`);
};

export const startTrip = async (id: number): Promise<TripPublic> => {
  const existing = await tripRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Trip with ID ${id} not found`);
  }

  if (existing.status !== 'planned') {
    throw createValidationError(
      `Trip can only be started from "planned" status, current status is "${existing.status}"`,
    );
  }

  const updated = await tripRepo.startTrip(id);
  if (!updated) {
    throw createNotFoundError(`Trip with ID ${id} not found`);
  }

  logger.info(`Trip "${existing.trip_code}" started`);
  return sanitizeTrip(updated);
};

export const endTrip = async (id: number): Promise<TripPublic> => {
  const existing = await tripRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Trip with ID ${id} not found`);
  }

  if (existing.status !== 'in_progress') {
    throw createValidationError(
      `Trip can only be ended from "in_progress" status, current status is "${existing.status}"`,
    );
  }

  const updated = await tripRepo.endTrip(id);
  if (!updated) {
    throw createNotFoundError(`Trip with ID ${id} not found`);
  }

  logger.info(`Trip "${existing.trip_code}" ended`);
  return sanitizeTrip(updated);
};
