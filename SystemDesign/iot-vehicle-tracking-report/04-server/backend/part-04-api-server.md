## PHẦN X: API SERVER (BACKEND APPLICATION)

> **📌 Cập nhật**: Tech stack đã được điều chỉnh theo kiến trúc IVM26 (Express + VictoriaMetrics) thay vì NestJS + InfluxDB ban đầu.

### X.1 Vai Trò API Server

**API Server** là lớp ứng dụng backend cung cấp:

1. **REST API**: Giao tiếp với frontend (web/mobile)
2. **WebSocket**: Real-time updates (vị trí, cảnh báo) via Socket.IO
3. **Business Logic**: Xử lý nghiệp vụ (quản lý xe, người dùng, cảnh báo)
4. **Authentication/Authorization**: Xác thực JWT và phân quyền
5. **Database Integration**: Kết nối PostgreSQL và VictoriaMetrics
6. **MQTT Integration**: Gửi commands đến trackers qua EMQX

**Kiến Trúc:**

```
Frontend (Web/Mobile)
    │
    ├─ REST API ──→ API Server ──→ PostgreSQL
    │                    │
    └─ WebSocket ──→ Socket.IO ──→ VictoriaMetrics
                         │
                         └─ MQTT Bridge ──→ EMQX ──→ Trackers
```

---

### X.2 Lựa Chọn Công Nghệ

**So Sánh Framework:**

| Tiêu Chí              | Express + TypeScript  | NestJS                | Go + Gin              |
| --------------------- | --------------------- | --------------------- | --------------------- |
| **Learning Curve**    | ⭐⭐⭐⭐⭐ (Rất dễ)   | ⭐⭐⭐⭐ (Trung bình) | ⭐⭐⭐ (Khó)          |
| **Flexibility**       | ⭐⭐⭐⭐⭐            | ⭐⭐⭐                | ⭐⭐⭐⭐              |
| **Performance**       | ⭐⭐⭐⭐              | ⭐⭐⭐⭐              | ⭐⭐⭐⭐⭐            |
| **Boilerplate**       | ⭐⭐⭐⭐⭐ (Ít)       | ⭐⭐⭐ (Nhiều)        | ⭐⭐⭐⭐              |
| **IoT Ecosystem**     | ⭐⭐⭐⭐⭐            | ⭐⭐⭐⭐              | ⭐⭐⭐⭐              |
| **Real-time**         | ⭐⭐⭐⭐⭐            | ⭐⭐⭐⭐⭐            | ⭐⭐⭐⭐              |

**✅ Lựa Chọn: Node.js + Express + TypeScript**

**Lý Do:**

1. **Linh hoạt**: Không bị ràng buộc bởi decorators/DI framework
2. **Nhẹ**: Ít overhead, phù hợp IoT với high-frequency data
3. **Control**: Toàn quyền kiểm soát middleware chain
4. **TypeScript**: Type safety mà không cần class-validator
5. **Zod Validation**: Runtime validation với type inference
6. **Domain-Driven**: Dễ tổ chức code theo feature/domain

---

### X.3 Tech Stack Chi Tiết

```
Backend Tech Stack:
├── Runtime: Node.js 20+ (LTS)
├── Framework: Express 4.x
├── Language: TypeScript 5.x
├── Validation: Zod (runtime + type inference)
├── Database:
│   ├── PostgreSQL 16 (relational data)
│   │   └── Driver: pg (raw queries, không ORM)
│   └── VictoriaMetrics (time-series data)
│       └── Query: PromQL/MetricsQL
├── Real-time:
│   ├── Socket.IO 4.x (WebSocket)
│   └── MQTT.js (EMQX integration)
├── Authentication: JWT (jsonwebtoken + bcryptjs)
├── Monitoring:
│   ├── prom-client (Prometheus metrics)
│   ├── VictoriaLogs (structured logging)
│   └── Sentry (error tracking)
├── Security:
│   ├── Helmet (security headers)
│   ├── CORS (cross-origin)
│   └── Rate Limiting (express-rate-limit)
└── API Docs: swagger-ui-express + OpenAPI
```

---

### X.4 Kiến Trúc API Server (Express + Domain-Driven)

