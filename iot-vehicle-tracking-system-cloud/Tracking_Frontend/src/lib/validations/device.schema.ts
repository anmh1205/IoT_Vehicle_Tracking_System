import { z } from 'zod';

export const deviceSchema = z.object({
  deviceId: z.string().min(1).max(50),
  deviceName: z.string().min(1).max(100),
  deviceType: z.enum(['gps_tracker', 'obd2', 'hybrid']),
  imei: z.string().max(20).optional(),
  simNumber: z.string().max(20).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().max(500).optional(),
});

export const commandSchema = z.object({
  command: z.enum(['REBOOT', 'SET_INTERVAL', 'GET_CONFIG', 'LOCK_ENGINE', 'UNLOCK_ENGINE']),
  params: z.record(z.string(), z.unknown()).optional(),
  timeout: z.number().min(5000).max(60000).default(30000),
});
