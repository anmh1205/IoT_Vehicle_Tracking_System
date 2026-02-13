import { z } from 'zod';

export const maintenanceSchema = z.object({
  vehicleId: z.string().min(1),
  maintenanceType: z.string().min(1),
  title: z.string().min(1),
  scheduledDate: z.string().optional(),
  nextServiceMileage: z.coerce.number().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  notes: z.string().max(500).optional(),
});
