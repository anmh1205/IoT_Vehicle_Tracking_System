import { z } from 'zod';

const nullableString = (max: number) => z.string().max(max).nullable().optional();
const nullableDateString = z.string().nullable().optional();
const nullableEmail = z
  .union([z.string().email('Invalid email address').max(100), z.literal(''), z.null()])
  .optional();
const nullableUrl = z.union([z.string().url(), z.literal(''), z.null()]).optional();

export const createDriverSchema = z.object({
  driverCode: z
    .string()
    .min(2, 'Driver code must be at least 2 characters')
    .max(50, 'Driver code must not exceed 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Driver code can only contain letters, numbers, dashes, and underscores',
    ),
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(200, 'Full name must not exceed 200 characters'),
  phone: z.string().max(20).optional(),
  email: z.string().email('Invalid email address').max(100).optional().or(z.literal('')),
  licenseNumber: z.string().max(50).optional(),
  licenseType: z.string().max(20).optional(),
  licenseExpiry: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  notes: z.string().max(500).optional(),
});

export const updateDriverSchema = createDriverSchema.partial().extend({
  phone: nullableString(20),
  email: nullableEmail,
  licenseNumber: nullableString(50),
  licenseType: nullableString(20),
  licenseExpiry: nullableDateString,
  dateOfBirth: nullableDateString,
  address: z.string().nullable().optional(),
  avatarUrl: nullableUrl,
  notes: nullableString(500),
});

export const driverListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['driverCode', 'fullName', 'phone', 'status', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
