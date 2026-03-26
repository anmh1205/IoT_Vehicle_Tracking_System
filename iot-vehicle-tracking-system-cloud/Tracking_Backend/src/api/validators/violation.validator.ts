import { z } from 'zod';

export const createViolationSchema = z.object({
  alertId: z.number().int().positive().optional(),
  vehicleId: z.string().max(50).optional(),
  driverId: z.number().int().positive().optional(),
  violationType: z.string().min(1).max(50),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  description: z.string().max(1000).optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLon: z.number().min(-180).max(180).optional(),
  speedLimit: z.number().min(0).optional(),
  actualSpeed: z.number().min(0).optional(),
  fineAmount: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

export const acknowledgeViolationSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export const violationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  vehicleId: z.string().max(50).optional(),
  driverId: z.coerce.number().int().positive().optional(),
  violationType: z.string().max(50).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  acknowledged: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});
