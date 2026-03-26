import { z } from 'zod';

export const alertSchema = z.object({
  deviceId: z.string().min(1).max(50),
  vehicleId: z.string().max(50).optional(),
  alertType: z.enum(['speeding', 'geofence', 'offline', 'maintenance', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: z.string().min(1).max(500),
  occurredAt: z.string().datetime().optional(),
});

export const alertResolveSchema = z.object({
  resolutionNote: z.string().min(1).max(500),
});
