# Monitoring Design

> Giám sát và logging cho hệ thống IoT

---

## 1. Monitoring Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    MONITORING STACK                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │   Backend   │    │ MQTT Bridge │    │  Frontend   │      │
│  │  (Metrics)  │    │  (Metrics)  │    │  (Metrics)  │      │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            ▼                                 │
│                   ┌─────────────────┐                        │
│                   │ VictoriaMetrics │                        │
│                   │   (Storage)     │                        │
│                   └────────┬────────┘                        │
│                            │                                 │
│                            ▼                                 │
│                   ┌─────────────────┐                        │
│                   │     Grafana     │                        │
│                   │  (Dashboards)   │                        │
│                   └─────────────────┘                        │
│                                                              │
│  Logs Flow:                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │ Application │───▶│VictoriaLogs │◀───│   Grafana   │      │
│  │    Logs     │    │  (Storage)  │    │  (Query)    │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Application Metrics

### 2.1 HTTP Metrics

```typescript
// Prometheus format
http_requests_total{method="GET", path="/api/v1/device/list", status="200"} 1234
http_request_duration_seconds{method="GET", path="/api/v1/device/list", quantile="0.95"} 0.045
http_requests_in_progress 5
```

### 2.2 WebSocket Metrics

```typescript
socketio_connections_total{namespace="/devices"} 500
socketio_connections_current{namespace="/devices"} 150
socketio_events_emitted_total{event="device.status.changed"} 10000
socketio_events_received_total{event="subscribe"} 5000
```

### 2.3 MQTT Bridge Metrics

```typescript
mqtt_messages_received_total{topic="rawdata"} 1000000
mqtt_messages_processed_total{topic="rawdata", status="success"} 999000
mqtt_messages_processed_total{topic="rawdata", status="error"} 1000
mqtt_processing_duration_seconds{topic="rawdata", quantile="0.95"} 0.01
mqtt_connection_status 1  // 1 = connected, 0 = disconnected
```

### 2.4 Database Metrics

```typescript
database_query_duration_seconds{query="select_devices"} 0.005
database_connections_active 10
database_connections_idle 5
database_pool_size 20
```

### 2.5 Business Metrics

```typescript
devices_total{status="running"} 15
devices_total{status="stopped"} 30
devices_total{status="disconnected"} 5
sessions_active 25
alerts_total{severity="warning", status="active"} 5
data_points_ingested_total 1000000
```

---

## 3. Prometheus Endpoint

### 3.1 Implementation

```typescript
// Backend: GET /metrics
import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';

const register = new Registry();
collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register]
});

const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register]
});

// Endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 3.2 Middleware

```typescript
// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const path = req.route?.path || req.path;

    httpRequestsTotal.inc({
      method: req.method,
      path,
      status: res.statusCode
    });

    httpDuration.observe(
      { method: req.method, path },
      duration
    );
  });

  next();
});
```

---

## 4. Logging

### 4.1 Log Format

```typescript
// Structured JSON logs
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "message": "Device data received",
  "service": "mqtt-bridge",
  "correlationId": "uuid-here",
  "deviceId": "DEVICE_001",
  "sessionId": 123,
  "data": {
    "sensor1": 25.5
  }
}
```

### 4.2 Log Levels

| Level | Usage |
|-------|-------|
| error | Errors requiring attention |
| warn | Warnings, potential issues |
| info | Normal operations |
| debug | Debug information |

### 4.3 Logger Implementation

```typescript
// infrastructure/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`
});

// Usage
logger.info({ deviceId, sessionId }, 'Device connected');
logger.error({ err, deviceId }, 'Failed to process data');
```

### 4.4 VictoriaLogs Integration

```typescript
// Send logs to VictoriaLogs
import pino from 'pino';

const transport = pino.transport({
  target: 'pino-http',
  options: {
    destination: `${process.env.VICTORIALOGS_URL}/insert/jsonline`
  }
});

export const logger = pino(transport);
```

---

## 5. Grafana Dashboards

### 5.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM OVERVIEW                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Requests │ │  Errors  │ │  Latency │ │ Devices  │       │
│  │  /sec    │ │   Rate   │ │   p95    │ │  Online  │       │
│  │   150    │ │   0.1%   │ │   45ms   │ │    45    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Request Rate (1h)                       │    │
│  │  ▂▃▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅▄▃                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Error Rate (1h)                         │    │
│  │  ▁▁▁▁▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Key Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Latency p95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active WebSocket connections
socketio_connections_current

# MQTT message throughput
rate(mqtt_messages_received_total[1m])

# Active devices
devices_total{status="running"}
```

### 5.3 Alerting Rules

```yaml
# grafana/provisioning/alerting/rules.yaml
groups:
  - name: iot-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: MQTTDisconnected
        expr: mqtt_connection_status == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MQTT bridge disconnected"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API latency above 1s"
```

---

## 6. Health Checks

### 6.1 Endpoints

```typescript
// GET /health
{
  "status": "healthy",
  "uptime": 86400,
  "version": "1.0.0",
  "checks": {
    "database": "ok",
    "mqtt": "ok",
    "victoriametrics": "ok"
  }
}

// GET /ready
{
  "status": "ready"
}
```

### 6.2 Implementation

```typescript
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    mqtt: await checkMQTT(),
    victoriametrics: await checkVictoriaMetrics()
  };

  const allHealthy = Object.values(checks).every(c => c === 'ok');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    uptime: process.uptime(),
    version: process.env.npm_package_version,
    checks
  });
});
```

---

## 7. Log Aggregation Queries

### 7.1 VictoriaLogs Queries

```
# Errors in last hour
level:error | _time:1h

# Device errors
level:error AND deviceId:"DEVICE_001"

# Failed login attempts
action:"login" AND status:"failed" | _time:24h

# High latency requests
duration:>1000ms | _time:1h
```

### 7.2 Debugging Queries

```
# Trace request by correlation ID
correlationId:"abc-123-def"

# Device activity
deviceId:"DEVICE_001" | _time:1h | sort by _time

# Error patterns
level:error | stats by message | sort by count desc
```

---

## 8. Monitoring Checklist

### Setup

- [ ] Prometheus metrics endpoint
- [ ] Structured logging
- [ ] VictoriaMetrics configured
- [ ] VictoriaLogs configured
- [ ] Grafana dashboards created

### Alerts

- [ ] Error rate alerts
- [ ] Latency alerts
- [ ] Service down alerts
- [ ] Disk space alerts
- [ ] Memory usage alerts

### Dashboards

- [ ] System overview
- [ ] API performance
- [ ] Device status
- [ ] MQTT throughput
- [ ] Business metrics
