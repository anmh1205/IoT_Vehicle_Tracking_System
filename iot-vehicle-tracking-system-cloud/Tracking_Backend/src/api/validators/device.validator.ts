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
  imuAccelDeltaThresholdMps2: z.number().min(0).max(100).optional(),
  vibrationThreshold: z.number().min(0).max(100).optional(),
  requestInterval: z.number().int().min(1).max(3600).optional(),
  config: z.record(z.unknown()).optional(),
});

export const updateDeviceSchema = z.object({
  deviceName: z.string().min(3).max(100).optional(),
  imei: z.string().max(20).nullable().optional(),
  imuAccelDeltaThresholdMps2: z.number().min(0).max(100).optional(),
  vibrationThreshold: z.number().min(0).max(100).optional(),
  requestInterval: z.number().int().min(1).max(3600).optional(),
  targetFirmwareVersion: z.string().max(50).nullable().optional(),
  config: z.record(z.unknown()).nullable().optional(),
});

export const deviceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .default(20)
    .transform((value) => Math.min(value, 100)),
  status: z.enum(['running', 'stopped', 'disconnected', 'online']).optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['deviceId', 'deviceName', 'currentStatus', 'lastSeenAt', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const firmwareConfigParamSchema = z.object({
  tracking_interval_s: z.number().int().min(1).max(3600).optional(),
  heartbeat_interval_s: z.number().int().min(60).max(65535).optional(),
  alarm_interval_s: z.number().int().min(1).max(60).optional(),
  ignition_off_hold_ms: z.number().int().min(1000).max(60000).optional(),
  alarm_timeout_s: z.number().int().min(30).max(3600).optional(),
  ota_min_battery_mv: z.number().int().min(3300).max(4500).optional(),
  ignition_adc_threshold_mv: z.number().int().min(11000).max(15000).optional(),
  sleep_enabled: z.boolean().optional(),
  imu_wakeup_enabled: z.boolean().optional(),
}).strict();

export const sendDeviceCommandSchema = z
  .object({
    command: z.string().min(1),
    params: z.record(z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.command !== 'update_config') {
      return;
    }

    const parsed = firmwareConfigParamSchema.safeParse(value.params ?? {});
    if (parsed.success) {
      return;
    }

    for (const issue of parsed.error.issues) {
      const path = issue.path.length > 0 ? ['params', ...issue.path] : ['params'];
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: issue.message,
      });
    }
  });
