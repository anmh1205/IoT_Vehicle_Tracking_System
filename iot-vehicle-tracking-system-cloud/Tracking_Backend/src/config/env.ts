import 'dotenv/config';

const fromEnv = (key: string): string | undefined => process.env[key];

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const requireEnv = (key: string, value: string | undefined): string => {
  if (!value) {
    if (fromEnv('NODE_ENV') === 'production') {
      throw new Error(`CRITICAL: Environment variable "${key}" is not set!`);
    }
    console.warn(`WARNING: Environment variable "${key}" is not set.`);
  }
  return value ?? '';
};

export const appConfig = {
  port: toInt(fromEnv('PORT'), 4000),
  nodeEnv: fromEnv('NODE_ENV') ?? 'development',
  isProduction: fromEnv('NODE_ENV') === 'production',
} as const;

export const dbConfig = {
  host: fromEnv('POSTGRESQL_HOST') ?? 'localhost',
  port: toInt(fromEnv('POSTGRESQL_PORT'), 5432),
  database: fromEnv('POSTGRESQL_DATABASE') ?? 'vehicle_tracking',
  user: fromEnv('POSTGRESQL_USER') ?? 'postgres',
  password: requireEnv('POSTGRESQL_PASSWORD', fromEnv('POSTGRESQL_PASSWORD')),
  connectionLimit: toInt(fromEnv('POSTGRESQL_CONNECTION_LIMIT'), 20),
} as const;

export const mqttConfig = {
  host: fromEnv('MQTT_HOST') ?? 'localhost',
  port: toInt(fromEnv('MQTT_PORT'), 1883),
  tlsPort: toInt(fromEnv('MQTT_TLS_PORT'), 8883),
  useTls: appConfig.isProduction
    ? fromEnv('MQTT_USE_TLS') !== 'false'
    : fromEnv('MQTT_USE_TLS') === 'true',
  rejectUnauthorized: fromEnv('MQTT_REJECT_UNAUTHORIZED') !== 'false',
  username: fromEnv('MQTT_USERNAME') ?? 'backend',
  password: requireEnv('MQTT_PASSWORD', fromEnv('MQTT_PASSWORD')),
} as const;

export const victoriaMetricsConfig = {
  url: fromEnv('VICTORIAMETRICS_URL') ?? 'http://localhost:8428',
} as const;

export const victoriaLogsConfig = {
  url: fromEnv('VICTORIALOGS_URL') ?? 'http://localhost:9428',
} as const;

export const sessionConfig = {
  secret: requireEnv('SESSION_SECRET', fromEnv('SESSION_SECRET')),
  maxLifetimeHours: toInt(fromEnv('SESSION_MAX_LIFETIME_HOURS'), 24),
  extensionHours: toInt(fromEnv('SESSION_EXTENSION_HOURS'), 4),
} as const;

export const corsConfig = {
  origin: fromEnv('CORS_ORIGIN') ?? 'http://localhost:4001',
} as const;

export const observabilityConfig = {
  sentryDsn: fromEnv('SENTRY_DSN'),
  metricsPassword: fromEnv('METRICS_PASSWORD'),
  logLevel: fromEnv('LOG_LEVEL') ?? 'info',
} as const;

export const firmwareConfig = {
  storagePath: fromEnv('FIRMWARE_STORAGE_PATH') ?? '/app/firmware',
  publicBaseUrl: fromEnv('FIRMWARE_PUBLIC_BASE_URL') ?? null,
  assignedTimeoutSec: toInt(fromEnv('OTA_ASSIGNED_TIMEOUT_SEC'), 600),
  inProgressTimeoutSec: toInt(fromEnv('OTA_IN_PROGRESS_TIMEOUT_SEC'), 900),
} as const;
