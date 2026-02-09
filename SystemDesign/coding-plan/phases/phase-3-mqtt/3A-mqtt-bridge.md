# Sub-Phase 3A: MQTT Bridge Service

> **Context:** ~4KB | **Max Files:** 8 | **Est. Time:** 1 session | **Standalone Service**

## Summary
Implement MQTT Bridge như một standalone service tách biệt khỏi Backend. Bridge subscribe EMQX topics từ devices, xử lý data, lưu vào PostgreSQL/VictoriaMetrics, và publish events lên internal topics cho Backend.

## Tasks
| ID       | Description            | Files                                                         |
| -------- | ---------------------- | ------------------------------------------------------------- |
| MQTT-001 | MQTT client connection | `Tracking_MqttBridge/src/mqtt/client.ts`                      |
| MQTT-002 | Message handlers       | `Tracking_MqttBridge/src/handlers/rawdata.handler.ts`         |
| MQTT-003 | Data processing        | `Tracking_MqttBridge/src/services/data-processing.service.ts` |
| MQTT-004 | Batch writer           | `Tracking_MqttBridge/src/services/batch-writer.service.ts`    |
| MQTT-005 | VictoriaMetrics writer | `Tracking_MqttBridge/src/infrastructure/victoriametrics.ts`   |
| MQTT-006 | PostgreSQL pool        | `Tracking_MqttBridge/src/infrastructure/database.ts`          |
| MQTT-007 | Environment config     | `Tracking_MqttBridge/src/config/env.ts`                       |
| MQTT-008 | Entry point + logger   | `Tracking_MqttBridge/src/index.ts`, `logger.ts`               |

## Architecture
```
┌─────────────┐     ┌─────────────┐
│ ESP32/STM32 │────►│    EMQX     │
└─────────────┘     └──────┬──────┘
                           │ v1/{device_id}/rawdata
                           ▼
                    ┌─────────────────┐
                    │   MQTT Bridge   │  ◄── Standalone Service
                    │   (subscriber)  │
                    └───────┬─────────┘
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │ PostgreSQL │  │VictoriaM   │  │   EMQX     │
     │ (sessions) │  │(time-series│  │(internal/  │
     └────────────┘  └────────────┘  │ events/#)  │
                                     └─────┬──────┘
                                           │
                                    ┌──────┴──────┐
                                    │   Backend   │
                                    │ (subscriber)│
                                    └─────────────┘
```

## MQTT Topics
| Topic                            | Direction        | Description              |
| -------------------------------- | ---------------- | ------------------------ |
| `v1/{device_id}/rawdata`         | Device → Bridge  | Sensor data from devices |
| `v1/{device_id}/status`          | Device → Bridge  | Status changes           |
| `v1/{device_id}/heartbeat`       | Device → Bridge  | Keep-alive               |
| `internal/events/device/status`  | Bridge → Backend | Status change events     |
| `internal/events/device/session` | Bridge → Backend | Session start/end        |
| `internal/events/device/data`    | Bridge → Backend | Real-time data           |
| `internal/events/device/alert`   | Bridge → Backend | Alert triggers           |

## Device Payload Schema
```typescript
// From ESP32/STM32 devices:
interface DeviceRawPayload {
  device_id: string;
  auth_token: string;
  timestamp: number;      // Epoch ms
  status: 'running' | 'stopped';
  data: {
    lat: number;
    lon: number;
    spd: number;
    vib: number;
    bt: number;           // Battery top
    bb: number;           // Battery bottom
    err: number;          // Error code
  };
}
```

## MQTT Client Configuration (QUAN TRỌNG)
```typescript
// ⚠️ CẤU HÌNH QUAN TRỌNG:
const mqttClient = mqtt.connect({
  host: config.mqttHost,
  port: config.mqttPort,
  protocol: config.useTls ? 'mqtts' : 'mqtt',
  username: 'mqtt_bridge',
  password: config.mqttPassword,
  
  // ⚠️ PERSISTENT SESSION - không mất message khi restart
  clean: false,
  clientId: 'mqtt-bridge-production',  // Stable ID
  
  // Reconnection
  reconnectPeriod: 5000,
  keepalive: 60,
});

// ⚠️ ERROR HANDLING - bắt JSON.parse errors
client.on('message', (topic, payload) => {
  let data: unknown;
  try {
    data = JSON.parse(payload.toString());
  } catch {
    logger.warn(`Malformed payload on ${topic}`);
    return;  // Don't crash handler
  }
  // Process data...
});
```

## Batch Writer Pattern
```typescript
// ⚠️ CIRCUIT BREAKER - tránh buffer overflow
class BatchWriter {
  private buffer: DataPoint[] = [];
  private readonly MAX_BUFFER_SIZE = 10_000;
  private consecutiveFailures = 0;
  private readonly MAX_RETRIES = 3;
  
  async flush() {
    if (this.consecutiveFailures >= this.MAX_RETRIES) {
      logger.warn('Circuit breaker open, dropping data');
      this.buffer = [];
      return;
    }
    
    try {
      await this.writeBatch();
      this.consecutiveFailures = 0;
    } catch (error) {
      this.consecutiveFailures++;
      // Keep data in buffer up to MAX_BUFFER_SIZE
    }
  }
}
```

## Internal Event Publishing
```typescript
// Bridge → Backend events via EMQX
function publishInternalEvent(eventType: string, payload: unknown) {
  mqttClient.publish(
    `internal/events/${eventType}`,
    JSON.stringify(payload),
    { qos: 1 }
  );
}

// Examples:
publishInternalEvent('device/status', { deviceId, status, timestamp });
publishInternalEvent('device/session', { deviceId, sessionId, action: 'start' });
publishInternalEvent('device/data', { deviceId, lat, lon, speed, timestamp });
```

## Dependencies
- ✅ Phase 1 done (PostgreSQL, VictoriaMetrics, EMQX running)
- ➡️ Backend (Phase 2) subscribes to `internal/events/#`
- ➡️ Có thể chạy parallel với Phase 4 (Frontend)

## Verification
- [ ] MQTT connection: Bridge connects to EMQX
- [ ] Message processing: Publish to `v1/test/rawdata` → data appears in VictoriaMetrics
- [ ] Internal events: Backend receives events via `internal/events/#`
- [ ] Reconnection: Restart Bridge → resumes without message loss

## Full Spec Reference
- [22-backend-mqtt-bridge.md](./../../22-backend-mqtt-bridge.md) — Chi tiết MQTT Bridge architecture
