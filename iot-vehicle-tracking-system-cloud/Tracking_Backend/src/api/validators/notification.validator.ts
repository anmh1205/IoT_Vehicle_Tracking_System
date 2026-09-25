import { z } from 'zod';

export const pushTokenSchema = z.object({
  token: z.string().trim().min(20).max(4096),
  deviceInfo: z
    .object({
      platform: z.string().trim().max(32).optional(),
      appVersion: z.string().trim().max(64).optional(),
    })
    .catchall(z.unknown())
    .optional(),
});
