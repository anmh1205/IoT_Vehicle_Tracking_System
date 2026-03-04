## PHẦN X: API SERVER (BACKEND APPLICATION)

> **📌 Cập nhật**: Tech stack đã được điều chỉnh theo kiến trúc IVM26 (Express + VictoriaMetrics) thay vì NestJS + InfluxDB ban đầu.

### X.1 Vai Trò API Server

**API Server** là lớp ứng dụng backend cung cấp:

1. **REST API**: Giao tiếp với frontend (web/mobile)
2. **WebSocket**: Real-time updates (vị trí, cảnh báo) via Socket.IO
3. **Business Logic**: Xử lý nghiệp vụ (quản lý xe, người dùng, cảnh báo)
4. **Authentication/Authorization**: Xác thực Session-based (database-backed tokens, SHA-256 hashed) và phân quyền
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
├── Authentication: Session-based (database-backed tokens, SHA-256 hashed, bcryptjs cho password)
│   └── Không dùng JWT — session tokens lưu trong bảng user_sessions PostgreSQL
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
Tracking_Backend/src/
├── index.ts                    # Entry point
├── api/                        # API Layer
│   ├── routes/                 # Route definitions (flat, per-domain)
│   └── openapi/                # Swagger specs
│
├── domain/                     # Business Logic (by feature — 20+ modules)
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
│   │   │   ├── device-crud.service.ts
│   │   │   ├── device-list.service.ts
│   │   │   ├── device-details.service.ts
│   │   │   ├── device-command.service.ts
│   │   │   ├── device-error.service.ts
│   │   │   ├── device-runtime.service.ts
│   │   │   ├── device-sessions.service.ts
│   │   │   └── device-telemetry.service.ts
│   │   ├── repositories/
│   │   │   ├── device.repository.ts
│   │   │   └── device-session.repository.ts
│   │   └── types/
│   │       └── device.types.ts
│   │
│   ├── vehicle/
│   │   ├── services/
│   │   │   ├── vehicle-crud.service.ts
│   │   │   ├── vehicle-list.service.ts
│   │   │   └── vehicle-assignment.service.ts
│   │   ├── repositories/
│   │   └── types/
│   │
│   ├── customer/
│   │   ├── services/
│   │   │   ├── customer-crud.service.ts
│   │   │   └── customer-list.service.ts
│   │   ├── repositories/
│   │   └── types/
│   │
│   ├── driver/
│   │   ├── services/
│   │   │   ├── driver-crud.service.ts
│   │   │   └── driver-list.service.ts
│   │   ├── repositories/
│   │   └── types/
│   │
│   ├── trip/
│   │   ├── services/
│   │   │   ├── trip-crud.service.ts
│   │   │   └── trip-list.service.ts
│   │   ├── repositories/
│   │   └── types/
│   │
│   ├── alert/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── types/
│   │
│   ├── geofence/
│   │   ├── services/
│   │   │   ├── geofence-crud.service.ts
│   │   │   └── geofence-list.service.ts
│   │   ├── repositories/
│   │   └── types/
│   │
│   ├── maintenance/
│   │   ├── services/
│   │   │   ├── maintenance-crud.service.ts
│   │   │   └── maintenance-list.service.ts
│   │   ├── repositories/
│   │   └── types/
│   │
│   ├── iot/
│   │   └── services/
│   │       └── iot-ingestion.service.ts
│   │
│   ├── dashboard/
│   │   ├── services/
│   │   │   └── dashboard-stats.service.ts
│   │   ├── repositories/
│   │   └── types/
│   │
│   ├── firmware/
│   │   ├── services/
│   │   │   ├── firmware-upload.service.ts
│   │   │   ├── firmware-list.service.ts
│   │   │   ├── firmware-activate.service.ts
│   │   │   ├── firmware-deploy.service.ts
│   │   │   └── firmware-delete.service.ts
│   │   ├── repositories/
│   │   └── types/
│   │
│   ├── export/
│   │   ├── services/
│   │   │   ├── export-job.service.ts
│   │   │   ├── export-file.service.ts
│   │   │   └── export-processing.service.ts
│   │   ├── repositories/
│   │   └── types/
│   │
│   ├── fuel-analytics/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── types/
│   │
│   ├── statistics/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── types/
│   │
│   ├── telemetry/
│   │   └── services/
│   │       └── telemetry-history.service.ts
│   │
│   ├── notification/
│   │   └── services/
│   │       └── notification.service.ts
│   │
│   ├── error-code/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── types/
│   │
│   ├── validation-error/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── types/
│   │
│   ├── simulator/
│   │   ├── services/
│   │   └── types/
│   │
│   ├── system/
│   │   └── services/
│   │       └── system-status.service.ts
│   │
│   └── system-admin/
│       ├── services/
│       └── repositories/
│           ├── victoriametrics.repository.ts
│           └── victorialogs.repository.ts
│
├── infrastructure/             # External Services
│   ├── database/
│   │   ├── pool.ts             # PostgreSQL connection pool
│   │   └── queries.ts          # Query helpers
│   ├── logger/
│   │   ├── index.ts
│   │   ├── winston.ts
│   │   └── victorialogs-transport.ts
│   ├── metrics/
│   │   ├── registry.ts         # Prometheus registry
│   │   └── app-metrics.ts      # Custom app metrics
│   └── realtime/
│       ├── index.ts
│       ├── socket-server.util.ts
│       ├── socket-auth.middleware.ts
│       ├── event-bus.util.ts
│       ├── mqtt-event-listener.ts
│       ├── health.ts
│       └── types.ts
│
├── middleware/                 # Express Middleware
│   ├── auth.middleware.ts      # Session-based authentication
│   ├── error-handler.middleware.ts
│   ├── rate-limit.middleware.ts
│   ├── request-id.middleware.ts  # Request-ID correlation
│   ├── metrics.middleware.ts     # Prometheus HTTP metrics
│   └── sentry.middleware.ts      # Sentry error tracking
│
├── shared/                     # Shared Utilities
│   ├── types/
│   │   └── common.types.ts
│   └── utils/
│       ├── async-handler.util.ts
│       ├── crypto.util.ts
│       ├── errors.util.ts
│       └── response.util.ts
│
└── types/                      # Global TypeScript types
    └── express.d.ts
