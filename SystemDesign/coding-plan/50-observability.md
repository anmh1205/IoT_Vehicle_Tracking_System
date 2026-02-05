# Observability Stack

> Prometheus Metrics + Centralized Logging + Error Tracking cho IoT Vehicle Tracking System

---

## 1. Tổng Quan

```
┌─────────────────────────────────────────────────────────────┐
│                   OBSERVABILITY STACK                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐    │
│  │   Backend   │────▶│  Prometheus │────▶│   Grafana   │    │
│  │  (Metrics)  │     │   Metrics   │     │ (Dashboard) │    │
│  └─────────────┘     └─────────────┘     └─────────────┘    │
│                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐    │
│  │   Backend   │────▶│VictoriaLogs │────▶│   Grafana   │    │
│  │  (Logging)  │     │  (Storage)  │     │  (Search)   │    │
│  └─────────────┘     └─────────────┘     └─────────────┘    │
│                                                              │
│  ┌─────────────┐     ┌─────────────┐                        │
│  │   Backend   │────▶│   Sentry    │                        │
│  │  (Errors)   │     │  (Tracking) │                        │
│  └─────────────┘     └─────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Prometheus Metrics

### 2.1 Dependencies

```json
{
  "dependencies": {
    "prom-client": "^15.1.3"
  }
}
```

### 2.2 Metrics Registry

```typescript
// infrastructure/metrics/registry.ts
import { Registry, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();

// Collect default Node.js metrics (memory, CPU, event loop)
collectDefaultMetrics({ register: metricsRegistry });
```

### 2.3 Application Metrics

```typescript
// infrastructure/metrics/app-metrics.ts
import { Counter, Histogram, Gauge } from 'prom-client';
import { metricsRegistry } from './registry';

// HTTP Request Metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code'],
  registers: [metricsRegistry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

// MQTT Metrics
export const mqttMessagesReceived = new Counter({
  name: 'mqtt_messages_received_total',
  help: 'Total MQTT messages received',
  labelNames: ['topic'],
  registers: [metricsRegistry],
});

export const mqttProcessingDuration = new Histogram({
  name: 'mqtt_processing_duration_seconds',
  help: 'MQTT message processing duration',
  labelNames: ['handler'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  registers: [metricsRegistry],
});

// WebSocket Metrics
export const wsConnectionsActive = new Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  labelNames: ['namespace'],
  registers: [metricsRegistry],
});

export const wsMessagesTotal = new Counter({
  name: 'websocket_messages_total',
  help: 'Total WebSocket messages sent',
  labelNames: ['namespace', 'event'],
  registers: [metricsRegistry],
});

// Device Metrics
export const devicesOnline = new Gauge({
  name: 'devices_online_total',
  help: 'Number of online devices',
  registers: [metricsRegistry],
});

export const deviceDataPoints = new Counter({
  name: 'device_data_points_total',
  help: 'Total data points ingested',
  labelNames: ['device_id'],
  registers: [metricsRegistry],
});

// Database Metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['query_type', 'table'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [metricsRegistry],
});

export const dbConnectionPoolSize = new Gauge({
  name: 'db_connection_pool_size',
  help: 'Database connection pool size',
  labelNames: ['state'], // idle, active, waiting
  registers: [metricsRegistry],
});
```

### 2.4 HTTP Metrics Middleware

```typescript
// middleware/metrics.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from '../infrastructure/metrics/app-metrics';

export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    const path = req.route?.path || req.path;
    const labels = {
      method: req.method,
      path,
      status_code: res.statusCode.toString(),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });

  next();
}
```

### 2.5 Metrics Endpoint

```typescript
// api/routes/metrics.routes.ts
import { Router } from 'express';
import { metricsRegistry } from '../../infrastructure/metrics/registry';

const router = Router();

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

export default router;
```

---

## 3. Structured Logging

### 3.1 Winston Configuration

```typescript
// infrastructure/logger/winston.ts
import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'vehicle-tracking-backend',
    version: process.env.npm_package_version,
  },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development'
        ? winston.format.combine(winston.format.colorize(), winston.format.simple())
        : logFormat,
    }),
  ],
});

// Child logger for specific contexts
export function createLogger(context: string) {
  return logger.child({ context });
}
```

### 3.2 VictoriaLogs Transport

```typescript
// infrastructure/logger/victorialogs-transport.ts
import Transport from 'winston-transport';

interface VictoriaLogsTransportOptions extends Transport.TransportStreamOptions {
  url: string;
  batchSize?: number;
  flushInterval?: number;
}

export class VictoriaLogsTransport extends Transport {
  private url: string;
  private buffer: any[] = [];
  private batchSize: number;
  private flushInterval: number;
  private timer: NodeJS.Timer | null = null;

  constructor(opts: VictoriaLogsTransportOptions) {
    super(opts);
    this.url = opts.url;
    this.batchSize = opts.batchSize || 100;
    this.flushInterval = opts.flushInterval || 5000;
    this.startFlushTimer();
  }

  log(info: any, callback: () => void) {
    setImmediate(() => this.emit('logged', info));

    const logEntry = {
      _time: new Date().toISOString(),
      level: info.level,
      message: info.message,
      ...info.metadata,
    };

    this.buffer.push(logEntry);

    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }

