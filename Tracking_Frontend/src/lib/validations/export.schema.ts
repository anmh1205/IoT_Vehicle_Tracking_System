import { z } from 'zod';

export const exportSchema = z
  .object({
    entityType: z.enum(['vehicles', 'trips', 'alerts', 'devices']),
    format: z.enum(['csv', 'excel']).default('csv'),
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine((data) => data.to > data.from, {
    message: 'Ngày kết thúc phải sau ngày bắt đầu',
    path: ['to'],
  });
