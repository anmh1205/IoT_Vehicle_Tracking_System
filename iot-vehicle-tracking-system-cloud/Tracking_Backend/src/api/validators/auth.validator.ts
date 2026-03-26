import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100).optional(),
  email: z.string().email('Invalid email format').nullable().optional(),
  avatarUrl: z.string().url('Invalid URL format').nullable().optional(),
});

export const updateNotificationSchema = z.object({
  emailAlerts: z.boolean().optional(),
  pushAlerts: z.boolean().optional(),
  alertTypes: z.array(z.string()).optional(),
});

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
  fullName: z.string().min(1, 'Full name is required').max(100),
  role: z.enum(['admin', 'manager', 'operator', 'viewer']).optional(),
  deviceAccessMode: z.enum(['all', 'assigned', 'customer']).optional(),
  email: z.string().email('Invalid email format').optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'manager', 'operator', 'viewer']).optional(),
  deviceAccessMode: z.enum(['all', 'assigned', 'customer']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  email: z.string().email('Invalid email format').nullable().optional(),
  avatarUrl: z.string().url('Invalid URL format').nullable().optional(),
});

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  role: z.enum(['admin', 'manager', 'operator', 'viewer']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});
