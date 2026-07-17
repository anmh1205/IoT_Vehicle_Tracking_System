import { z } from 'zod';

export const createAlertSchema = z.object({
  vehicleId: z.string().max(50).optional(),
  deviceId: z.string().max(50).optional(),
  tripId: z.number().int().positive().optional(),
  geofenceId: z.number().int().positive().optional(),
  alertType: z.string().min(1).max(100),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().max(1000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  speed: z.number().min(0).optional(),
  thresholdValue: z.number().optional(),
  actualValue: z.number().optional(),
});

export const resolveAlertSchema = z.object({
  resolutionNotes: z.string().max(1000).nullable().optional(),
});

export const alertListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'acknowledged', 'resolved', 'dismissed']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  alertType: z.string().max(100).optional(),
  source: z.enum(['device', 'ecu', 'obd', 'system']).optional(),
  search: z.string().max(100).optional(),
  vehicleId: z.string().max(50).optional(),
  deviceId: z.string().max(50).optional(),
});
