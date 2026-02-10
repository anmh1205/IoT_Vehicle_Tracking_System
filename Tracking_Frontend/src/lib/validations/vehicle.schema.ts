import { z } from 'zod';

export const vehicleSchema = z.object({
  vehicleId: z.string().min(1),
  plateNumber: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  vehicleType: z.enum(['car', 'truck', 'motorcycle', 'bus', 'van']).optional(),
  year: z.coerce.number().min(1990).max(new Date().getFullYear() + 1).optional(),
  color: z.string().max(30).optional(),
  fuelType: z.enum(['gasoline', 'diesel', 'electric', 'hybrid']).optional(),
  customerId: z.coerce.number().positive().optional().nullable(),
  deviceId: z.string().max(50).optional().nullable(),
  notes: z.string().max(500).optional(),
});
