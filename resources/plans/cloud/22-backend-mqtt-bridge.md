# MQTT Bridge Architecture

> MQTT Bridge xử lý dữ liệu từ IoT devices qua EMQX broker
>
> ⚠️ **Kiến trúc:** MQTT Bridge là **standalone service** tại `Tracking_MqttBridge/` (top-level folder), KHÔNG nằm trong `Tracking_Backend/src/`

> ⚠️ **Import Note:** MQTT Bridge uses its OWN infrastructure files, not Backend's.
> `@/` alias maps to `Tracking_MqttBridge/src/`, NOT `Tracking_Backend/src/`.
> Logger, database pool, and config are self-contained within the Bridge.

---

## 1. Tổng Quan

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│  IoT Device │────▶│    EMQX     │────▶│     MQTT Bridge     │
│  (ESP32)    │     │   Broker    │     │  (Node.js Process)  │
└─────────────┘     └─────────────┘     └──────────┬──────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
                    ▼                              ▼                              ▼
            ┌───────────────┐             ┌───────────────┐             ┌───────────────┐
            │  PostgreSQL   │             │VictoriaMetrics│             │ VictoriaLogs  │
            │ (device state)│             │ (time-series) │             │   (events)    │
            └───────────────┘             └───────────────┘             └───────────────┘
```

### 1.1 Code-based Strategy Pattern

To support multiple device types (e.g., Teltonika, Concox, JSON) with high performance and type safety, the bridge uses a **Strategy Pattern**:

1.  **Ingest**: Bridge receives payload on `v1/+/rawdata`.
2.  **Identify**: Look up `device_id` to determine the protocol/model (e.g., via prefix or config).
3.  **Select Strategy**: Instantiate the matching `IDeviceParser` (e.g., `TeltonikaParser`, `JsonParser`).
4.  **Parse & Normalize**: The parser code transforms raw bytes/JSON -> Standard Internal Schema.
5.  **Route**: Send normalized data to Storage.

**Interface Definition:**
```typescript
interface IDeviceParser {
  parse(payload: Buffer | unknown): ParsedData;
  getCommand(type: CommandType, params: any): object;
}
```

---

## 2. MQTT Topics

### 2.1 Device → Server

```
v1/{device_id}/rawdata      # Sensor data từ device
v1/{device_id}/status       # Device status updates
v1/{device_id}/firmware     # Firmware update status
v1/{device_id}/error        # Error reports
```

### 2.2 Server → Device

```
v1/{device_id}/commands     # Commands to device
v1/{device_id}/config       # Configuration updates
v1/{device_id}/ota          # OTA firmware instructions
```

### 2.3 Internal Events (MQTT Bridge → Backend)

> ⚠️ **Quyết định kiến trúc:** Dùng EMQX internal topics thay vì EventBus (in-process)
> để MQTT Bridge có thể chạy standalone, tách biệt khỏi Backend process.
> EMQX đã có sẵn trong stack — không cần thêm Redis.

```
internal/events/device/status      # Device online/offline/running/stopped
internal/events/device/alert        # Vibration threshold, battery low, etc.
internal/events/device/session      # Session start/end
internal/events/device/data         # Real-time data summary (optional, QoS 0)
```

**QoS Strategy:**

| Topic                            | QoS   | Lý do                                     |
| -------------------------------- | ----- | ----------------------------------------- |
| `internal/events/device/status`  | **1** | Quan trọng — user cần thấy online/offline |
| `internal/events/device/alert`   | **1** | Business-critical — không được mất alert  |
| `internal/events/device/session` | **1** | Session tracking cần chính xác            |
| `internal/events/device/data`    | **0** | Tần suất cao, mất vài message OK          |

**EMQX ACL Rules (thêm vào config):**

```
{allow, {user, "mqtt_bridge"}, publish, ["internal/events/#"]}.
{allow, {user, "backend_service"}, subscribe, ["internal/events/#"]}.
{deny, all, all, ["internal/#"]}.  % Block devices khỏi internal topics
```

---

## 3. Payload Formats

### 3.1 Raw Data Payload

```json
{
  "device_id": "TRACKER_001",
  "auth_token": "device_auth_token",
  "timestamp": 1704067200000,
  "uptime": 3600,
  "data": {
    "vibration": 0.85,
    "battery_top": 4.15,
    "battery_bot": 4.12,
    "latitude": 21.0285,
    "longitude": 105.8542,
    "speed": 60.5,
    "course": 180.0,
    "satellites": 12,
    "ignition": true,
    "error_code": 0
  }
}
```

### 3.2 Status Payload

```json
{
  "device_id": "TRACKER_001",
  "status": "running",
  "session_id": 123,
  "timestamp": 1704067200000
}
```

### 3.3 Command Payload (Server → Device)

```json
{
  "command": "update_config",
  "params": {
    "vibration_threshold": 2.0,
    "request_interval": 3000
  },
  "timestamp": 1704067200000,
  "correlation_id": "cmd_123"
}
```

---

## 4. Cấu Trúc Thư Mục

> 📁 **Vị trí:** `iot-vehicle-tracking-system-cloud/mqtt-bridge/` (standalone service, tách biệt khỏi backend)

```
mqtt-bridge/
├── index.ts                        # Entry point
├── mqtt.client.ts                  # MQTT client setup
├── postgresql.client.ts            # PostgreSQL writer
├── victoriametrics.client.ts       # VictoriaMetrics writer
├── victorialogs.client.ts          # VictoriaLogs writer
├── parsers/                        # Device Protocol Parsers
│   ├── index.ts                    # Factory/Strategy Selector
│   ├── interface.ts                # IDeviceParser interface
│   ├── json.parser.ts              # Standard JSON parser
│   └── teltonika.parser.ts         # Teltonika binary parser
├── handlers/
│   ├── rawdata.handler.ts          # Process raw sensor data
│   ├── status.handler.ts           # Process status updates
│   └── firmware.handler.ts         # Process firmware updates
├── batch/
│   └── database-batch.service.ts   # Batch insert optimization
├── cache/
│   ├── device-state.cache.ts       # In-memory device state
│   └── session-stats.cache.ts      # Session statistics cache
├── validators/
│   └── payload.validator.ts        # Zod validation schemas
├── types/
│   └── payload.types.ts            # TypeScript types
├── constants/
│   ├── topics.ts                   # Device topic constants
│   └── internal-events.ts          # Internal event topic constants + QoS
├── publishers/
│   └── internal-event.publisher.ts # Publish events to EMQX internal topics
└── utils/
    ├── correlation.util.ts         # Request correlation
    └── retry.util.ts               # Retry logic
