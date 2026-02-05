# VictoriaMetrics Integration

> Time-series database cho IoT Vehicle Tracking System

---

## 1. Tổng Quan

```
┌─────────────────────────────────────────────────────────────┐
│                 VICTORIAMETRICS STACK                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │ MQTT Bridge  │────▶│VictoriaMetrics│◀────│   Grafana    │ │
│  │   (Write)    │     │   (Storage)   │     │  (Visualize) │ │
│  └──────────────┘     └───────┬───────┘     └──────────────┘ │
│                               │                              │
│                               ▼                              │
│                       ┌──────────────┐                       │
│                       │   Backend    │                       │
│                       │   (Query)    │                       │
│                       └──────────────┘                       │
│                                                              │
│  ┌──────────────┐     ┌──────────────┐                       │
│  │ MQTT Bridge  │────▶│VictoriaLogs  │                       │
│  │   (Write)    │     │  (Logging)   │                       │
│  └──────────────┘     └──────────────┘                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Metrics Schema

### 2.1 Device Metrics

```promql
# Vibration data
device_vibration{device_id="TRACKER_001"} 0.85

# Battery levels
device_battery_top{device_id="TRACKER_001"} 4.15
device_battery_bot{device_id="TRACKER_001"} 4.12

# Location
device_latitude{device_id="TRACKER_001"} 21.0285
device_longitude{device_id="TRACKER_001"} 105.8542

# Speed & movement
device_speed{device_id="TRACKER_001"} 60.5
device_course{device_id="TRACKER_001"} 180.0
device_satellites{device_id="TRACKER_001"} 12

# Device status (1 = running, 0 = stopped)
device_running{device_id="TRACKER_001"} 1

# Uptime in seconds
device_uptime{device_id="TRACKER_001"} 3600

# Error code
device_error_code{device_id="TRACKER_001"} 0
```

### 2.2 Labels

| Label | Description | Example |
|-------|-------------|---------|
| `device_id` | Unique device identifier | `TRACKER_001` |
| `session_id` | Current session ID | `123` |
| `firmware_version` | Firmware version | `1.0.0` |

---

## 3. Write Data

### 3.1 Prometheus Format (Recommended)

```typescript
// victoriametrics/client.ts
const VM_URL = process.env.VICTORIAMETRICS_URL;

