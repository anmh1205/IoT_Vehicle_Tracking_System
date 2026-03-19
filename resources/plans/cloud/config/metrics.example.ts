# Metrics Configuration Example

> Cấu hình VictoriaMetrics cho các domain IoT khác nhau

---

## 1. Metrics Config Interface

```typescript
// config/metrics.ts

export interface MetricsConfig {
  // Metric prefix
  prefix: string;

  // Labels
  labels: {
    required: string[];
    optional: string[];
  };

  // Retention
  retention: {
    raw: string;
    hourly?: string;
    daily?: string;
  };

  // Pre-defined aggregations
  aggregations: {
    [name: string]: string; // PromQL query
  };

  // Dashboard queries
  dashboardQueries: {
    [name: string]: string;
  };
}
```

---

## 2. Vehicle Tracking Metrics

```typescript
// config/metrics.vehicle-tracking.ts

export const METRICS_CONFIG: MetricsConfig = {
  prefix: 'device',

  labels: {
    required: ['device_id'],
    optional: ['session_id', 'firmware_version'],
  },

  retention: {
    raw: '30d',
    hourly: '90d',
    daily: '1y',
  },

  aggregations: {
    // Vibration
    vibration_avg_24h: 'avg_over_time(device_vibration{device_id="$deviceId"}[24h])',
    vibration_max_24h: 'max_over_time(device_vibration{device_id="$deviceId"}[24h])',

    // Speed
    speed_max_24h: 'max_over_time(device_speed{device_id="$deviceId"}[24h])',
    speed_avg_trip: 'avg_over_time(device_speed{device_id="$deviceId", session_id="$sessionId"}[$duration])',

    // Battery
    battery_min: 'min(device_battery_top{device_id="$deviceId"})',
    battery_drain_rate: 'deriv(device_battery_top{device_id="$deviceId"}[1h])',

    // Distance (calculated from speed)
    distance_total: 'increase(device_distance{device_id="$deviceId"}[$duration])',
  },

  dashboardQueries: {
    // Overview
    active_devices: 'count(device_vibration offset 0s)',
    total_distance_today: 'sum(increase(device_distance[24h]))',

    // Per device
    current_speed: 'device_speed{device_id="$deviceId"}',
    current_location: 'device_latitude{device_id="$deviceId"}, device_longitude{device_id="$deviceId"}',

    // Charts
    speed_history: 'device_speed{device_id="$deviceId"}[$duration]',
    vibration_history: 'device_vibration{device_id="$deviceId"}[$duration]',
  },
};
```

---

## 3. Smart Home Metrics

```typescript
// config/metrics.smart-home.ts

export const METRICS_CONFIG: MetricsConfig = {
  prefix: 'sensor',

  labels: {
    required: ['sensor_id'],
    optional: ['room_id', 'zone_id', 'sensor_type'],
  },

  retention: {
    raw: '7d',
    hourly: '30d',
    daily: '1y',
  },

  aggregations: {
    // Temperature
    temp_avg_24h: 'avg_over_time(sensor_temperature{sensor_id="$sensorId"}[24h])',
    temp_min_24h: 'min_over_time(sensor_temperature{sensor_id="$sensorId"}[24h])',
    temp_max_24h: 'max_over_time(sensor_temperature{sensor_id="$sensorId"}[24h])',

    // Humidity
    humidity_avg_24h: 'avg_over_time(sensor_humidity{sensor_id="$sensorId"}[24h])',

    // Energy
    energy_total_today: 'increase(sensor_energy{sensor_id="$sensorId"}[24h])',
    energy_total_month: 'increase(sensor_energy{sensor_id="$sensorId"}[30d])',

    // Motion events
    motion_count_24h: 'count_over_time(sensor_motion{sensor_id="$sensorId"}[24h])',
  },

  dashboardQueries: {
    // Overview
    avg_temperature: 'avg(sensor_temperature)',
    avg_humidity: 'avg(sensor_humidity)',
    total_energy_today: 'sum(increase(sensor_energy[24h]))',

    // Per room
    room_temperature: 'avg(sensor_temperature{room_id="$roomId"})',
    room_humidity: 'avg(sensor_humidity{room_id="$roomId"})',

    // Charts
    temp_history: 'sensor_temperature{sensor_id="$sensorId"}[$duration]',
    energy_history: 'rate(sensor_energy{sensor_id="$sensorId"}[$duration])',
  },
};
```