```

---

## 5. Code Implementation

### 5.1 Entry Point

```typescript
// mqtt-bridge/index.ts
import { connectMQTT, disconnectMQTT } from './mqtt.client';
import { initPostgreSQL, closePostgreSQL } from './postgresql.client';
import { initVictoriaMetrics } from './victoriametrics.client';
import { handleRawData } from './handlers/rawdata.handler';
import { handleStatus } from './handlers/status.handler';
import { logger } from '@/infrastructure/logger';

async function main() {
  logger.info('Starting MQTT Bridge...');

  // Initialize clients
  await initPostgreSQL();
  await initVictoriaMetrics();

  // Connect to MQTT
  const client = await connectMQTT();

  // Subscribe to topics
  client.subscribe('v1/+/rawdata');
  client.subscribe('v1/+/status');
  client.subscribe('v1/+/firmware');

  // Handle messages
  client.on('message', async (topic, payload) => {
    const [, deviceId, type] = topic.split('/');
    let data: unknown;
    try {
      data = JSON.parse(payload.toString());
    } catch {
      logger.warn(`Malformed payload on ${topic}: ${payload.toString().slice(0, 200)}`);
      return;
    }

    switch (type) {
      case 'rawdata':
        await handleRawData(deviceId, data);
        break;
      case 'status':
        await handleStatus(deviceId, data);
        break;
    }
  });

  logger.info('MQTT Bridge started successfully');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down MQTT Bridge...');
  await disconnectMQTT();
  await closePostgreSQL();
  process.exit(0);
});