export async function writeMetrics(
  deviceId: string,
  timestamp: number,
  data: {
    vibration?: number;
    batteryTop?: number;
    batteryBot?: number;
    latitude?: number;
    longitude?: number;
    speed?: number;
    uptime?: number;
  }
): Promise<void> {
  const metrics: string[] = [];
  const ts = timestamp; // Unix timestamp in ms

  if (data.vibration !== undefined) {
    metrics.push(`device_vibration{device_id="${deviceId}"} ${data.vibration} ${ts}`);
  }
  if (data.batteryTop !== undefined) {
    metrics.push(`device_battery_top{device_id="${deviceId}"} ${data.batteryTop} ${ts}`);
  }
  if (data.batteryBot !== undefined) {
    metrics.push(`device_battery_bot{device_id="${deviceId}"} ${data.batteryBot} ${ts}`);
  }
  if (data.latitude !== undefined) {
    metrics.push(`device_latitude{device_id="${deviceId}"} ${data.latitude} ${ts}`);
  }
  if (data.longitude !== undefined) {
    metrics.push(`device_longitude{device_id="${deviceId}"} ${data.longitude} ${ts}`);
  }
  if (data.speed !== undefined) {
    metrics.push(`device_speed{device_id="${deviceId}"} ${data.speed} ${ts}`);
  }
  if (data.uptime !== undefined) {
    metrics.push(`device_uptime{device_id="${deviceId}"} ${data.uptime} ${ts}`);
  }

  if (metrics.length > 0) {
    await fetch(`${VM_URL}/api/v1/import/prometheus`, {
      method: 'POST',
      body: metrics.join('\n'),
    });
  }
}
```

### 3.2 JSON Format

```typescript
export async function writeMetricsJSON(
  metrics: Array<{
    metric: string;
    labels: Record<string, string>;
    value: number;
    timestamp?: number;
  }>
): Promise<void> {
  const data = metrics.map((m) => ({
    metric: {
      __name__: m.metric,
      ...m.labels,
    },
    values: [m.value],
    timestamps: [m.timestamp ?? Date.now()],
  }));

  await fetch(`${VM_URL}/api/v1/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data.map((d) => JSON.stringify(d)).join('\n'),
  });
}
```

---

## 4. Query Data (PromQL/MetricsQL)

### 4.1 Instant Query

```typescript
// victoriametrics/query.ts
export async function instantQuery(query: string): Promise<any> {
  const url = new URL(`${VM_URL}/api/v1/query`);
  url.searchParams.set('query', query);
  url.searchParams.set('time', Math.floor(Date.now() / 1000).toString());

  const response = await fetch(url.toString());
  return response.json();
}

// Usage
const result = await instantQuery('device_vibration{device_id="TRACKER_001"}');
```

### 4.2 Range Query

```typescript
export async function rangeQuery(
  query: string,
  start: number,  // Unix timestamp (seconds)
  end: number,    // Unix timestamp (seconds)
  step: string = '1m'
): Promise<any> {
  const url = new URL(`${VM_URL}/api/v1/query_range`);
  url.searchParams.set('query', query);
  url.searchParams.set('start', start.toString());
  url.searchParams.set('end', end.toString());
  url.searchParams.set('step', step);

  const response = await fetch(url.toString());
  return response.json();
}

// Usage: Get last 1 hour data
const end = Math.floor(Date.now() / 1000);
const start = end - 3600;
const result = await rangeQuery(
  'device_vibration{device_id="TRACKER_001"}',
  start,
  end,
  '1m'
);
```

---

## 5. Common Queries

### 5.1 Device Location History

```promql
# Last 1 hour
device_latitude{device_id="TRACKER_001"}[1h]
device_longitude{device_id="TRACKER_001"}[1h]
```

### 5.2 Average Vibration

```promql
# Average over 24 hours
avg_over_time(device_vibration{device_id="TRACKER_001"}[24h])

# Average per device
avg by (device_id) (device_vibration)
```

### 5.3 Max Speed

```promql
# Max speed in last 24h
max_over_time(device_speed{device_id="TRACKER_001"}[24h])

# Top 5 fastest devices
topk(5, max_over_time(device_speed[1h]))
```

### 5.4 Active Devices

```promql
# Devices with data in last 5 minutes
count(device_vibration offset 0s)

# Count by status
count by (status) (device_running)
```

### 5.5 Battery Alerts

```promql
# Devices with low battery (< 3.5V)
device_battery_top < 3.5

# Battery drain rate
deriv(device_battery_top[1h])
```

### 5.6 Uptime Statistics

```promql
# Total uptime across all devices
sum(device_uptime)

# Average uptime per device
avg by (device_id) (device_uptime)
```

---

## 6. Backend Integration

### 6.1 Repository Pattern

```typescript
// infrastructure/victoriametrics/repository.ts
export class VictoriaMetricsRepository {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.VICTORIAMETRICS_URL!;
  }

  async getDeviceVibrationHistory(
    deviceId: string,
    hours: number = 24
  ): Promise<VibrationDataPoint[]> {
    const end = Math.floor(Date.now() / 1000);
    const start = end - hours * 3600;

    const result = await rangeQuery(
      `device_vibration{device_id="${deviceId}"}`,
      start,
      end,
      '1m'
    );

    return this.parseResult(result);
  }

  async getDeviceLocationHistory(
    deviceId: string,
    hours: number = 1
  ): Promise<LocationDataPoint[]> {
    const end = Math.floor(Date.now() / 1000);
    const start = end - hours * 3600;

    const [latResult, lonResult] = await Promise.all([
      rangeQuery(`device_latitude{device_id="${deviceId}"}`, start, end, '10s'),
      rangeQuery(`device_longitude{device_id="${deviceId}"}`, start, end, '10s'),
    ]);

    return this.mergeLocationData(latResult, lonResult);
  }

  async getDeviceStats(deviceId: string): Promise<DeviceStats> {
    const [avgVibration, maxSpeed, avgBattery] = await Promise.all([
      instantQuery(`avg_over_time(device_vibration{device_id="${deviceId}"}[24h])`),
      instantQuery(`max_over_time(device_speed{device_id="${deviceId}"}[24h])`),
      instantQuery(`avg_over_time(device_battery_top{device_id="${deviceId}"}[24h])`),
    ]);

    return {
      avgVibration: this.parseScalar(avgVibration),
      maxSpeed: this.parseScalar(maxSpeed),
      avgBattery: this.parseScalar(avgBattery),
    };
  }

  private parseResult(result: any): any[] {
    if (result.status !== 'success') return [];
    return result.data.result.flatMap((series: any) =>
      series.values.map(([ts, val]: [number, string]) => ({
        timestamp: ts * 1000,
        value: parseFloat(val),
      }))
    );
  }

  private parseScalar(result: any): number | null {
    if (result.status !== 'success') return null;
    const value = result.data.result[0]?.value?.[1];
    return value ? parseFloat(value) : null;
  }
}
```

### 6.2 Service Usage

```typescript
// domain/device/services/device-runtime.service.ts
export class DeviceRuntimeService {
  constructor(
    private vmRepo: VictoriaMetricsRepository,
    private deviceRepo: DeviceRepository
  ) {}

  async getDeviceAnalytics(deviceId: string): Promise<DeviceAnalytics> {
    const [device, stats, vibrationHistory] = await Promise.all([
      this.deviceRepo.findByDeviceId(deviceId),
      this.vmRepo.getDeviceStats(deviceId),
      this.vmRepo.getDeviceVibrationHistory(deviceId, 24),
    ]);

    return {
      device,
      stats,
      vibrationHistory,
      thresholdExceeded: vibrationHistory.filter(
        (p) => p.value > (device?.vibration_threshold ?? 1.0)
      ).length,
    };
  }
}
```

---

## 7. Docker Configuration

```yaml
# docker-compose.yml
services:
  victoriametrics:
    image: victoriametrics/victoria-metrics:v1.96.0
    container_name: victoriametrics
    command:
      - "-retentionPeriod=30d"
      - "-storageDataPath=/storage"
      - "-httpListenAddr=:8428"
      - "-search.latencyOffset=0s"
    ports:
      - "8428:8428"
    volumes:
      - vm-data:/storage
    restart: unless-stopped

  victorialogs:
    image: victoriametrics/victoria-logs:v1.0.0
    container_name: victorialogs
    command:
      - "-retentionPeriod=7d"
      - "-storageDataPath=/storage"
      - "-httpListenAddr=:9428"
    ports:
      - "9428:9428"
    volumes:
      - vl-data:/storage
    restart: unless-stopped

  vmagent:
    image: victoriametrics/vmagent:v1.96.0
    container_name: vmagent
    command:
      - "-promscrape.config=/etc/prometheus/prometheus.yml"
      - "-remoteWrite.url=http://victoriametrics:8428/api/v1/write"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    depends_on:
      - victoriametrics

volumes:
  vm-data:
  vl-data:
```

---

## 8. Grafana Integration

### 8.1 Data Source

```yaml
# grafana/provisioning/datasources/victoriametrics.yaml
apiVersion: 1
datasources:
  - name: VictoriaMetrics
    type: prometheus
    access: proxy
    url: http://victoriametrics:8428
    isDefault: true
```

### 8.2 Dashboard Queries

```promql
# Device Overview Panel
rate(device_vibration{device_id=~"$device"}[5m])

# Battery Level Panel
device_battery_top{device_id=~"$device"}
device_battery_bot{device_id=~"$device"}

# Location Map Panel
device_latitude{device_id=~"$device"}
device_longitude{device_id=~"$device"}

# Uptime Panel
increase(device_uptime{device_id=~"$device"}[$__interval])
```

---

## 9. VictoriaLogs Integration

### 9.1 Write Logs

```typescript
// victorialogs/client.ts
const VL_URL = process.env.VICTORIALOGS_URL;

interface LogEntry {
  level: 'debug' | 'info' | 'warning' | 'error';
  deviceId: string;
  sessionId?: number;
  correlationId: string;
  message: string;
  data?: Record<string, any>;
}

export async function writeLog(entry: LogEntry): Promise<void> {
  const log = {
    _time: new Date().toISOString(),
    level: entry.level,
    device_id: entry.deviceId,
    session_id: entry.sessionId,
    correlation_id: entry.correlationId,
    message: entry.message,
    ...entry.data,
  };

  await fetch(`${VL_URL}/insert/jsonline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(log),
  });
}
```

### 9.2 Query Logs

```typescript
export async function queryLogs(
  query: string,
  limit: number = 100
): Promise<any[]> {
  const url = new URL(`${VL_URL}/select/logsql/query`);
  url.searchParams.set('query', query);
  url.searchParams.set('limit', limit.toString());

  const response = await fetch(url.toString());
  const text = await response.text();
  return text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

// Usage
const logs = await queryLogs('device_id:"TRACKER_001" AND level:"error"', 50);
```

---

## 10. Retention & Downsampling

### 10.1 Retention Policy

```bash
# VictoriaMetrics retention
-retentionPeriod=30d    # Raw data: 30 days

# VictoriaLogs retention
-retentionPeriod=7d     # Logs: 7 days
```

### 10.2 Recording Rules (Optional)

```yaml
# recording_rules.yml
groups:
  - name: device_aggregates
    interval: 1h
    rules:
      - record: device_vibration:hourly_avg
        expr: avg_over_time(device_vibration[1h])

      - record: device_vibration:hourly_max
        expr: max_over_time(device_vibration[1h])

      - record: device_speed:hourly_max
        expr: max_over_time(device_speed[1h])

      - record: device_uptime:hourly_increase
        expr: increase(device_uptime[1h])
```

---

## 11. Performance Tips

1. **Batch writes**: Write multiple metrics in one request
2. **Use compression**: Enable gzip for large payloads
3. **Limit cardinality**: Don't use high-cardinality labels
4. **Query optimization**: Use `step` appropriate to data resolution
5. **Caching**: Cache frequently-used queries in backend
