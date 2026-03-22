# Customization Guide

> Hướng dẫn customize template cho domain IoT cụ thể

---

## 1. Xác Định Domain

### Bước 1: Trả lời các câu hỏi

| Câu hỏi | Ví dụ Vehicle Tracking | Ví dụ Smart Home |
|---------|------------------------|------------------|
| **Thiết bị là gì?** | GPS Tracker gắn xe | Cảm biến trong nhà |
| **Đo những gì?** | Vị trí, rung, tốc độ | Nhiệt độ, độ ẩm, chuyển động |
| **Tần suất gửi data?** | 1-5 giây | 30-60 giây |
| **Cần real-time không?** | Có (map tracking) | Tùy (automation) |
| **Ai dùng dashboard?** | Fleet manager | Homeowner |
| **Mobile app cần không?** | Có | Có |

### Bước 2: Định nghĩa Entities

```typescript
// Vehicle Tracking
Device = Vehicle/Tracker
Session = Trip/Journey
Alert = Speeding, Low battery, Vibration threshold

// Smart Home
Device = Sensor/Switch/Camera
Session = N/A hoặc Daily activity
Alert = Temperature threshold, Motion detected

// Industrial IoT
Device = Machine/Sensor
Session = Production batch, Shift
Alert = Maintenance due, Anomaly detected
```

---

## 2. Customize Config Files

### 2.1 Sensors Config

```typescript
// coding-plan/config/sensors.ts

// === VEHICLE TRACKING ===
export const SENSOR_TYPES = {
  vibration: {
    name: 'Vibration',
    unit: 'g',
    range: [0, 10],
    alertThreshold: 2.0,
  },
  speed: {
    name: 'Speed',
    unit: 'km/h',
    range: [0, 200],
    alertThreshold: 120,
  },
  latitude: {
    name: 'Latitude',
    unit: '°',
    range: [-90, 90],
  },
  longitude: {
    name: 'Longitude',
    unit: '°',
    range: [-180, 180],
  },
  battery: {
    name: 'Battery',
    unit: 'V',
    range: [3.0, 4.2],
    alertThreshold: 3.3,
  },
} as const;

// === SMART HOME ===
export const SENSOR_TYPES = {
  temperature: {
    name: 'Temperature',
    unit: '°C',
    range: [-20, 50],
    alertThreshold: { min: 15, max: 30 },
  },
  humidity: {
    name: 'Humidity',
    unit: '%',
    range: [0, 100],
    alertThreshold: { min: 30, max: 70 },
  },
  motion: {
    name: 'Motion',
    unit: 'boolean',
    range: [0, 1],
  },
  light: {
    name: 'Light Level',
    unit: 'lux',
    range: [0, 10000],
  },
} as const;

// === INDUSTRIAL IOT ===
export const SENSOR_TYPES = {
  pressure: {
    name: 'Pressure',
    unit: 'bar',
    range: [0, 100],
    alertThreshold: 80,
  },
  temperature: {
    name: 'Temperature',
    unit: '°C',
    range: [0, 500],
    alertThreshold: 400,
  },
  flow_rate: {
    name: 'Flow Rate',
    unit: 'L/min',
    range: [0, 1000],
  },
  vibration: {
    name: 'Vibration',
    unit: 'mm/s',
    range: [0, 50],
    alertThreshold: 25,
  },
} as const;
```

### 2.2 Domain Entities Config

```typescript
// coding-plan/config/domains.ts

export const DOMAIN_CONFIG = {
  // Tên hiển thị
  entityName: {
    singular: 'Device',      // hoặc 'Vehicle', 'Sensor', 'Machine'
    plural: 'Devices',       // hoặc 'Vehicles', 'Sensors', 'Machines'
  },

  // Session/Activity tracking
  hasSession: true,          // true nếu cần track sessions (trips, shifts)
  sessionName: {
    singular: 'Session',     // hoặc 'Trip', 'Shift', 'Batch'
    plural: 'Sessions',
  },

  // Location tracking
  hasLocation: true,         // true nếu có GPS
  mapProvider: 'leaflet',    // 'leaflet' | 'mapbox' | 'google'

  // Real-time features
  realtime: {
    enabled: true,
    updateInterval: 2000,    // ms
  },

  // Alerts
  alertTypes: [
    'high_vibration',
    'low_battery',
    'geofence_exit',
    'speeding',
  ],
};
```