**Cấu Trúc Thư Mục:**

```
backend/src/
├── index.ts                    # Entry point
├── api/                        # API Layer
│   ├── controllers/            # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── device.controller.ts
│   │   ├── dashboard.controller.ts
│   │   ├── firmware.controller.ts
│   │   ├── iot.controller.ts
│   │   └── export.controller.ts
│   ├── routes/                 # Route definitions
│   │   ├── auth.routes.ts
│   │   ├── device.routes.ts
│   │   ├── iot.routes.ts
│   │   └── index.ts
│   ├── validators/             # Zod schemas
│   │   ├── auth.validator.ts
│   │   ├── device.validator.ts
│   │   └── iot.validator.ts
│   └── openapi/                # Swagger specs
│
├── domain/                     # Business Logic (by feature)
│   ├── auth/
│   │   ├── services/
│   │   │   ├── auth-session.service.ts
│   │   │   └── user-management.service.ts
│   │   ├── repositories/
│   │   │   └── user.repository.ts
│   │   └── types/
│   │       └── auth.types.ts
│   │
│   ├── device/
│   │   ├── services/
│   │   │   ├── device-list.service.ts
│   │   │   ├── device-crud.service.ts
│   │   │   └── device-sessions.service.ts
│   │   ├── repositories/
│   │   │   ├── device.repository.ts
│   │   │   └── device-session.repository.ts
│   │   └── types/
│   │
│   ├── iot/
│   │   ├── services/
│   │   │   ├── iot-data-processing.service.ts
│   │   │   ├── session-tracking.service.ts
│   │   │   └── heartbeat-tracking.service.ts
│   │   └── types/
│   │
│   ├── dashboard/
│   │   ├── services/
│   │   │   └── dashboard-stats.service.ts
│   │   └── repositories/
│   │
│   ├── firmware/
│   │   ├── services/
│   │   │   ├── firmware-upload.service.ts
│   │   │   └── firmware-assignment.service.ts
│   │   └── repositories/
│   │
│   ├── notification/
│   │   └── services/
│   │       └── hybrid-notification.service.ts
│   │
│   └── audit/
│       └── services/
│           └── audit.service.ts
│
├── infrastructure/             # External Services
│   ├── database/
│   │   ├── pool.ts             # PostgreSQL connection pool
│   │   └── queries.ts          # Query helpers
│   ├── victoriametrics/
│   │   ├── client.ts           # VM write client
│   │   └── query.ts            # PromQL queries
│   ├── victorialogs/
│   │   └── client.ts           # VL write client
│   └── logger/
│       └── winston.ts
│
├── middleware/                 # Express Middleware
│   ├── auth.ts                 # JWT authentication
│   ├── cors.ts
│   ├── security.ts             # Helmet
│   ├── rate-limit.ts
│   ├── metrics.ts              # Prometheus
│   └── error-handler.ts
│
├── realtime/                   # WebSocket Server
│   ├── socket-server.ts        # Socket.IO setup
│   ├── socket-auth.ts          # WS authentication
│   └── event-bus.ts            # Internal pub/sub
│
├── mqtt-bridge/                # MQTT Integration (standalone capable)
│   ├── index.ts
│   ├── mqtt.client.ts
│   ├── handlers/
│   │   └── rawdata.handler.ts
│   └── batch/
│       └── database-batch.service.ts
│
├── config/                     # Configuration
│   ├── env.ts                  # Environment variables
│   └── sentry.ts
│
├── shared/                     # Shared Utilities
│   ├── constants/
│   ├── utils/
│   └── types/
│
└── types/                      # Global TypeScript types
```

---

### X.5 Domain Modules

**Phase 1 (Core):**

| Domain | Services | Description |
|--------|----------|-------------|
| **auth** | 4 | JWT login/logout, user CRUD, device access control |
| **device** | 8 | Device CRUD, sessions, runtime tracking |
| **iot** | 7 | Data ingestion, status tracking, heartbeat |
| **dashboard** | 3 | Statistics, activity log, alerts |
| **firmware** | 7 | OTA upload, assignment, activation |
| **notification** | 1 | Hybrid FCM + Socket.IO notifications |
| **audit** | 1 | Action logging |

