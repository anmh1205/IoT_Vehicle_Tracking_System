import { client, registry } from './registry';

// --- HTTP Metrics ---

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'] as const,
  registers: [registry],
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// --- WebSocket Metrics ---

export const wsConnectionsActive = new client.Gauge({
  name: 'ws_connections_active',
  help: 'Number of active WebSocket connections',
  labelNames: ['namespace'] as const,
  registers: [registry],
});

// --- Device Metrics ---

export const devicesOnline = new client.Gauge({
  name: 'devices_online_total',
  help: 'Number of devices currently online',
  registers: [registry],
});

export const deviceDataPointsTotal = new client.Counter({
  name: 'device_data_points_total',
  help: 'Total number of data points received from devices',
  labelNames: ['type'] as const,
  registers: [registry],
});

// --- Database Metrics ---

export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [registry],
});

export const dbPoolSize = new client.Gauge({
  name: 'db_connection_pool_size',
  help: 'Database connection pool size',
  labelNames: ['state'] as const,
  registers: [registry],
});

// --- Security Metrics ---

export const loginFailuresTotal = new client.Counter({
  name: 'login_failures_total',
  help: 'Total number of failed login attempts',
  registers: [registry],
});

export const sessionExpiredTotal = new client.Counter({
  name: 'session_expired_total',
  help: 'Total number of expired sessions',
  registers: [registry],
});

export const rateLimitHitsTotal = new client.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['path'] as const,
  registers: [registry],
});