main().catch((err) => {
  logger.error('Failed to start MQTT Bridge:', err);
  process.exit(1);
});
```

### 5.2 MQTT Client (với TLS/MQTTS Support)

> ⚠️ **Pattern từ IVM26:** Sử dụng dynamic protocol selection để hỗ trợ cả MQTT (dev) và MQTTS (prod)

```typescript
// mqtt-bridge/mqtt.client.ts
import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { env } from './config/env';
import { logger } from './infrastructure/logger';

let client: MqttClient | null = null;

// =============================================================================
// MQTT Configuration Interface
// =============================================================================
interface MqttConfig {
  host: string;
  port: number;           // Non-TLS port (1883)
  tlsPort: number;        // TLS port (8883)
  useTls: boolean;
  username: string;
  password: string;
  rejectUnauthorized: boolean; // false for self-signed certs
}

const mqttConfig: MqttConfig = {
  host: env.MQTT_HOST || 'emqx',
  port: parseInt(env.MQTT_PORT || '1883'),
  tlsPort: parseInt(env.MQTT_TLS_PORT || '8883'),
  useTls: env.MQTT_USE_TLS === 'true',
  username: env.MQTT_USERNAME || 'mqtt_bridge',
  password: env.MQTT_PASSWORD || '',
  rejectUnauthorized: env.MQTT_REJECT_UNAUTHORIZED !== 'false',
};

// =============================================================================
// Connect to MQTT Broker (MQTT or MQTTS)
// =============================================================================
export async function connectMQTT(): Promise<MqttClient> {
  return new Promise((resolve, reject) => {
    const options: IClientOptions = {
      host: mqttConfig.host,
      port: mqttConfig.useTls ? mqttConfig.tlsPort : mqttConfig.port,
      protocol: mqttConfig.useTls ? 'mqtts' : 'mqtt',
      username: mqttConfig.username,
      password: mqttConfig.password,
      clientId: 'mqtt-bridge-production',  // Stable ID for persistent sessions
      clean: false,  // Persistent session: broker queues QoS 1 messages during restart
      keepalive: 60,
      reconnectPeriod: 5000,
      connectTimeout: 30000,

      // TLS options for self-signed certificates (development)
      // In production with proper CA certs, set rejectUnauthorized: true
      ...(mqttConfig.useTls && {
        rejectUnauthorized: mqttConfig.rejectUnauthorized,
        // For production with CA cert:
        // ca: fs.readFileSync('/path/to/ca.crt'),
      }),
    };

    const protocol = mqttConfig.useTls ? 'mqtts' : 'mqtt';
    const port = mqttConfig.useTls ? mqttConfig.tlsPort : mqttConfig.port;

    logger.info(`Connecting to MQTT broker: ${protocol}://${mqttConfig.host}:${port}`);

    client = mqtt.connect(options);

    client.on('connect', () => {
      logger.info(`✅ Connected to MQTT broker (TLS: ${mqttConfig.useTls})`);
      resolve(client!);
    });

    client.on('error', (err) => {
      logger.error('❌ MQTT connection error:', err);
      reject(err);
    });

    client.on('reconnect', () => {
      logger.warn('🔄 Reconnecting to MQTT broker...');
    });

    client.on('offline', () => {
      logger.warn('📴 MQTT client offline');
    });
  });
}

// =============================================================================
// Disconnect from MQTT Broker
// =============================================================================
export async function disconnectMQTT(): Promise<void> {
  if (client) {
    await client.endAsync();
    client = null;
    logger.info('Disconnected from MQTT broker');
  }
}

// =============================================================================
// Get current MQTT client instance
// =============================================================================
export function getClient(): MqttClient | null {
  return client;
}

// =============================================================================
// Publish command to device
// =============================================================================
export function publishCommand(deviceId: string, command: object): void {
  if (client) {
    client.publish(
      `v1/${deviceId}/commands`,
      JSON.stringify(command),
      { qos: 1 }
    );
  }
}
```

### 5.3 Raw Data Handler

```typescript
// mqtt-bridge/handlers/rawdata.handler.ts
import { z } from 'zod';
import { validateDevice, updateDeviceStatus } from '../postgresql.client';
import { writeMetrics } from '../victoriametrics.client';
import { writeLog } from '../victorialogs.client';
import { batchService } from '../batch/database-batch.service';
import { deviceStateCache } from '../cache/device-state.cache';
import { publishInternalEvent } from '../publishers/internal-event.publisher';
import { logger } from '@/infrastructure/logger';
import { generateCorrelationId } from '../utils/correlation.util';

