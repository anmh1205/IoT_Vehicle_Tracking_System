import { z } from 'zod';

export const customerSchema = z.object({
  customerCode: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  taxCode: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  contactPerson: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});
