import { z } from 'zod';

export const rawDataSchema = z.object({
  device_id: z.string().min(1),
  auth_token: z.string().min(1),
  timestamp: z.number().positive(),
  uptime: z.number().nonnegative().optional(),
  data: z.object({
    vibration: z.number().optional(),
    battery_top: z.number().optional(),
    battery_bot: z.number().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    speed: z.number().nonnegative().optional(),
    course: z.number().min(0).max(360).optional(),
    satellites: z.number().int().nonnegative().optional(),
    ignition: z.boolean().optional(),
    error_code: z.number().int().optional(),
  }),
});

export const statusSchema = z.object({
  device_id: z.string().min(1),
  status: z.enum(['running', 'stopped']),
  session_id: z.number().int().positive().optional(),
  timestamp: z.number().positive(),
});

export const firmwareStatusSchema = z.object({
  device_id: z.string().min(1),
  status: z.enum(['downloading', 'installing', 'success', 'failed']),
  progress: z.number().min(0).max(100).optional(),
  targetVersion: z.string().min(1),
  error: z.string().optional(),
});
