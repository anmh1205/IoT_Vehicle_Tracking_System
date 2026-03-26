import { z } from 'zod';

export const tripSchema = z.object({
  tripCode: z.string().min(1),
  vehicleId: z.string().min(1),
  deviceId: z.string().optional(),
  driverName: z.string().optional(),
  startLocation: z.string().optional(),
  endLocation: z.string().optional(),
  notes: z.string().max(500).optional(),
});
