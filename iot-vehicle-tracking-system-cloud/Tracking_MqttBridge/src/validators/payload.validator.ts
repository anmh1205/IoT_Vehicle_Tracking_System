import { z } from 'zod';

const payloadMetadataSchema = z.object({
  schema_version: z.string().regex(/^v\d+\.\d+\.\d+$/),
  message_id: z.string().uuid(),
  sent_at: z.number().positive(),
  seq_no: z.number().int().nonnegative().optional(),
  boot_id: z.string().min(1).optional(),
});

const rawDataPayloadBaseSchema = z.object({
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
  metadata: z.unknown().optional(),
});

const statusPayloadBaseSchema = z.object({
  device_id: z.string().min(1),
  auth_token: z.string().min(1),
  status: z.enum(['running', 'stopped']),
  session_id: z.number().int().positive().optional(),
  timestamp: z.number().positive(),
  metadata: z.unknown().optional(),
});

const eventPayloadBaseSchema = z.object({
  device_id: z.string().min(1),
  auth_token: z.string().min(1),
  event_type: z.enum(['error', 'warning', 'info']),
  code: z.number().int().optional(),
  message: z.string().optional(),
  timestamp: z.number().positive(),
  metadata: z.unknown().optional(),
});

const firmwareStatusPayloadBaseSchema = z.object({
  device_id: z.string().min(1),
  auth_token: z.string().min(1),
  jobId: z.string().min(1),
  status: z.enum([
    'assigned',
    'downloading',
    'verifying',
    'installing',
    'rebooting',
    'confirming',
    'success',
    'failed',
    'rolled_back',
  ]),
  progress: z.number().min(0).max(100).optional(),
  targetVersion: z.string().min(1),
  currentVersion: z.string().min(1),
  partition: z.string().min(1).optional(),
  error: z.string().optional(),
  metadata: z.unknown().optional(),
});

type PayloadMetadata = z.infer<typeof payloadMetadataSchema>;

const normalizeMetadata = <T extends { metadata?: unknown }>(
  payload: T,
): Omit<T, 'metadata'> & { metadata?: PayloadMetadata } => {
  if (!payload.metadata) {
    return payload as Omit<T, 'metadata'> & { metadata?: PayloadMetadata };
  }

  const parsedMetadata = payloadMetadataSchema.safeParse(payload.metadata);
  if (!parsedMetadata.success) {
    return { ...payload, metadata: undefined };
  }

  return { ...payload, metadata: parsedMetadata.data };
};

export const rawDataSchema = rawDataPayloadBaseSchema.transform((payload) =>
  normalizeMetadata(payload),
);

export const statusSchema = statusPayloadBaseSchema.transform((payload) =>
  normalizeMetadata(payload),
);

export const eventSchema = eventPayloadBaseSchema.transform((payload) =>
  normalizeMetadata(payload),
);

export const firmwareStatusSchema = firmwareStatusPayloadBaseSchema.transform((payload) =>
  normalizeMetadata(payload),
);
