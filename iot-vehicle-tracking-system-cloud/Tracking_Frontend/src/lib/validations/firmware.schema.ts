import { z } from 'zod';

export const firmwareUploadSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().max(500).optional(),
  filename: z.string().min(1),
  size: z.coerce.number().positive(),
});

export const firmwareAssignSchema = z.object({
  deviceIds: z.array(z.string()).min(1),
  strategy: z.enum(['rolling', 'all_at_once']).default('rolling'),
  batchSize: z.coerce.number().min(1).max(100).default(10),
});
