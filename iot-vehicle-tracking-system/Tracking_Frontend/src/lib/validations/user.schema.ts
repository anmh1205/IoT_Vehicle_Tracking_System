import { z } from 'zod';

export const userSchema = z.object({
  username: z.string().min(3).max(50),
  fullName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  role: z.enum(['admin', 'operator', 'viewer']),
  status: z.enum(['active', 'inactive']).default('active'),
});
