import { z } from 'zod';

const nullableString = (max: number) => z.string().max(max).nullable().optional();
const nullableEmail = z.union([z.string().email().max(255), z.null()]).optional();

export const createCustomerSchema = z.object({
  customerCode: z
    .string()
    .min(2, 'Customer code must be at least 2 characters')
    .max(50, 'Customer code must not exceed 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Customer code can only contain letters, numbers, dashes, and underscores',
    ),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name must not exceed 200 characters'),
  customerType: z.enum(['individual', 'company']).optional(),
  email: z.string().email('Invalid email format').max(255).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  taxCode: z.string().max(50).optional(),
  contactPerson: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  customerType: z.enum(['individual', 'company']).optional(),
  email: nullableEmail,
  phone: nullableString(20),
  address: nullableString(500),
  taxCode: nullableString(50),
  contactPerson: nullableString(200),
  notes: nullableString(500),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  customerType: z.enum(['individual', 'company']).optional(),
  search: z.string().max(100).optional(),
});