### 2.3 Metrics Config

```typescript
// coding-plan/config/metrics.ts

// VictoriaMetrics metric names
export const METRICS = {
  // Auto-generated from SENSOR_TYPES
  // Format: {prefix}_{sensorType}

  prefix: 'device',  // hoặc 'vehicle', 'sensor', 'machine'

  // Custom aggregations
  aggregations: {
    'vibration_avg_1h': 'avg_over_time(device_vibration[1h])',
    'speed_max_24h': 'max_over_time(device_speed[24h])',
    'battery_min': 'min(device_battery)',
  },

  // Retention
  retention: {
    raw: '30d',
    hourly: '90d',
    daily: '1y',
  },
};
```

---

## 3. File-by-File Customization

### Database Schema (07-database-schema.md)

| Thay đổi | Vehicle Tracking | Smart Home |
|----------|------------------|------------|
| Bảng chính | `devices` | `devices` hoặc `sensors` |
| Bảng session | `device_sessions` | Có thể bỏ |
| Trường sensor | `vibration`, `speed` | `temperature`, `humidity` |
| Trường location | `latitude`, `longitude` | `room_id`, `zone_id` |

### API Endpoints (04-backend-api.md)

```
# Vehicle Tracking
GET /api/v1/device/list
GET /api/v1/device/sessions
GET /api/v1/device/runtime

# Smart Home
GET /api/v1/sensor/list
GET /api/v1/sensor/readings
GET /api/v1/room/status
POST /api/v1/automation/trigger
```

### MQTT Topics (05-mqtt-bridge.md)

```
# Vehicle Tracking
v1/{device_id}/rawdata
v1/{device_id}/status
v1/{device_id}/commands

# Smart Home
home/{room_id}/{sensor_type}/data
home/{room_id}/{device_type}/control
home/automation/trigger
```

### Frontend Features (06-frontend-features.md)

| Vehicle Tracking | Smart Home | Industrial |
|------------------|------------|------------|
| Map (live tracking) | Floor plan | Factory layout |
| Trip history | Activity log | Production dashboard |
| Driver reports | Energy usage | OEE metrics |
| Geofence editor | Automation rules | Maintenance schedule |

---

## 4. Checklist Customization

### Required Changes

- [ ] Rename sensors in `config/sensors.ts`
- [ ] Update entity names in `config/domains.ts`
- [ ] Modify database schema fields
- [ ] Update API endpoint paths/responses
- [ ] Customize MQTT topic structure
- [ ] Update frontend feature modules
- [ ] Modify VictoriaMetrics metric names

### Optional Changes

- [ ] Add domain-specific tables
- [ ] Create custom alert types
- [ ] Add domain-specific API endpoints
- [ ] Create specialized dashboard widgets
- [ ] Add domain-specific reports/exports

---

## 5. Examples

### Example: Vehicle Tracking → Smart Agriculture

| Before (Vehicle) | After (Agriculture) |
|------------------|---------------------|
| `device_id` | `sensor_id` |
| `device_sessions` | `crop_cycles` |
| `vibration` | `soil_moisture` |
| `speed` | `growth_rate` |
| `latitude/longitude` | `field_id/zone_id` |
| Trip map | Field map |
| Driver dashboard | Farmer dashboard |
| Speeding alerts | Irrigation alerts |

### MQTT Payload Transformation

```json
// Before: Vehicle Tracking
{
  "device_id": "TRACKER_001",
  "data": {
    "vibration": 0.85,
    "latitude": 21.0285,
    "longitude": 105.8542,
    "speed": 60.5
  }
}

// After: Smart Agriculture
{
  "sensor_id": "FIELD_A_ZONE_1",
  "data": {
    "soil_moisture": 45.2,
    "temperature": 28.5,
    "humidity": 65.0,
    "light_level": 8500
  }
}
```

---

## 6. Support

Nếu cần hỗ trợ customize template:

1. Đọc kỹ `system-design/` để hiểu architecture
2. Đọc `coding-plan/` để hiểu implementation details
3. Bắt đầu từ `config/` files
4. Test với 1 sensor type trước, sau đó mở rộng
