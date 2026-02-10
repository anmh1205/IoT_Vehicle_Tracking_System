import { z } from 'zod';

export const geofenceSchema = z.object({
  name: z.string().min(1),
  geofenceType: z.enum(['circle', 'polygon']),
  centerLatitude: z.coerce.number(),
  centerLongitude: z.coerce.number(),
  radiusMeters: z.coerce.number().positive(),
  triggerOn: z.enum(['enter', 'exit', 'both']).default('both'),
});
