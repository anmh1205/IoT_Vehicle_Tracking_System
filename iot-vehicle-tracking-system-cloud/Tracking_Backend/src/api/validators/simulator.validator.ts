import { z } from 'zod';

export const startSimulatorSchema = z
  .object({
    deviceIds: z.array(z.string().min(1)).min(1).max(200),
    intervalSec: z.coerce.number().int().min(1).max(3600).default(5),
    durationMin: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .default(15),
    speedMin: z.coerce.number().min(0).max(250).default(10),
    speedMax: z.coerce.number().min(0).max(250).default(80),
    vibrationMin: z.coerce.number().min(0).max(1000).default(1),
    vibrationMax: z.coerce.number().min(0).max(1000).default(10),
    batteryMin: z.coerce.number().min(0).max(100).default(30),
    batteryMax: z.coerce.number().min(0).max(100).default(100),
    lat: z.coerce.number().min(-90).max(90).default(10.762622),
    lon: z.coerce.number().min(-180).max(180).default(106.660172),
  })
  .superRefine((value, ctx) => {
    if (value.speedMin > value.speedMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'speedMin must be <= speedMax',
        path: ['speedMin'],
      });
    }
    if (value.vibrationMin > value.vibrationMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'vibrationMin must be <= vibrationMax',
        path: ['vibrationMin'],
      });
    }
    if (value.batteryMin > value.batteryMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'batteryMin must be <= batteryMax',
        path: ['batteryMin'],
      });
    }
  });