**Phase 2 (Optional - Rental Features):**

| Domain | Services | Description |
|--------|----------|-------------|
| **customers** | 3 | Customer management, verification |
| **bookings** | 4 | Booking workflow, pickup/return |
| **payments** | 3 | Payment processing |
| **contracts** | 2 | Rental contracts |

---

### X.6 API Endpoints

**Authentication:**

```
POST   /api/v1/auth/login              # Đăng nhập
GET    /api/v1/auth/me                 # Current user info
POST   /api/v1/auth/logout             # Đăng xuất
POST   /api/v1/auth/change-password    # Đổi mật khẩu
GET    /api/v1/auth/users              # List users (admin)
POST   /api/v1/auth/users              # Create user (admin)
PUT    /api/v1/auth/users/:id          # Update user (admin)
DELETE /api/v1/auth/users/:id          # Delete user (admin)
```

**Devices:**

```
GET    /api/v1/device/list             # Danh sách thiết bị
GET    /api/v1/device/details          # Chi tiết thiết bị
POST   /api/v1/device/manage           # Thêm thiết bị (admin)
PUT    /api/v1/device/manage           # Cập nhật thiết bị (admin)
DELETE /api/v1/device/manage           # Xóa thiết bị (admin)
GET    /api/v1/device/sessions         # Lịch sử sessions
GET    /api/v1/device/runtime          # Runtime analytics
GET    /api/v1/device/status           # System status
```

**IoT Data (PUBLIC - No Auth):**

```
POST   /api/v1/iot/data                # Gửi sensor data
GET    /api/v1/iot/status              # Device status
GET    /api/v1/iot/latest              # Latest data
GET    /api/v1/iot/bootstrap           # Device config
```

**Dashboard:**

```
GET    /api/v1/dashboard/stats         # Statistics
GET    /api/v1/dashboard/activity-log  # Activity feed
GET    /api/v1/dashboard/alerts        # Alerts
```

**Firmware:**

```
GET    /api/v1/firmware/list           # List firmware
POST   /api/v1/firmware/upload         # Upload firmware
POST   /api/v1/firmware/activate       # Activate version
POST   /api/v1/firmware/assign         # Assign to devices
DELETE /api/v1/firmware/delete         # Delete firmware
```

---

### X.7 WebSocket (Socket.IO) Namespaces

```typescript
// 7 Namespaces với authentication
/dashboard      # Dashboard updates (auth required)
/devices        # Device status changes (auth required)
/firmware       # Firmware assignments (auth required)
/exports        # Export job progress (auth required)
/notifications  # Push notifications (auth required)
/mobile         # Mobile app events (auth required)
/iot            # IoT device data (PUBLIC)
```

**Events:**

```typescript
// Server → Client
'device.status.changed'     // Device online/offline
'device.sessions.updated'   // Session start/end
'dashboard.stats.updated'   // Stats refresh
'notification.received'     // New notification

// Client → Server
'device:join'               // Subscribe to device room
'device:leave'              // Unsubscribe
```

---

### X.8 Database Integration

**PostgreSQL (Raw Queries + Zod):**

```typescript
// device.repository.ts
import { z } from 'zod';
import { pool } from '@/infrastructure/database/pool';

const DeviceSchema = z.object({
  id: z.number(),
  device_id: z.string(),
  device_name: z.string(),
  current_status: z.enum(['running', 'stopped', 'disconnected']),
  last_seen_at: z.date().nullable(),
});

export async function findDeviceById(deviceId: string) {
  const result = await pool.query(
    'SELECT * FROM devices WHERE device_id = $1',
    [deviceId]
  );
  return DeviceSchema.parse(result.rows[0]);
}
```

**VictoriaMetrics (PromQL):**

```typescript
// victoriametrics/query.ts
export async function queryDeviceLocation(deviceId: string, range: string) {
  const query = `
    device_location{device_id="${deviceId}"}[${range}]
  `;
  const response = await fetch(
    `${VICTORIAMETRICS_URL}/api/v1/query_range?query=${encodeURIComponent(query)}`
  );
  return response.json();
}
```

