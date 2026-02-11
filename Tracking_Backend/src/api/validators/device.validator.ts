import { z } from 'zod';

export const createDeviceSchema = z.object({
  deviceId: z
    .string()
    .min(3, 'Device ID must be at least 3 characters')
    .max(50, 'Device ID must not exceed 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Device ID can only contain letters, numbers, dashes, and underscores',
    ),
  deviceName: z
    .string()
    .min(3, 'Device name must be at least 3 characters')
    .max(100, 'Device name must not exceed 100 characters'),
  imei: z.string().max(20).optional(),
  vibrationThreshold: z.number().min(0).max(100).optional(),
  requestInterval: z.number().int().min(1).max(3600).optional(),
  config: z.record(z.unknown()).optional(),
});

export const updateDeviceSchema = z.object({
  deviceName: z.string().min(3).max(100).optional(),
  imei: z.string().max(20).nullable().optional(),
  vibrationThreshold: z.number().min(0).max(100).optional(),
  requestInterval: z.number().int().min(1).max(3600).optional(),
  targetFirmwareVersion: z.string().max(50).nullable().optional(),
  config: z.record(z.unknown()).nullable().optional(),
});

export const deviceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['running', 'stopped', 'disconnected']).optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['deviceId', 'deviceName', 'currentStatus', 'lastSeenAt', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