```

> **⚠️ Lưu ý:** MQTT Bridge đã được tách thành service **standalone** `Tracking_MqttBridge/` (không nằm trong Tracking_Backend/ nữa). Xem phần X.9.

---

### X.5 Domain Modules

**Đã triển khai (20+ modules):**

| Domain | Services | Description |
|--------|----------|-------------|
| **auth** | 2 | Session-based login/logout, user CRUD, device access control |
| **device** | 8 | Device CRUD, sessions, runtime, telemetry, commands, errors |
| **vehicle** | 3 | Vehicle CRUD, list, assignment |
| **customer** | 2 | Customer CRUD, list |
| **driver** | 2 | Driver CRUD, list |
| **trip** | 2 | Trip CRUD, list |
| **geofence** | 2 | Geofence CRUD, list |
| **maintenance** | 2 | Maintenance CRUD, list |
| **iot** | 1 | IoT data ingestion |
| **dashboard** | 1 | Dashboard statistics |
| **firmware** | 5 | OTA upload, list, activate, deploy, delete |
| **export** | 3 | Export job management, file generation, processing |
| **fuel-analytics** | 1 | Fuel consumption analytics |
| **statistics** | 1 | System-wide statistics |
| **telemetry** | 1 | Telemetry history queries |
| **notification** | 1 | Push notifications |
| **error-code** | 1 | Error code definitions |
| **validation-error** | 1 | MQTT payload validation errors |
| **simulator** | 1 | Device simulator for testing |
| **system** | 1 | System status |
| **system-admin** | 1 | VictoriaMetrics + VictoriaLogs admin queries |

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

### X.9 MQTT Bridge (Standalone Service — `Tracking_MqttBridge/`)

> **📌 Cập nhật:** MQTT Bridge đã được tách thành service **hoàn toàn độc lập** `Tracking_MqttBridge/` với `package.json`, `docker-compose.yml`, logger, pool, và config riêng. Không còn nằm trong `Tracking_Backend/`.

```
iot-vehicle-tracking-system/
├── Tracking_Backend/        # API Server (Express)
├── Tracking_MqttBridge/     # MQTT Bridge (standalone)
│   ├── src/
│   │   ├── index.ts
│   │   ├── mqtt.client.ts
│   │   ├── handlers/
│   │   └── ...
│   ├── package.json
│   ├── docker-compose.yml
│   └── Dockerfile
└── ...
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
app.use(requestIdMiddleware);       // 5. Request-ID correlation (X-Request-ID)
app.use(httpMetricsMiddleware);     // 6. Prometheus metrics
app.use(express.json());            // 7. Body parser
app.use(requestLogger);             // 8. Request logging
app.use(rateLimitMiddleware);       // 9. Rate limiting

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/device', deviceRoutes);
app.use('/api/v1/iot', iotRoutes);  // No auth for IoT endpoints
// ... vehicle, customer, driver, trip, geofence, maintenance, etc.

// Error handling (last)
app.use(errorHandler);
app.use(sentryErrorHandler);
```

---

### X.11 Deployment

**Docker Compose (per-service pattern — IVM26):**

> **📌 Cập nhật:** Mỗi service có `docker-compose.yml` riêng, không dùng monolithic compose. Tất cả share `tracking-network` (external).

```yaml
# Tracking_Backend/docker-compose.yml
version: "3.8"
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: tracking-backend
    ports:
      - "3000:3000"
    env_file: .env
    restart: unless-stopped
    networks:
      - tracking-network
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'

networks:
  tracking-network:
    external: true
```

```yaml
# Tracking_MqttBridge/docker-compose.yml (standalone service)
version: "3.8"
services:
  mqtt-bridge:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: tracking-mqtt-bridge
    env_file: .env
    restart: unless-stopped
    networks:
      - tracking-network
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'

networks:
  tracking-network:
    external: true
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
