# 02 - MQTT Bridge Service

> Service cốt lõi xử lý telemetry từ device — subscribe MQTT topics, validate, persist vào DB/metrics/logs.

---

## Mục lục

1. [Vai trò của MQTT Bridge](#1-vai-trò-của-mqtt-bridge)
2. [Topic Structure](#2-topic-structure)
3. [Message Routing](#3-message-routing)
4. [Rawdata Handler Flow](#4-rawdata-handler-flow)
5. [Batch Writer Pattern](#5-batch-writer-pattern)
6. [Internal Event Publishing](#6-internal-event-publishing)
7. [Device State Cache](#7-device-state-cache)
8. [Alert Engine (OBD + IMU)](#8-alert-engine-obd--imu)
9. [Graceful Shutdown](#9-graceful-shutdown)
10. [File Map](#10-file-map)

---

## 1. Vai trò của MQTT Bridge

MQTT Bridge là **data ingestion pipeline** — nhận raw telemetry từ hàng trăm device,
xử lý real-time, và phân phối vào các storage backends:

```mermaid
graph LR
    DEVICE["Devices<br/>(MQTT publish)"] --> EMQX["EMQX Broker"]
    EMQX --> BRIDGE["MQTT Bridge"]
    BRIDGE --> PG["PostgreSQL<br/>(device state, sessions)"]
    BRIDGE --> VM["VictoriaMetrics<br/>(time-series)"]
    BRIDGE --> VL["VictoriaLogs<br/>(event logs)"]
    BRIDGE --> EMQX2["EMQX<br/>(internal events)"]
```

**Đặc điểm:**
- Stateless (có thể restart bất kỳ lúc nào)
- In-memory cache cho device state (rebuild từ DB khi restart)
- Circuit breaker cho DB writes (tránh OOM khi DB down)
- Health endpoint cho monitoring

---

## 2. Topic Structure

### Device Topics (subscribe)

| Topic Pattern | QoS | Mô tả |
|---------------|-----|--------|
| `v1/+/rawdata` | 0 | Telemetry data (GPS, speed, battery, OBD, IMU) |
| `v1/+/status` | 1 | Device state transitions (online/offline/running/stopped) |
| `v1/+/events` | 1 | Error events, warnings |
| `v1/+/firmware` | 1 | OTA progress reports |
| `v1/+/commands/ack` | 1 | Command execution acknowledgments |

**Giải thích QoS:**
- QoS 0 cho rawdata: Telemetry gửi mỗi 5–10s, mất 1–2 message không ảnh hưởng
- QoS 1 cho status/events/firmware: Quan trọng, cần đảm bảo delivery

### Internal Topics (publish)

| Topic | Mô tả |
|-------|--------|
| `internal/events/device/status` | Device status changed |
| `internal/events/device/alert` | Alert triggered |
| `internal/events/device/session` | Session created/closed |
| `internal/events/device/data` | Telemetry summary |
| `internal/events/device/zone` | Geofence enter/exit |
| `internal/events/device/firmware` | OTA status update |
| `internal/events/device/command` | Command ack received |

---

## 3. Message Routing

```mermaid
flowchart TD
    MSG["MQTT Message arrives"] --> EXTRACT["Extract deviceId from topic<br/>v1/{deviceId}/suffix"]
    EXTRACT --> SWITCH{"Topic suffix?"}
    
    SWITCH -->|"rawdata"| RAW["handleRawData()"]
    SWITCH -->|"status"| STATUS["handleStatus()"]
    SWITCH -->|"events"| EVENT["handleEvent()"]
    SWITCH -->|"firmware"| FW["handleFirmware()"]
    SWITCH -->|"commands/ack"| ACK["handleCommandAck()"]
    SWITCH -->|"other"| IGNORE["Log & ignore"]
```

**Code pattern:**

```typescript
// src/index.ts — Message router
const routeMessage = (topic: string, message: Buffer): void => {
  const deviceId = extractDeviceId(topic); // v1/{deviceId}/...
  if (!deviceId) return;

  const suffix = topic.split('/').slice(2).join('/');

  switch (suffix) {
    case 'rawdata':
      handleRawData(deviceId, message).catch(logError);
      break;
    case 'status':
      handleStatus(deviceId, message).catch(logError);
      break;
    // ...
  }
};
```

---

## 4. Rawdata Handler Flow

Handler phức tạp nhất — xử lý telemetry payload từ device:

```mermaid
flowchart TD
    A["Receive raw message"] --> B["Parse JSON"]
    B --> C["Validate with Zod schema"]
    C --> D{"Valid?"}
    D -->|No| E["Log warning, return"]
    D -->|Yes| F["Verify device_id matches topic"]
    F --> G["Validate auth_token against DB"]
    G --> H{"Authenticated?"}
    H -->|No| I["Log warning, return"]
    H -->|Yes| J["Normalize timestamp"]
    J --> K["Resolve/create session"]
    K --> L["Write to VictoriaMetrics"]
    L --> M["Write to VictoriaLogs"]
    M --> N["Add to batch writer (PostgreSQL)"]
    N --> O["Check geofences"]
    O --> P["Evaluate OBD maintenance rules"]
    P --> Q["Check IMU acceleration alerts"]
    Q --> R["Publish internal status event"]
```

**Xử lý timestamp:**
- Ưu tiên `payload.timestamp` (device clock)
- Fallback `metadata.sent_at` (modem clock)
- Last resort: server `Date.now()`

**Session management:**
- Firmware gửi `local_session` object (boot_id + session_seq)
- Bridge dùng authoritative session identity để map vào DB session
- Nếu không có session → tạo mới dựa trên ignition/speed state

---

## 5. Batch Writer Pattern

Thay vì UPDATE device state mỗi message (hàng trăm writes/s), Bridge buffer lại và flush theo batch:

```mermaid
sequenceDiagram
    participant Handler as Rawdata Handler
    participant Buffer as In-Memory Buffer
    participant Timer as Flush Timer (1s)
    participant PG as PostgreSQL

    Handler->>Buffer: addUpdate({deviceId, status, lat, lon...})
    Handler->>Buffer: addUpdate({deviceId2, ...})
    Handler->>Buffer: addUpdate({deviceId3, ...})

    Note over Buffer: Buffer size < 100, chờ timer

    Timer->>Buffer: Flush!
    Buffer->>PG: BEGIN
    Buffer->>PG: UPDATE devices SET ... WHERE device_id = $1 (x3)
    Buffer->>PG: UPDATE device_sessions SET ... (x3)
    Buffer->>PG: COMMIT
```

**Cấu hình:**
- `MAX_BUFFER_SIZE = 100` — flush ngay khi đạt 100 items
- `FLUSH_INTERVAL_MS = 1000` — flush mỗi 1 giây dù chưa đầy
- `MAX_CONSECUTIVE_FAILURES = 3` — circuit breaker mở sau 3 lần flush thất bại

**Circuit Breaker:**

```mermaid
stateDiagram-v2
    [*] --> Closed : Normal operation
    Closed --> Open : 3 consecutive failures
    Open --> Closed : Next successful flush
    
    state Closed {
        [*] --> Buffering
        Buffering --> Flushing : Timer/Full
        Flushing --> Buffering : Success
    }
    
    state Open {
        [*] --> Dropping
        Note right of Dropping: All updates dropped<br/>to prevent OOM
    }
```

---

## 6. Internal Event Publishing

Bridge publish internal events lên MQTT để Backend lắng nghe và push realtime:

```typescript
// src/publishers/internal-event.publisher.ts
publishInternalEvent('status', {
  device_id: deviceId,
  status: 'running',
  latitude: 10.76,
  longitude: 106.66,
  speed: 45.2,
  session_id: 123,
});
// → Publish to: internal/events/device/status
```

**Event types:**
- `status` — Device online/offline/running/stopped
- `alert` — Maintenance alert, IMU alert, geofence violation
- `session` — Session created/closed
- `data` — Telemetry summary (cho realtime map)
- `zone` — Geofence enter/exit
- `firmware` — OTA progress
- `command` — Command ack from device

---

## 7. Device State Cache

In-memory cache lưu trạng thái mới nhất của mỗi device (tránh query DB mỗi message):

```typescript
// src/cache/device-state.cache.ts
interface DeviceState {
  status: 'online' | 'offline' | 'running' | 'stopped';
  sessionId?: number;
  runtimeState: RuntimeStateSnapshot;
  lastTimestampMs: number;
}

// Get cached state
const state = getStatus(deviceId);

// Update cache after processing
setStatus(deviceId, newState);

// Resolve session from cache (avoid DB lookup)
const sessionId = resolveSessionId(deviceId);
```

**Đặc điểm:**
- Rebuild từ DB khi Bridge restart
- TTL-based eviction cho devices offline lâu
- Thread-safe (single-threaded Node.js)

---

## 8. Alert Engine (OBD + IMU)

Bridge đánh giá realtime alerts dựa trên telemetry data:

### IMU Acceleration Alert

```mermaid
flowchart TD
    A["imu_accel_delta_mps2 from payload"] --> B{"value > 3.5 m/s²?"}
    B -->|Yes| C{"Cooldown expired?"}
    C -->|Yes| D["Publish alert event"]
    C -->|No| E["Skip (cooldown active)"]
    B -->|No| F["Auto-resolve existing alert"]
```

### OBD Maintenance Rules

| Rule | Condition | Severity |
|------|-----------|----------|
| Channel unstable | connect_fail_count_5m ≥ 3 | medium |
| Coolant risk | coolant ≥ 105°C AND load ≥ 60% | high |
| Idle-load anomaly | RPM > 900 AND speed ≤ 3 km/h for > 10 min | medium |
| Voltage risk | battery < 12V AND load > 50% | high |
| DTC codes | Stored/pending/permanent codes detected | varies |

### DTC (Diagnostic Trouble Code) Processing

```mermaid
flowchart TD
    A["DTC codes from diagnostics"] --> B["Quality gate check<br/>(BLE connected, ELM ready, sample age < 60s)"]
    B --> C["Normalize codes (uppercase, deduplicate)"]
    C --> D["Categorize: stored/pending/permanent"]
    D --> E["Match against rule definitions"]
    E --> F{"Known code?"}
    F -->|Yes| G["Use predefined severity + action"]
    F -->|No| H["Generic severity based on bucket"]
    G --> I["Apply MIL modifier (bump severity if MIL on)"]
    H --> I
    I --> J["Check cooldown + existing alerts"]
    J --> K["Publish maintenance alert"]
```

---

## 9. Graceful Shutdown

```mermaid
sequenceDiagram
    participant OS as SIGTERM/SIGINT
    participant Main as Main Process
    participant MQTT as MQTT Client
    participant Batch as Batch Writer
    participant DB as Database Pool
    participant Health as Health Server

    OS->>Main: Signal received
    Main->>Main: Set shuttingDown = true
    Main->>MQTT: disconnectMqtt()
    Main->>Batch: stopBatchWriter() (flush remaining)
    Main->>DB: closePool()
    Main->>Health: stopBridgeHealthServer()
    Main->>Main: process.exit(0)
```

---

## 10. File Map

| File | Vai trò |
|------|---------|
| `src/index.ts` | Entry point, message router, lifecycle |
| `src/mqtt/client.ts` | MQTT connection management |
| `src/mqtt/subscriptions.ts` | Topic subscription with QoS |
| `src/handlers/rawdata.handler.ts` | Telemetry processing (phức tạp nhất) |
| `src/handlers/status.handler.ts` | Device status transitions |
| `src/handlers/event.handler.ts` | Error/warning events |
| `src/handlers/firmware.handler.ts` | OTA progress |
| `src/services/batch-writer.service.ts` | Buffered DB writes + circuit breaker |
| `src/services/bridge-health.service.ts` | HTTP health endpoint |
| `src/services/device-auth.service.ts` | Device token validation |
| `src/services/geofence-checker.service.ts` | Geofence enter/exit detection |
| `src/publishers/internal-event.publisher.ts` | Publish to internal MQTT topics |
| `src/publishers/session-assignment.publisher.ts` | Session lifecycle events |
| `src/cache/device-state.cache.ts` | In-memory device state |
| `src/cache/geofence-state.cache.ts` | Geofence state per device |
| `src/infrastructure/database.ts` | PostgreSQL pool + queries |
| `src/infrastructure/victoriametrics.ts` | Metrics write (Prometheus format) |
| `src/infrastructure/victorialogs.ts` | Event log write |
| `src/infrastructure/logger.ts` | Pino structured logging |
| `src/validators/payload.validator.ts` | Zod schemas for payloads |
| `src/config/env.ts` | Environment configuration |
| `src/constants/topics.ts` | MQTT topic constants |

---

> **Tiếp theo:** [03-backend-api-service.md](./03-backend-api-service.md) — Backend REST API — Express.js service phục vụ dashboard
