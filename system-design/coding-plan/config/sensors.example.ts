# Sensor Configuration Example

> Ví dụ cấu hình sensor types cho các domain IoT khác nhau

---

## 1. Generic Sensor Type

```typescript
// config/sensors.ts

export interface SensorType {
  name: string;
  unit: string;
  range: [number, number];
  precision?: number;
  alertThreshold?: number | { min: number; max: number };
}

export interface SensorConfig {
  [key: string]: SensorType;
}
```

---

## 2. Vehicle Tracking Example

```typescript
// config/sensors.vehicle-tracking.ts

export const SENSOR_TYPES: SensorConfig = {
  vibration: {
    name: 'Vibration',
    unit: 'g',
    range: [0, 10],
    precision: 2,
    alertThreshold: 2.0,
  },
  speed: {
    name: 'Speed',
    unit: 'km/h',
    range: [0, 200],
    precision: 1,
    alertThreshold: 120,
  },
  latitude: {
    name: 'Latitude',
    unit: '°',
    range: [-90, 90],
    precision: 8,
  },
  longitude: {
    name: 'Longitude',
    unit: '°',
    range: [-180, 180],
    precision: 8,
  },
  battery_top: {
    name: 'Battery Top',
    unit: 'V',
    range: [3.0, 4.2],
    precision: 2,
    alertThreshold: { min: 3.3, max: 4.3 },
  },
  battery_bot: {
    name: 'Battery Bottom',
    unit: 'V',
    range: [3.0, 4.2],
    precision: 2,
    alertThreshold: { min: 3.3, max: 4.3 },
  },
  satellites: {
    name: 'GPS Satellites',
    unit: 'count',
    range: [0, 24],
    precision: 0,
  },
  course: {
    name: 'Course',
    unit: '°',
    range: [0, 360],
    precision: 1,
  },
};
```

---

## 3. Smart Home Example

```typescript
// config/sensors.smart-home.ts

export const SENSOR_TYPES: SensorConfig = {
  temperature: {
    name: 'Temperature',
    unit: '°C',
    range: [-20, 50],
    precision: 1,
    alertThreshold: { min: 15, max: 30 },
  },
  humidity: {
    name: 'Humidity',
    unit: '%',
    range: [0, 100],
    precision: 1,
    alertThreshold: { min: 30, max: 70 },
  },
  motion: {
    name: 'Motion Detected',
    unit: 'boolean',
    range: [0, 1],
    precision: 0,
  },
  light: {
    name: 'Light Level',
    unit: 'lux',
    range: [0, 10000],
    precision: 0,
  },
  co2: {
    name: 'CO2 Level',
    unit: 'ppm',
    range: [400, 5000],
    precision: 0,
    alertThreshold: 1000,
  },
  door_state: {
    name: 'Door State',
    unit: 'boolean',
    range: [0, 1],
    precision: 0,
  },
};
```

---

## 4. Industrial IoT Example

```typescript
// config/sensors.industrial.ts

export const SENSOR_TYPES: SensorConfig = {
  pressure: {
    name: 'Pressure',
    unit: 'bar',
    range: [0, 100],
    precision: 2,
    alertThreshold: 80,
  },
  flow_rate: {
    name: 'Flow Rate',
    unit: 'L/min',
    range: [0, 1000],
    precision: 1,
  },
  temperature: {
    name: 'Temperature',
    unit: '°C',
    range: [0, 500],
    precision: 1,
    alertThreshold: 400,
  },
  vibration: {
    name: 'Vibration',
    unit: 'mm/s',
    range: [0, 50],
    precision: 2,
    alertThreshold: 25,
  },
  rpm: {
    name: 'RPM',
    unit: 'rpm',
    range: [0, 10000],
    precision: 0,
    alertThreshold: { min: 500, max: 8000 },
  },
  power: {
    name: 'Power Consumption',
    unit: 'kW',
    range: [0, 1000],
    precision: 2,
  },
};
```

---

## 5. Agriculture Example

```typescript
// config/sensors.agriculture.ts

export const SENSOR_TYPES: SensorConfig = {
  soil_moisture: {
    name: 'Soil Moisture',
    unit: '%',
    range: [0, 100],
    precision: 1,
    alertThreshold: { min: 20, max: 80 },
  },
  soil_temperature: {
    name: 'Soil Temperature',
    unit: '°C',
    range: [-10, 50],
    precision: 1,
  },
  soil_ph: {
    name: 'Soil pH',
    unit: 'pH',
    range: [0, 14],
    precision: 2,
    alertThreshold: { min: 5.5, max: 7.5 },
  },
  air_temperature: {
    name: 'Air Temperature',
    unit: '°C',
    range: [-20, 50],
    precision: 1,
  },
  air_humidity: {
    name: 'Air Humidity',
    unit: '%',
    range: [0, 100],
    precision: 1,
  },
  light_intensity: {
    name: 'Light Intensity',
    unit: 'lux',
    range: [0, 100000],
    precision: 0,
  },
  rainfall: {
    name: 'Rainfall',
    unit: 'mm',
    range: [0, 500],
    precision: 1,
  },
};
```

---

## 6. Usage in Code

### Generate MQTT Payload Schema

```typescript
import { SENSOR_TYPES } from './sensors';
import { z } from 'zod';

// Auto-generate Zod schema from sensor config
const sensorDataSchema = z.object(
  Object.fromEntries(
    Object.entries(SENSOR_TYPES).map(([key, config]) => [
      key,
      z.number()
        .min(config.range[0])
        .max(config.range[1])
        .optional(),
    ])
  )
);
```

### Generate VictoriaMetrics Metrics

```typescript
import { SENSOR_TYPES } from './sensors';

const METRIC_PREFIX = 'device';

// Auto-generate metric names
export const METRIC_NAMES = Object.fromEntries(
  Object.keys(SENSOR_TYPES).map((key) => [
    key,
    `${METRIC_PREFIX}_${key}`,
  ])
);

// device_temperature, device_humidity, etc.
```

### Generate Alert Checks

```typescript
import { SENSOR_TYPES } from './sensors';

export function checkAlerts(data: Record<string, number>): Alert[] {
  const alerts: Alert[] = [];

  for (const [key, value] of Object.entries(data)) {
    const config = SENSOR_TYPES[key];
    if (!config?.alertThreshold) continue;

    const threshold = config.alertThreshold;

    if (typeof threshold === 'number') {
      if (value > threshold) {
        alerts.push({
          type: `${key}_exceeded`,
          value,
          threshold,
        });
      }
    } else {
      if (value < threshold.min || value > threshold.max) {
        alerts.push({
          type: `${key}_out_of_range`,
          value,
          threshold,
        });
      }
    }
  }

  return alerts;
}
```
