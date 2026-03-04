import { z } from 'zod';

export const validationErrorListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  device_id: z.string().max(50).optional(),
  validation_type: z.enum(['json_parse', 'missing_field', 'out_of_range', 'timestamp_anomaly', 'schema']).optional(),
});
