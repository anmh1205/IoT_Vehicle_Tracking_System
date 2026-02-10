import { z } from 'zod';

export const createTripSchema = z.object({
  tripCode: z
    .string()
    .min(2, 'Trip code must be at least 2 characters')
    .max(50, 'Trip code must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Trip code can only contain letters, numbers, dashes, and underscores'),
  vehicleId: z.string().max(50).optional(),
  deviceId: z.string().max(50).optional(),
  driverName: z.string().max(200).optional(),
  driverPhone: z.string().max(20).optional(),
  startLocation: z.string().max(500).optional(),
  endLocation: z.string().max(500).optional(),
  plannedStart: z.string().datetime().optional(),
  plannedEnd: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const updateTripSchema = z.object({
  vehicleId: z.string().max(50).optional(),
  deviceId: z.string().max(50).optional(),
  driverName: z.string().max(200).optional(),
  driverPhone: z.string().max(20).optional(),
  startLocation: z.string().max(500).optional(),
  endLocation: z.string().max(500).optional(),
  plannedStart: z.string().datetime().optional(),
  plannedEnd: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const tripListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).optional(),
  vehicleId: z.string().max(50).optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['tripCode', 'status', 'plannedStart', 'actualStart', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