const RawDataSchema = z.object({
  device_id: z.string(),
  auth_token: z.string(),
  timestamp: z.number(),
  uptime: z.number().optional(),
  data: z.object({
    vibration: z.number().optional(),
    battery_top: z.number().optional(),
    battery_bot: z.number().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    speed: z.number().optional(),
    course: z.number().optional(),
    satellites: z.number().optional(),
    ignition: z.boolean().optional(),
    error_code: z.number().optional(),
  }),
});

export async function handleRawData(
  deviceId: string,
  payload: unknown
): Promise<void> {
  const correlationId = generateCorrelationId();

  try {
    // 1. Validate payload
    const data = RawDataSchema.parse(payload);

    // 2. Validate device authentication
    const device = await validateDevice(deviceId, data.auth_token);
    if (!device) {
      logger.warn(`Invalid device or auth token: ${deviceId}`);
      return;
    }

    // 3. Check/update session
    const session = await deviceStateCache.getOrCreateSession(deviceId);

    // 4. Write to VictoriaMetrics (time-series)
    await writeMetrics(deviceId, data.timestamp, data.data);

    // 5. Write to VictoriaLogs (event log)
    await writeLog({
      level: 'info',
      deviceId,
      sessionId: session.id,
      correlationId,
      message: 'Raw data received',
      data: data.data,
    });

    // 6. Batch update PostgreSQL
    batchService.addUpdate({
      deviceId,
      sessionId: session.id,
      timestamp: data.timestamp,
      uptime: data.uptime,
      vibration: data.data.vibration,
      batteryTop: data.data.battery_top,
      batteryBot: data.data.battery_bot,
      latitude: data.data.latitude,
      longitude: data.data.longitude,
    });

    // 7. Update device status if changed
    const newStatus = data.data.ignition ? 'running' : 'stopped';
    const currentStatus = deviceStateCache.getStatus(deviceId);

    if (currentStatus !== newStatus) {
      await updateDeviceStatus(deviceId, newStatus);
      deviceStateCache.setStatus(deviceId, newStatus);

      // Publish status change via EMQX internal topic (QoS 1)
      publishInternalEvent('device/status', {
        deviceId,
        status: newStatus,
        timestamp: new Date().toISOString(),
      });
    }

    // 8. Check for alerts
    if (data.data.vibration && data.data.vibration > device.vibration_threshold) {
      // Publish alert via EMQX internal topic (QoS 1)
      publishInternalEvent('device/alert', {
        deviceId,
        type: 'high_vibration',
        value: data.data.vibration,
        threshold: device.vibration_threshold,
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`Invalid payload from ${deviceId}:`, error.errors);
    } else {
      logger.error(`Error processing data from ${deviceId}:`, error);
    }
  }
}
```

### 5.4 Internal Event Publisher (EMQX Internal Topics)

> ⚠️ **Thay thế EventBus:** Module này publish events qua EMQX internal topics
> để Backend (process riêng) có thể subscribe và đẩy tới Frontend qua Socket.IO.

```typescript
// mqtt-bridge/constants/internal-events.ts
export const INTERNAL_TOPICS = {
  DEVICE_STATUS: 'internal/events/device/status',
  DEVICE_ALERT: 'internal/events/device/alert',
  DEVICE_SESSION: 'internal/events/device/session',
  DEVICE_DATA: 'internal/events/device/data',
} as const;

export const INTERNAL_QOS: Record<string, 0 | 1 | 2> = {
  'device/status': 1,
  'device/alert': 1,
  'device/session': 1,
  'device/data': 0,
};
```

```typescript
// mqtt-bridge/publishers/internal-event.publisher.ts
import { getClient } from '../mqtt.client';
import { INTERNAL_QOS } from '../constants/internal-events';
import { logger } from '@/infrastructure/logger';

type InternalEventType = 'device/status' | 'device/alert' | 'device/session' | 'device/data';

export function publishInternalEvent(
  eventType: InternalEventType,
  payload: Record<string, unknown>
): void {
  const client = getClient();
  if (!client) {
    logger.warn(`Cannot publish internal event: MQTT client not connected`);
    return;
  }

  const topic = `internal/events/${eventType}`;
  const qos = INTERNAL_QOS[eventType] ?? 1;

  client.publish(topic, JSON.stringify(payload), { qos }, (err) => {
    if (err) {
      logger.error(`Failed to publish internal event to ${topic}:`, err);
    }
  });
}
```

### 5.5 VictoriaMetrics Writer


```typescript
// mqtt-bridge/victoriametrics.client.ts
import { env } from '@/config/env';
import { logger } from '@/infrastructure/logger';

const VM_URL = env.VICTORIAMETRICS_URL;

interface MetricsData {
  vibration?: number;
  battery_top?: number;
  battery_bot?: number;
  latitude?: number;
  longitude?: number;
  speed?: number;
  course?: number;
  satellites?: number;
}

export async function writeMetrics(
  deviceId: string,
  timestamp: number,
  data: MetricsData
): Promise<void> {
  const metrics: string[] = [];

  // Sanitize deviceId to prevent metric label injection
  const safeDeviceId = deviceId.replace(/[^A-Za-z0-9_-]/g, '_');

  if (data.vibration !== undefined) {
    metrics.push(`device_vibration{device_id="${safeDeviceId}"} ${data.vibration} ${timestamp}`);
  }
  if (data.battery_top !== undefined) {
    metrics.push(`device_battery_top{device_id="${safeDeviceId}"} ${data.battery_top} ${timestamp}`);
  }
  if (data.battery_bot !== undefined) {
    metrics.push(`device_battery_bot{device_id="${safeDeviceId}"} ${data.battery_bot} ${timestamp}`);
  }
  if (data.latitude !== undefined) {
    metrics.push(`device_latitude{device_id="${safeDeviceId}"} ${data.latitude} ${timestamp}`);
  }
  if (data.longitude !== undefined) {
    metrics.push(`device_longitude{device_id="${safeDeviceId}"} ${data.longitude} ${timestamp}`);
  }
  if (data.speed !== undefined) {
    metrics.push(`device_speed{device_id="${safeDeviceId}"} ${data.speed} ${timestamp}`);
  }

  if (metrics.length > 0) {
    try {
      await fetch(`${VM_URL}/api/v1/import/prometheus`, {
        method: 'POST',
        body: metrics.join('\n'),
      });
    } catch (error) {
      logger.error('Failed to write to VictoriaMetrics:', error);
    }
  }
}
```

### 5.5 Batch Service

```typescript
// mqtt-bridge/batch/database-batch.service.ts
import { pool } from '@/infrastructure/database';
import { logger } from '@/infrastructure/logger';

interface BatchUpdate {
  deviceId: string;
  sessionId: number;
  timestamp: number;
  uptime?: number;
  vibration?: number;
  batteryTop?: number;
  batteryBot?: number;
  latitude?: number;
  longitude?: number;
}

export const createDatabaseBatchService = () => {
  let buffer: BatchUpdate[] = [];
  let flushInterval: NodeJS.Timeout | null = null;
  const BATCH_SIZE = 100;
  const FLUSH_INTERVAL_MS = 1000;
  const MAX_BUFFER_SIZE = 10_000;
  let consecutiveFailures = 0;
  const MAX_RETRIES = 3;

  const flush = async (): Promise<void> => {
    if (buffer.length === 0) return;

    if (consecutiveFailures >= MAX_RETRIES) {
      logger.error(`Circuit breaker open: ${consecutiveFailures} consecutive failures`);
      buffer = []; // Drop to prevent OOM
      return;
    }

    const updates = [...buffer];
    buffer = [];

    try {
      // Batch update devices
      const deviceUpdates = updates.reduce((acc, u) => {
        if (!acc[u.deviceId]) {
          acc[u.deviceId] = u;
        } else if (u.timestamp > acc[u.deviceId].timestamp) {
          acc[u.deviceId] = u;
        }
        return acc;
      }, {} as Record<string, BatchUpdate>);

      for (const update of Object.values(deviceUpdates)) {
        await pool.query(
          `UPDATE devices
           SET last_seen_at = to_timestamp($1 / 1000.0),
               latitude = COALESCE($2, latitude),
               longitude = COALESCE($3, longitude),
               updated_at = NOW()
           WHERE device_id = $4`,
          [update.timestamp, update.latitude, update.longitude, update.deviceId]
        );
      }

      // Batch update sessions
      const sessionUpdates = updates.reduce((acc, u) => {
        if (!acc[u.sessionId]) {
          acc[u.sessionId] = {
            count: 0,
            vibrationSum: 0,
            vibrationMin: Infinity,
            vibrationMax: -Infinity,
            batteryTopSum: 0,
            batteryBotSum: 0,
            lastUpdate: u.timestamp,
            uptime: u.uptime,
          };
        }
        const s = acc[u.sessionId];
        s.count++;
        if (u.vibration !== undefined) {
          s.vibrationSum += u.vibration;
          s.vibrationMin = Math.min(s.vibrationMin, u.vibration);
          s.vibrationMax = Math.max(s.vibrationMax, u.vibration);
        }
        if (u.batteryTop !== undefined) s.batteryTopSum += u.batteryTop;
        if (u.batteryBot !== undefined) s.batteryBotSum += u.batteryBot;
        if (u.timestamp > s.lastUpdate) {
          s.lastUpdate = u.timestamp;
          s.uptime = u.uptime;
        }
        return acc;
      }, {} as Record<number, any>);

      for (const [sessionId, stats] of Object.entries(sessionUpdates)) {
        await pool.query(
          `UPDATE device_sessions
           SET data_points_count = data_points_count + $1,
               avg_vibration = (avg_vibration * data_points_count + $2) / (data_points_count + $1),
               min_vibration = LEAST(min_vibration, $3),
               max_vibration = GREATEST(max_vibration, $4),
               uptime = COALESCE($5, uptime),
               last_update = to_timestamp($6 / 1000.0),
               updated_at = NOW()
           WHERE id = $7`,
          [
            stats.count,
            stats.vibrationSum,
            stats.vibrationMin === Infinity ? null : stats.vibrationMin,
            stats.vibrationMax === -Infinity ? null : stats.vibrationMax,
            stats.uptime,
            stats.lastUpdate,
            parseInt(sessionId),
          ]
        );
      }

      logger.debug(`Flushed ${updates.length} updates to database`);
      consecutiveFailures = 0;
    } catch (error) {
      logger.error('Failed to flush batch updates:', error);
      consecutiveFailures++;
      if (buffer.length < MAX_BUFFER_SIZE) {
        buffer.unshift(...updates);
      } else {
        logger.warn(`Buffer full (${MAX_BUFFER_SIZE}), dropping ${updates.length} updates`);
      }
    }
  };

  const startFlushInterval = (): void => {
    flushInterval = setInterval(() => {
      void flush();
    }, FLUSH_INTERVAL_MS);
  };

  const addUpdate = (update: BatchUpdate): void => {
    buffer.push(update);
    if (buffer.length >= BATCH_SIZE) {
      void flush();
    }
  };

  const shutdown = async (): Promise<void> => {
    if (flushInterval) {
      clearInterval(flushInterval);
    }
    await flush();
  };

  startFlushInterval();

  return {
    addUpdate,
    flush,
    shutdown,
  };
};

export const batchService = createDatabaseBatchService();
```

---

## 6. Device State Cache

```typescript
// mqtt-bridge/cache/device-state.cache.ts
import { pool } from '@/infrastructure/database';

interface DeviceState {
  status: string;
  sessionId: number | null;
  lastSeen: number;
}

export const createDeviceStateCache = () => {
  const cache: Map<string, DeviceState> = new Map();

  const getStatus = (deviceId: string): string | null => {
    return cache.get(deviceId)?.status ?? null;
  };

  const setStatus = (deviceId: string, status: string): void => {
    const state = cache.get(deviceId) || {
      status: 'stopped',
      sessionId: null,
      lastSeen: Date.now(),
    };
    state.status = status;
    state.lastSeen = Date.now();
    cache.set(deviceId, state);
  };

  const updateSessionId = (deviceId: string, sessionId: number): void => {
    const state = cache.get(deviceId) || {
      status: 'running',
      sessionId: null,
      lastSeen: Date.now(),
    };
    state.sessionId = sessionId;
    cache.set(deviceId, state);
  };

  const getOrCreateSession = async (deviceId: string): Promise<{ id: number }> => {
    const state = cache.get(deviceId);

    if (state?.sessionId) {
      return { id: state.sessionId };
    }

    // Check for existing running session
    const existing = await pool.query(
      `SELECT id FROM device_sessions
       WHERE device_id = $1 AND status = 'running'
       LIMIT 1`,
      [deviceId]
    );

    if (existing.rows.length > 0) {
      updateSessionId(deviceId, existing.rows[0].id);
      return { id: existing.rows[0].id };
    }

    // Create new session
    const result = await pool.query(
      `INSERT INTO device_sessions (device_id, status, server_session_start)
       VALUES ($1, 'running', NOW())
       RETURNING id`,
      [deviceId]
    );

    updateSessionId(deviceId, result.rows[0].id);
    return { id: result.rows[0].id };
  };

  return {
    getStatus,
    setStatus,
    getOrCreateSession,
  };
};

export const deviceStateCache = createDeviceStateCache();
```

---

## 7. Environment Variables

```bash
# =============================================================================
# MQTT BROKER (EMQX) - Supports both MQTT and MQTTS
# =============================================================================
# Host (container name trong Docker network)
MQTT_HOST=emqx

# Non-TLS port (internal/development)
MQTT_PORT=1883

# TLS port (production) - Port 8883
MQTT_TLS_PORT=8883

# Enable TLS (set to 'true' for production)
MQTT_USE_TLS=false

# For self-signed certificates in development
# Set to 'false' to accept self-signed certs
MQTT_REJECT_UNAUTHORIZED=false

# Authentication
MQTT_USERNAME=mqtt_bridge
MQTT_PASSWORD=secret

# =============================================================================
# PostgreSQL
# =============================================================================
POSTGRESQL_HOST=postgres
POSTGRESQL_PORT=5432
POSTGRESQL_DATABASE=vehicle_tracking
POSTGRESQL_USER=postgres
POSTGRESQL_PASSWORD=secret

# =============================================================================
# VictoriaMetrics & VictoriaLogs
# =============================================================================
VICTORIAMETRICS_URL=http://victoriametrics:8428
VICTORIALOGS_URL=http://victorialogs:9428
```

---

## 8. Running MQTT Bridge

```bash
# Development
npm run mqtt-bridge

# Production (separate process)
node dist/mqtt-bridge/index.js

# Docker (separate container)
docker-compose up mqtt-bridge
```

---

## 9. Monitoring

### Prometheus Metrics

```typescript
// Exposed at /metrics
mqtt_messages_received_total{topic="rawdata"}
mqtt_messages_processed_total{topic="rawdata", status="success"}
mqtt_messages_processed_total{topic="rawdata", status="error"}
mqtt_processing_duration_seconds{topic="rawdata"}
database_batch_size
database_flush_duration_seconds
```

### Health Check

```typescript
// GET /mqtt-bridge/health
{
  "status": "healthy",
  "mqtt": "connected",
  "postgresql": "connected",
  "victoriametrics": "connected",
  "buffer_size": 15,
  "uptime": 86400
}
```

---

## 10. OTA Hybrid Protocol

### 10.1 HTTP Download Flow

The OTA process uses a hybrid approach: MQTT for notification/coordination and HTTP for efficient binary data transfer. This aligns with the IVM26 reference architecture.

1.  **Notification (Server -> Device)**
    *   Topic: `v1/{device_id}/ota/notify`
    *   Payload:
        ```json
        {
          "version": "1.0.1",
          "url": "http://api.domain.com/api/v1/firmware/fw_123/download",
          "checksum": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "size": 102400
        }
        ```

2.  **Download (Device -> Server)**
    *   Device connects to `url` via **HTTP GET**.
    *   Server streams the binary file.
    *   Device validates `checksum` and `size` after download.

3.  **Status Reporting (Device -> Server)**
    *   Topic: `v1/{device_id}/firmware`
    *   Payload:
        ```json
        {
          "status": "downloading", // or "installing", "success", "failed"
          "progress": 50,          // percentage
          "targetVersion": "1.0.1",
          "error": "optional_error_message"
        }
        ```