    callback();
  }

  private startFlushTimer() {
    this.timer = setInterval(() => this.flush(), this.flushInterval);
  }

  private async flush() {
    if (this.buffer.length === 0) return;

    const logs = this.buffer.splice(0, this.buffer.length);
    const body = logs.map(log => JSON.stringify(log)).join('\n');

    try {
      await fetch(`${this.url}/insert/jsonline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } catch (error) {
      console.error('Failed to send logs to VictoriaLogs:', error);
      // Re-add logs to buffer for retry
      this.buffer.unshift(...logs);
    }
  }
}
```

### 3.3 Request Logger Middleware

```typescript
// middleware/request-logger.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../infrastructure/logger/winston';

const logger = createLogger('http');

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  const start = Date.now();

  // Attach correlation ID to request
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info('HTTP Request', {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: req.user?.id,
    });
  });

  next();
}
```

---

## 4. Error Tracking (Sentry)

### 4.1 Dependencies

```json
{
  "dependencies": {
    "@sentry/node": "^10.34.0"
  }
}
```

### 4.2 Sentry Configuration

```typescript
// config/sentry.ts
import * as Sentry from '@sentry/node';

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });
}

export { Sentry };
```

### 4.3 Sentry Middleware

```typescript
// middleware/sentry.middleware.ts
import { Sentry } from '../config/sentry';

// Request handler - add to middleware chain FIRST
export const sentryRequestHandler = Sentry.Handlers.requestHandler();

// Error handler - add to middleware chain LAST
export const sentryErrorHandler = Sentry.Handlers.errorHandler();

// Custom error capture with context
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}
```

---

## 5. Health Check Endpoints

```typescript
// api/routes/health.routes.ts
import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: 'ok' | 'error';
    victoriametrics: 'ok' | 'error';
    mqtt: 'ok' | 'error';
  };
}

router.get('/health', async (req, res) => {
  const status: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    uptime: process.uptime(),
    checks: {
      database: 'ok',
      victoriametrics: 'ok',
      mqtt: 'ok',
    },
  };

  // Check PostgreSQL
  try {
    await pool.query('SELECT 1');
  } catch {
    status.checks.database = 'error';
    status.status = 'unhealthy';
  }

  // Check VictoriaMetrics
  try {
    const response = await fetch(`${process.env.VICTORIAMETRICS_URL}/health`);
    if (!response.ok) throw new Error();
  } catch {
    status.checks.victoriametrics = 'error';
    status.status = 'unhealthy';
  }

  res.status(status.status === 'healthy' ? 200 : 503).json(status);
});

// Liveness probe (Kubernetes)
router.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness probe (Kubernetes)
router.get('/health/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

export default router;
```

---

## 6. Alerting Rules

### 6.1 Prometheus Alert Rules

```yaml
# docker/prometheus/alerts.yml
groups:
  - name: vehicle-tracking
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Slow response time
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time"
          description: "95th percentile response time is {{ $value }}s"

      # MQTT message backlog
      - alert: MQTTBacklog
        expr: rate(mqtt_messages_received_total[1m]) > 1000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High MQTT message rate"

      # Database connection pool exhausted
      - alert: DBConnectionPoolExhausted
        expr: db_connection_pool_size{state="waiting"} > 5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool exhausted"

      # Device offline
      - alert: DevicesOffline
        expr: devices_online_total < 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "No devices online"
```

---

## 7. Grafana Dashboards

### 7.1 Backend Overview Dashboard

```json
{
  "dashboard": {
    "title": "Vehicle Tracking Backend",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          { "expr": "rate(http_requests_total[5m])" }
        ]
      },
      {
        "title": "Response Time (p95)",
        "type": "graph",
        "targets": [
          { "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))" }
        ]
      },
      {
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          { "expr": "rate(http_requests_total{status_code=~'5..'}[5m]) / rate(http_requests_total[5m]) * 100" }
        ]
      },
      {
        "title": "Active WebSocket Connections",
        "type": "gauge",
        "targets": [
          { "expr": "sum(websocket_connections_active)" }
        ]
      },
      {
        "title": "MQTT Messages/sec",
        "type": "graph",
        "targets": [
          { "expr": "rate(mqtt_messages_received_total[1m])" }
        ]
      },
      {
        "title": "Devices Online",
        "type": "singlestat",
        "targets": [
          { "expr": "devices_online_total" }
        ]
      }
    ]
  }
}
```

---

## 8. Docker Configuration

```yaml
# docker-compose.observability.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.48.0
    container_name: tracking-prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
    volumes:
      - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./docker/prometheus/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - tracking-network

  alertmanager:
    image: prom/alertmanager:v0.26.0
    container_name: tracking-alertmanager
    volumes:
      - ./docker/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - "9093:9093"
    networks:
      - tracking-network

volumes:
  prometheus-data:
```

### 8.1 Prometheus Configuration

```yaml
# docker/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - '/etc/prometheus/alerts.yml'

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/metrics'

  - job_name: 'mqtt-bridge'
    static_configs:
      - targets: ['mqtt-bridge:3000']
    metrics_path: '/metrics'

  - job_name: 'victoriametrics'
    static_configs:
      - targets: ['victoriametrics:8428']
```

---

## 9. Environment Variables

```bash
# Observability
LOG_LEVEL=info
SENTRY_DSN=https://xxx@sentry.io/xxx
VICTORIALOGS_URL=http://victorialogs:9428

# Metrics
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

---

## 10. Integration Checklist

- [ ] Install prom-client, @sentry/node, winston
- [ ] Configure metrics registry with default metrics
- [ ] Add HTTP metrics middleware (after CORS, before routes)
- [ ] Add request logger middleware
- [ ] Add Sentry request handler (first middleware)
- [ ] Add Sentry error handler (last middleware)
- [ ] Create /metrics endpoint
- [ ] Create /health endpoints
- [ ] Configure VictoriaLogs transport for Winston
- [ ] Set up Prometheus scrape config
- [ ] Create Grafana dashboards
- [ ] Configure alerting rules
