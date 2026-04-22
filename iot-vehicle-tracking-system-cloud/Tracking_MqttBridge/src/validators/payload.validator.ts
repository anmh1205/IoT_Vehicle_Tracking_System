import { z } from 'zod';

const payloadMetadataSchema = z.object({
  schema_version: z.string().regex(/^v\d+\.\d+\.\d+$/),
  message_id: z.string().uuid(),
  sent_at: z.number().positive(),
  seq_no: z.number().int().nonnegative().optional(),
  boot_id: z.string().min(1).optional(),
});

const diagnosticMonitorStatusSchema = z.enum(['complete', 'incomplete', 'unsupported']);
const diagnosticDtcCodeSchema = z.string().regex(/^[PCBU][0-3][0-9A-F]{3}$/i);

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
  diagnostics: z.object({
    channel: z.object({
      ble_obd_connected: z.boolean().optional(),
      elm_ready: z.boolean().optional(),
      ecu_state: z.string().min(1).optional(),
      poll_interval_ms: z.number().nonnegative().optional(),
      connect_fail_count_5m: z.number().int().nonnegative().optional(),
    }).optional(),
    signals: z.object({
      rpm: z.number().optional(),
      obd_speed_kph: z.number().optional(),
      coolant_c: z.number().optional(),
      fuel_level_pct: z.number().optional(),
      engine_load_pct: z.number().optional(),
    }).optional(),
    quality: z.object({
      sample_age_ms: z.number().nonnegative().optional(),
      missing_signals: z.array(z.string().min(1)).optional(),
    }).optional(),
    events: z.array(z.object({
      code: z.string().min(1).optional(),
      count_5m: z.number().int().nonnegative().optional(),
    })).optional(),
    mil_on: z.boolean().optional(),
    reported_dtc_count: z.number().int().nonnegative().optional(),
    readiness: z.object({
      misfire: diagnosticMonitorStatusSchema.optional(),
      fuel_system: diagnosticMonitorStatusSchema.optional(),
      comprehensive_components: diagnosticMonitorStatusSchema.optional(),
      catalyst: diagnosticMonitorStatusSchema.optional(),
      heated_catalyst: diagnosticMonitorStatusSchema.optional(),
      evaporative_system: diagnosticMonitorStatusSchema.optional(),
      secondary_air_system: diagnosticMonitorStatusSchema.optional(),
      ac_refrigerant: diagnosticMonitorStatusSchema.optional(),
      oxygen_sensor: diagnosticMonitorStatusSchema.optional(),
      oxygen_sensor_heater: diagnosticMonitorStatusSchema.optional(),
      egr_vvt_system: diagnosticMonitorStatusSchema.optional(),
      nmhc_catalyst: diagnosticMonitorStatusSchema.optional(),
      nox_aftertreatment: diagnosticMonitorStatusSchema.optional(),
      boost_pressure: diagnosticMonitorStatusSchema.optional(),
      exhaust_gas_sensor: diagnosticMonitorStatusSchema.optional(),
      pm_filter: diagnosticMonitorStatusSchema.optional(),
    }).optional(),
    dtc: z.object({
      stored: z.array(diagnosticDtcCodeSchema).optional(),
      pending: z.array(diagnosticDtcCodeSchema).optional(),
      permanent: z.array(diagnosticDtcCodeSchema).optional(),
    }).optional(),
  }).optional(),
  metadata: z.unknown().optional(),
});

const statusPayloadBaseSchema = z.object({
  device_id: z.string().min(1),
  auth_token: z.string().min(1),
  status: z.enum(['running', 'stopped', 'heartbeat']),
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
