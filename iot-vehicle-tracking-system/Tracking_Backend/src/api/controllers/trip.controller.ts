import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import {
  createTripSchema,
  updateTripSchema,
  tripListQuerySchema,
} from '@/api/validators/trip.validator';
import * as tripCrudService from '@/domain/trip/services/trip-crud.service';
import * as tripListService from '@/domain/trip/services/trip-list.service';
import { getWaypoints, computeRouteSummary } from '@/domain/trip/services/trip-waypoints.service';

export const listTrips = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = tripListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
  }

  const result = await tripListService.listTrips(parsed.data);
  sendOk(res, result);
});

export const getTrip = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid trip ID');
  }

  const trip = await tripCrudService.getTripById(id);
  sendOk(res, trip);
});

export const createTrip = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createTripSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid trip data', parsed.error.flatten().fieldErrors);
  }

  const trip = await tripCrudService.createTrip(parsed.data);
  sendCreated(res, trip);
});

export const updateTrip = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid trip ID');
  }

  const parsed = updateTripSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid trip data', parsed.error.flatten().fieldErrors);
  }

  const trip = await tripCrudService.updateTrip(id, parsed.data);
  sendOk(res, trip);
});

export const deleteTrip = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid trip ID');
  }

  await tripCrudService.deleteTrip(id);
  sendOk(res, { success: true });
});

export const startTrip = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid trip ID');
  }

  const trip = await tripCrudService.startTrip(id);
  sendOk(res, trip);
});

export const endTrip = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid trip ID');
  }

  const trip = await tripCrudService.endTrip(id);
  sendOk(res, trip);
});

export const getTripTelemetry = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid trip ID');
  }

  const trip = await tripCrudService.getTripById(id);

  // Need device_id and time range to query waypoints from VictoriaMetrics
  if (!trip.deviceId) {
    sendOk(res, { tripId: id, points: [], summary: null });
    return;
  }

  const startTime = trip.actualStart ?? trip.plannedStart;
  const endTime = trip.actualEnd ?? (trip.status === 'in_progress' ? new Date().toISOString() : trip.plannedEnd);

  if (!startTime) {
    sendOk(res, { tripId: id, points: [], summary: null });
    return;
  }

  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();

  const waypoints = await getWaypoints(trip.deviceId, start, end);
  const summary = waypoints.length > 0 ? computeRouteSummary(waypoints, start, end) : null;

  sendOk(res, { tripId: id, points: waypoints, summary });
});