---

## 4. Industrial IoT Metrics

```typescript
// config/metrics.industrial.ts

export const METRICS_CONFIG: MetricsConfig = {
  prefix: 'machine',

  labels: {
    required: ['machine_id'],
    optional: ['line_id', 'shift_id', 'operator_id'],
  },

  retention: {
    raw: '14d',
    hourly: '90d',
    daily: '2y',
  },

  aggregations: {
    // OEE (Overall Equipment Effectiveness)
    availability: '(machine_uptime / (machine_uptime + machine_downtime)) * 100',
    performance: '(machine_actual_output / machine_expected_output) * 100',
    quality: '(machine_good_output / machine_actual_output) * 100',
    oee: 'availability * performance * quality / 10000',

    // Production
    output_total_shift: 'increase(machine_output{machine_id="$machineId", shift_id="$shiftId"}[$duration])',
    cycle_time_avg: 'avg_over_time(machine_cycle_time{machine_id="$machineId"}[1h])',

    // Maintenance
    vibration_trend: 'predict_linear(machine_vibration{machine_id="$machineId"}[7d], 86400)',
    temperature_anomaly: 'machine_temperature > avg_over_time(machine_temperature[7d]) + 2 * stddev_over_time(machine_temperature[7d])',
  },

  dashboardQueries: {
    // Overview
    machines_running: 'count(machine_status == 1)',
    avg_oee: 'avg(machine_oee)',
    total_output_today: 'sum(increase(machine_output[24h]))',

    // Per machine
    current_status: 'machine_status{machine_id="$machineId"}',
    current_output_rate: 'rate(machine_output{machine_id="$machineId"}[5m])',

    // Charts
    production_history: 'rate(machine_output{machine_id="$machineId"}[$duration])',
    efficiency_history: 'machine_efficiency{machine_id="$machineId"}[$duration]',
  },
};
```

---

## 5. Usage in Code

### Write Metrics

```typescript
import { METRICS_CONFIG } from './metrics';
import { SENSOR_TYPES } from './sensors';

async function writeMetrics(
  deviceId: string,
  timestamp: number,
  data: Record<string, number>
): Promise<void> {
  const metrics: string[] = [];
  const { prefix, labels } = METRICS_CONFIG;

  for (const [key, value] of Object.entries(data)) {
    if (SENSOR_TYPES[key]) {
      const metricName = `${prefix}_${key}`;
      metrics.push(`${metricName}{device_id="${deviceId}"} ${value} ${timestamp}`);
    }
  }

  await fetch(`${VM_URL}/api/v1/import/prometheus`, {
    method: 'POST',
    body: metrics.join('\n'),
  });
}
```

### Query Aggregations

```typescript
import { METRICS_CONFIG } from './metrics';

async function getDeviceStats(deviceId: string): Promise<Stats> {
  const { aggregations } = METRICS_CONFIG;
  const results: Record<string, number> = {};

  for (const [name, query] of Object.entries(aggregations)) {
    const resolvedQuery = query.replace('$deviceId', deviceId);
    const result = await vmQuery(resolvedQuery);
    results[name] = parseFloat(result);
  }

  return results;
}
```

### Dashboard Queries

```typescript
import { METRICS_CONFIG } from './metrics';

// API endpoint
app.get('/api/v1/metrics/device/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const { query: queryName, duration = '1h' } = req.query;

  const queryTemplate = METRICS_CONFIG.dashboardQueries[queryName];
  if (!queryTemplate) {
    return res.status(400).json({ error: 'Unknown query' });
  }

  const query = queryTemplate
    .replace('$deviceId', deviceId)
    .replace('$duration', duration);

  const result = await vmQueryRange(query, duration);
  res.json({ success: true, data: result });
});
```
