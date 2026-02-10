import { z } from 'zod';

export const profileSchema = z.object({
  fullName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

export const notificationPrefsSchema = z.object({
  emailAlerts: z.boolean(),
  pushAlerts: z.boolean(),
});

