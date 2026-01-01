import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN || '*',
}));

export const databaseConfig = registerAs('database', () => ({
  // In Docker, use 'postgres' service name; locally use 'localhost'
  host: process.env.DB_HOST || (process.env.DOCKER_ENV === 'true' ? 'postgres' : 'localhost'),
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vehicle_tracking',
  timezone: process.env.DB_TZ || '+07:00',
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '50', 10),
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
}));

export const influxdbConfig = registerAs('influxdb', () => ({
  url: process.env.INFLUXDB_URL || 'http://localhost:8086',
  token: process.env.INFLUXDB_TOKEN || '',
  org: process.env.INFLUXDB_ORG || 'vehicle_tracking',
  bucket: process.env.INFLUXDB_BUCKET || 'telemetry',
}));

export const mqttConfig = registerAs('mqtt', () => ({
  brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  username: process.env.MQTT_USERNAME || '',
  password: process.env.MQTT_PASSWORD || '',
}));

export const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
}));

export const logConfig = registerAs('log', () => ({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
}));

export const notificationsConfig = registerAs('notifications', () => ({
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || null,
  telegramChatId: process.env.TELEGRAM_CHAT_ID || null,
  emailFrom: process.env.EMAIL_FROM || null,
  emailHost: process.env.EMAIL_HOST || null,
  emailPort: parseInt(process.env.EMAIL_PORT || '587', 10),
  emailUser: process.env.EMAIL_USER || null,
  emailPassword: process.env.EMAIL_PASSWORD || null,
}));

