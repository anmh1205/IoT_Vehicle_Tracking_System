# Sub-Phase 2C: IoT Data Processing

> **Context:** ~4KB | **Max Files:** 8 | **Est. Time:** 1 session

## Summary
Implement IoT data ingestion: REST endpoint cho devices gửi data, data processing pipeline, session tracking, status management, và lưu time-series data vào VictoriaMetrics.

## Tasks
| ID     | Description                 | Files                                                           |
| ------ | --------------------------- | --------------------------------------------------------------- |
| BE-020 | IoT controller + routes     | `api/controllers/iot.controller.ts`, `api/routes/iot.routes.ts` |
| BE-021 | IoT data processing service | `domain/iot/services/iot-data-processing.service.ts`            |
| BE-022 | IoT device status service   | `domain/iot/services/iot-device-status.service.ts`              |
| BE-023 | Session tracking service    | `domain/iot/services/session-tracking.service.ts`               |
| BE-024 | Heartbeat tracking service  | `domain/iot/services/heartbeat-tracking.service.ts`             |
| BE-025 | IoT repository              | `domain/iot/repositories/iot.repository.ts`                     |
| BE-026 | VictoriaMetrics client      | `infrastructure/victoriametrics/client.ts`, `query.ts`          |

## API Contract (Device ➝ Backend)
| Endpoint                     | Method | Auth         | Description                  |
| ---------------------------- | ------ | ------------ | ---------------------------- |
| `POST /api/v1/iot/data`      | POST   | Device Token | Standard telemetry ingestion |
| `POST /api/v1/iot/heartbeat` | POST   | Device Token | Heartbeat (keep-alive)       |
| `POST /api/v1/iot/status`    | POST   | Device Token | Status change notification   |

## Device Payload Schema
```typescript
// POST /api/v1/iot/data
interface IoTDataPayload {
  deviceId: string;
  authToken: string;       // Device's auth token
  timestamp: number;       // Epoch milliseconds
  status: 'running' | 'stopped';
  data: {
    lat: number;           // Latitude
    lon: number;           // Longitude
    spd: number;           // Speed (km/h)
    hdg: number;           // Heading (0-360)
    alt: number;           // Altitude (m)
    sat: number;           // GPS satellites
    vib: number;           // Vibration level
    bt: number;            // Battery top (V)
    bb: number;            // Battery bottom (V)
    err: number;           // Error code
    io?: Record<string, number>; // Digital I/O
  };
}
```

## VictoriaMetrics Metrics
```
# Metrics written to VictoriaMetrics
device_position{device_id="XXX"} lat, lon, speed, heading, altitude
device_battery{device_id="XXX"} battery_top, battery_bottom
device_vibration{device_id="XXX"} vibration_level
device_status{device_id="XXX"} status_code (0=stopped, 1=running, 2=disconnected)
```

## Session Tracking Logic
```typescript
// Session lifecycle:
1. Device gửi status="running" → Start session
   - Insert device_sessions: status='running', server_session_start=NOW()
   - Update devices: current_status='running'

2. Device gửi data liên tục → Update session
   - Update device_sessions: data_points_count++, last_update=NOW()
   - Insert VictoriaMetrics metrics

3. Device gửi status="stopped" HOẶC heartbeat timeout → End session
   - Update device_sessions: status='completed', server_session_end=NOW()
   - Calculate session stats: uptime, avg_vibration, etc.
   - Update devices: current_status='stopped' hoặc 'disconnected'
```

## WebSocket Events (Backend ➝ Frontend)
| Event                  | Payload                           | Triggered By      |
| ---------------------- | --------------------------------- | ----------------- |
| `device:status`        | `{ deviceId, status, timestamp }` | Status change     |
| `device:session`       | `{ deviceId, sessionId, action }` | Session start/end |
| `telemetry:{deviceId}` | `{ lat, lon, speed, timestamp }`  | Each data point   |

## Dependencies
- ✅ Phase 1 done (devices, device_sessions tables, VictoriaMetrics)
- ✅ Phase 2A done (auth middleware cho device token validation)
- ➡️ Phase 3 (MQTT Bridge) sẽ gọi APIs này
- ➡️ Phase 4 (Frontend) subscribe WebSocket events

## Verification
- [ ] `npx tsc --noEmit 2>&1 | head -20` — no errors
- [ ] Data ingestion: `POST /api/v1/iot/data` returns 200
- [ ] VictoriaMetrics: Query shows metrics
- [ ] Session created after first data point

## Full Spec Reference
- [20-backend-architecture.md#section-3.3](./../../20-backend-architecture.md) — IoT domain
- [22-backend-mqtt-bridge.md](./../../22-backend-mqtt-bridge.md) — MQTT integration