---

### X.9 MQTT Bridge (Standalone)

```typescript
// mqtt-bridge/index.ts
// Có thể chạy độc lập: npm run mqtt-bridge

import { connectMQTT } from './mqtt.client';
import { handleRawData } from './handlers/rawdata.handler';

const client = await connectMQTT();

client.subscribe('v1/+/rawdata');

client.on('message', async (topic, payload) => {
  const deviceId = topic.split('/')[1];
  await handleRawData(deviceId, JSON.parse(payload.toString()));
});
```

**Data Flow:**

```
IoT Device (ESP32)
    → MQTT: v1/{device_id}/rawdata
    → EMQX Broker
    → MQTT Bridge
        ├── Validate payload (Zod)
        ├── Write to VictoriaMetrics (time-series)
        ├── Write to VictoriaLogs (events)
        ├── Update PostgreSQL (device status, sessions)
        └── Emit event to Socket.IO (real-time)
    → Dashboard updates
```

---

### X.10 Middleware Chain

```typescript
// index.ts - Thứ tự middleware
app.use(sentryRequestHandler);      // 1. Sentry (error tracking)
app.use(helmetMiddleware);          // 2. Security headers
app.use(compressionMiddleware);     // 3. Gzip/Brotli
app.use(corsMiddleware);            // 4. CORS
app.use(httpMetricsMiddleware);     // 5. Prometheus metrics
app.use(express.json());            // 6. Body parser
app.use(requestLogger);             // 7. Request logging
app.use(rateLimitMiddleware);       // 8. Rate limiting

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/device', deviceRoutes);
app.use('/api/v1/iot', iotRoutes);  // No auth for IoT endpoints

// Error handling (last)
app.use(errorHandler);
app.use(sentryErrorHandler);
```

---

### X.11 Deployment

**Docker Compose:**

```yaml
version: "3.8"
services:
  api-server:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - POSTGRESQL_URL=postgresql://user:pass@postgres:5432/tracking
      - VICTORIAMETRICS_URL=http://victoriametrics:8428
      - VICTORIALOGS_URL=http://victorialogs:9428
      - MQTT_BROKER=mqtt://emqx:1883
    depends_on:
      - postgres
      - victoriametrics
      - emqx

  mqtt-bridge:
    build: ./backend
    command: npm run mqtt-bridge
    environment:
      - POSTGRESQL_URL=...
      - VICTORIAMETRICS_URL=...
      - MQTT_BROKER=...
```

---

### X.12 So Sánh: NestJS vs Express (Tại sao chọn Express)

| Aspect | NestJS | Express (Đã chọn) |
|--------|--------|-------------------|
| **Boilerplate** | Nhiều (decorators, modules) | Ít (direct routing) |
| **Flexibility** | Ràng buộc bởi conventions | Tự do hoàn toàn |
| **Learning Curve** | Cần học DI, decorators | Đơn giản, trực tiếp |
| **IoT Suitability** | OK | Tốt hơn (nhẹ, nhanh) |
| **Code Organization** | Module-based | Domain-based |
| **Validation** | class-validator (runtime) | Zod (compile + runtime) |

**Kết luận:** Express phù hợp hơn cho IoT system với high-frequency data và yêu cầu linh hoạt.

---

### X.13 Tóm Tắt

**Tech Stack Hoàn Chỉnh:**

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend ──→ Express API Server ──→ PostgreSQL             │
│      │              │                                        │
│      │              ├──→ VictoriaMetrics (time-series)      │
│      │              │                                        │
│      └─→ Socket.IO ─┼──→ VictoriaLogs (logging)             │
│                     │                                        │
│                     └──→ MQTT Bridge ──→ EMQX ──→ Devices   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Ưu điểm:**

- ✅ Express nhẹ, linh hoạt, phù hợp IoT
- ✅ Zod validation với type inference
- ✅ VictoriaMetrics hiệu năng cao hơn InfluxDB
- ✅ Domain-driven structure dễ maintain
- ✅ MQTT Bridge standalone (scalable)
- ✅ Socket.IO với 7 namespaces (organized)
- ✅ Prometheus metrics + Sentry (observability)
