import 'dotenv/config';

const fromEnv = (key: string): string | undefined => process.env[key];

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
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
  nodeEnv: fromEnv('NODE_ENV') ?? 'development',
  isDevelopment: (fromEnv('NODE_ENV') ?? 'development') === 'development',
  healthPort: toInt(fromEnv('BRIDGE_HEALTH_PORT'), 4003),
} as const;

const strictTlsEnv = !appConfig.isDevelopment;
const strictTlsUseTls = fromEnv('MQTT_USE_TLS') !== 'false';
const strictTlsRejectUnauthorized = fromEnv('MQTT_REJECT_UNAUTHORIZED') !== 'false';

if (strictTlsEnv) {
  if (!strictTlsUseTls) {
    throw new Error('CRITICAL: MQTT_USE_TLS must be true outside development');
  }
  if (!strictTlsRejectUnauthorized) {
    throw new Error('CRITICAL: MQTT_REJECT_UNAUTHORIZED must be true outside development');
  }
}

export const mqttConfig = {
  host: fromEnv('MQTT_HOST') ?? 'localhost',
  port: toInt(fromEnv('MQTT_PORT'), 1883),
  tlsPort: toInt(fromEnv('MQTT_TLS_PORT'), 8883),
  useTls: strictTlsEnv
    ? strictTlsUseTls
    : toBool(fromEnv('MQTT_USE_TLS'), false),
  rejectUnauthorized: strictTlsEnv
    ? strictTlsRejectUnauthorized
    : toBool(fromEnv('MQTT_REJECT_UNAUTHORIZED'), false),
  servername: fromEnv('MQTT_SERVERNAME') ?? fromEnv('MQTT_HOST') ?? 'localhost',
  caCertPath: fromEnv('MQTT_CA_CERT_PATH') ?? '',
  username: fromEnv('MQTT_USERNAME') ?? 'mqtt_bridge',
  password: requireEnv('MQTT_PASSWORD', fromEnv('MQTT_PASSWORD')),
} as const;

export const dbConfig = {
  host: fromEnv('POSTGRESQL_HOST') ?? 'localhost',
  port: toInt(fromEnv('POSTGRESQL_PORT'), 5432),
  database: fromEnv('POSTGRESQL_DATABASE') ?? 'vehicle_tracking',
  user: fromEnv('POSTGRESQL_USER') ?? 'postgres',
  password: requireEnv('POSTGRESQL_PASSWORD', fromEnv('POSTGRESQL_PASSWORD')),
} as const;

export const victoriaMetricsConfig = {
  url: fromEnv('VICTORIAMETRICS_URL') ?? 'http://localhost:8428',
} as const;

export const victoriaLogsConfig = {
  url: fromEnv('VICTORIALOGS_URL') ?? 'http://localhost:9428',
} as const;
