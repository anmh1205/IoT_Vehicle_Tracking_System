# Backend Architecture

> Kiến trúc backend theo mô hình Domain-Driven Design với Express + TypeScript

---

## 1. Tổng Quan Kiến Trúc

```
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    API LAYER                         │    │
│  │  Controllers → Routes → Validators → OpenAPI        │    │
│  └─────────────────────────┬───────────────────────────┘    │
│                            │                                 │
│  ┌─────────────────────────▼───────────────────────────┐    │
│  │                  DOMAIN LAYER                        │    │
│  │  Services → Repositories → Types → Helpers          │    │
│  └─────────────────────────┬───────────────────────────┘    │
│                            │                                 │
│  ┌─────────────────────────▼───────────────────────────┐    │
│  │               INFRASTRUCTURE LAYER                   │    │
│  │  Database → VictoriaMetrics → Logger → HTTP Client  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Cấu Trúc Thư Mục

```
backend/src/
├── index.ts                        # Entry point
│
├── api/                            # API Layer
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── device.controller.ts
│   │   ├── dashboard.controller.ts
│   │   ├── firmware.controller.ts
│   │   ├── iot.controller.ts
│   │   ├── export.controller.ts
│   │   └── system-admin.controller.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── device.routes.ts
│   │   ├── iot.routes.ts
│   │   ├── dashboard.routes.ts
│   │   ├── firmware.routes.ts
│   │   ├── export.routes.ts
│   │   ├── system-admin.routes.ts
│   │   └── index.ts
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── device.validator.ts
│   │   ├── iot.validator.ts
│   │   └── firmware.validator.ts
│   └── openapi/
│       └── routes.ts
│
├── domain/                         # Business Logic Layer
│   ├── auth/
│   │   ├── services/
│   │   │   ├── auth-session.service.ts
│   │   │   ├── auth-password.service.ts
│   │   │   ├── user-management.service.ts
│   │   │   └── user-device-access.service.ts
│   │   ├── repositories/
│   │   │   ├── user.repository.ts
│   │   │   ├── user-session.repository.ts
│   │   │   └── user-device-access.repository.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── helpers/
│   │       └── auth.helpers.ts
│   │
│   ├── device/
│   │   ├── services/
│   │   │   ├── device-list.service.ts
│   │   │   ├── device-details.service.ts
│   │   │   ├── device-crud.service.ts
│   │   │   ├── device-sessions.service.ts
│   │   │   ├── device-runtime.service.ts
│   │   │   └── device-ingestion.service.ts
│   │   ├── repositories/
│   │   │   ├── device.repository.ts
│   │   │   └── device-session.repository.ts
│   │   ├── types/
│   │   │   ├── device.types.ts
│   │   │   └── device-session.types.ts
│   │   └── subscribers/
│   │       └── device-heartbeat.subscriber.ts
│   │
│   ├── iot/
│   │   ├── services/
│   │   │   ├── iot-data-processing.service.ts
│   │   │   ├── iot-device-status.service.ts
│   │   │   ├── session-tracking.service.ts
│   │   │   ├── heartbeat-tracking.service.ts
│   │   │   └── unified-device-data.service.ts
│   │   ├── repositories/
│   │   │   └── iot.repository.ts
│   │   └── types/
│   │       └── iot.types.ts
│   │
│   ├── dashboard/
│   │   ├── services/
│   │   │   ├── dashboard-stats.service.ts
│   │   │   ├── activity-log.service.ts
│   │   │   └── alerts.service.ts
│   │   ├── repositories/
│   │   │   └── dashboard.repository.ts
│   │   └── types/
│   │       └── dashboard.types.ts
│   │
│   ├── firmware/
│   │   ├── services/
│   │   │   ├── firmware-list.service.ts
│   │   │   ├── firmware-upload.service.ts
│   │   │   ├── firmware-activate.service.ts
│   │   │   ├── firmware-assignment.service.ts
│   │   │   └── firmware-delete.service.ts
│   │   ├── repositories/
│   │   │   └── firmware.repository.ts
│   │   └── types/
│   │       └── firmware.types.ts
│   │
│   ├── export/
│   │   ├── services/
│   │   │   ├── export-job.service.ts
│   │   │   ├── export-processing.service.ts
│   │   │   └── export-file.service.ts
│   │   └── repositories/
│   │       └── export.repository.ts
│   │
│   ├── notification/
│   │   └── services/
│   │       └── hybrid-notification.service.ts
│   │
│   ├── error-code/
│   │   ├── services/
│   │   │   ├── error-code-definition.service.ts
│   │   │   └── device-error.service.ts
│   │   └── repositories/
│   │       ├── error-code-definition.repository.ts
│   │       └── device-error.repository.ts
│   │
│   ├── audit/
│   │   ├── services/
│   │   │   └── audit.service.ts
│   │   └── repositories/
│   │       └── audit.repository.ts
│   │
│   └── system-admin/
│       ├── services/
│       │   └── system-admin.service.ts
│       └── repositories/
│           ├── victoriametrics.repository.ts
│           └── victorialogs.repository.ts
│
├── infrastructure/                 # External Services
│   ├── database/
│   │   ├── pool.ts                 # PostgreSQL connection pool
│   │   └── queries.ts              # Query helpers
│   ├── victoriametrics/
│   │   ├── client.ts               # Write client
│   │   └── query.ts                # PromQL queries
│   ├── victorialogs/
│   │   └── client.ts               # Write client
│   ├── logger/
│   │   └── winston.ts              # Winston configuration
│   └── http/
│       └── client.ts               # HTTP client
│
├── middleware/                     # Express Middleware
│   ├── auth.ts                     # JWT authentication
│   ├── cors.ts                     # CORS configuration
│   ├── security.ts                 # Helmet security
│   ├── compression.ts              # Response compression
│   ├── rate-limit.middleware.ts    # Rate limiting
│   ├── metrics.ts                  # Prometheus metrics
│   ├── cache.ts                    # Static asset caching
│   └── error-handler.middleware.ts # Global error handler
│
├── realtime/                       # WebSocket Server
│   ├── socket-server.util.ts       # Socket.IO setup
│   ├── socket-auth.middleware.ts   # WS authentication
│   ├── event-bus.util.ts           # Internal pub/sub
│   └── types.ts                    # Socket types
│
├── mqtt-bridge/                    # MQTT Integration (Standalone)
│   ├── index.ts                    # Entry point
│   ├── mqtt.client.ts              # MQTT client
│   ├── handlers/
│   │   └── rawdata.handler.ts      # Message handler
│   ├── batch/
│   │   └── database-batch.service.ts
│   ├── cache/
│   │   ├── device-state.cache.ts
│   │   └── session-stats.cache.ts
│   ├── validators/
│   │   └── payload.validator.ts
│   └── types/
│       └── payload.types.ts
│
├── config/                         # Configuration
│   ├── env.ts                      # Environment variables
│   └── sentry.ts                   # Sentry configuration
│
├── shared/                         # Shared Utilities
│   ├── constants/
│   │   ├── device.constants.ts
│   │   └── session.constants.ts
│   ├── utils/
│   │   ├── date.utils.ts
│   │   └── crypto.utils.ts
│   └── types/
│       └── common.types.ts
│
└── types/                          # Global TypeScript types
    └── express.d.ts                # Express augmentation
```

---

## 3. Domain Modules Chi Tiết

### 3.1 Auth Domain

| Service | Chức năng |
|---------|-----------|
| `auth-session.service` | Login, logout, validate token |
| `auth-password.service` | Change password, reset password |
| `user-management.service` | CRUD users (admin) |
| `user-device-access.service` | Device access control per user |

### 3.2 Device Domain

| Service | Chức năng |
|---------|-----------|
| `device-list.service` | List devices with filtering |
| `device-details.service` | Device detail with stats |
| `device-crud.service` | Create, update, delete devices |
| `device-sessions.service` | Session history |
| `device-runtime.service` | Runtime analytics |
| `device-ingestion.service` | Process incoming data |

### 3.3 IoT Domain

| Service | Chức năng |
|---------|-----------|
| `iot-data-processing.service` | Process sensor data |
| `iot-device-status.service` | Device online/offline status |
| `session-tracking.service` | Session start/end tracking |
| `heartbeat-tracking.service` | Heartbeat monitoring |
| `unified-device-data.service` | Unified data retrieval |

### 3.4 Dashboard Domain

| Service | Chức năng |
|---------|-----------|
| `dashboard-stats.service` | Statistics aggregation |
| `activity-log.service` | Activity feed |
| `alerts.service` | Alert management |

### 3.5 Firmware Domain

| Service | Chức năng |
|---------|-----------|
| `firmware-list.service` | List firmware versions |
| `firmware-upload.service` | Upload firmware files |
| `firmware-activate.service` | Activate/deactivate version |
| `firmware-assignment.service` | Assign to devices |
| `firmware-delete.service` | Safe deletion |

---

## 4. Middleware Chain

```typescript
// index.ts - Middleware order
app.use(sentryRequestHandler);      // 1. Sentry (first)
app.use(helmetMiddleware);          // 2. Security headers
app.use(compressionMiddleware);     // 3. Gzip/Brotli
app.use(corsMiddleware);            // 4. CORS
app.use(httpMetricsMiddleware);     // 5. Prometheus metrics
app.use(express.json());            // 6. Body parser
app.use(express.urlencoded());      // 7. URL encoded
app.use(requestLogger);             // 8. Request logging
app.use(rateLimitMiddleware);       // 9. Rate limiting

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/device', deviceRoutes);
app.use('/api/v1/iot', iotRoutes);      // No auth
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/firmware', firmwareRoutes);
app.use('/api/v1/exports', exportRoutes);
app.use('/api/v1/system-admin', systemAdminRoutes);

// Error handling (last)
app.use(errorHandler);
app.use(sentryErrorHandler);
```

---

## 5. Socket.IO Namespaces

| Namespace | Auth | Description |
|-----------|------|-------------|
| `/dashboard` | Required | Dashboard updates |
| `/devices` | Required | Device status changes |
| `/firmware` | Required | Firmware assignments |
| `/exports` | Required | Export job progress |
| `/notifications` | Required | Push notifications |
| `/mobile` | Required | Mobile app events |
| `/iot` | **Public** | IoT device data |

---

## 6. MQTT Bridge

```
MQTT Topic: v1/{device_id}/rawdata

Flow:
┌─────────────┐     ┌─────────┐     ┌─────────────┐
│ ESP32/STM32 │────▶│  EMQX   │────▶│ MQTT Bridge │
└─────────────┘     └─────────┘     └──────┬──────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
            ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
            │  PostgreSQL   │     │VictoriaMetrics│     │ VictoriaLogs  │
            │ (status, sess)│     │ (time-series) │     │   (events)    │
            └───────────────┘     └───────────────┘     └───────────────┘
                    │
                    ▼
            ┌───────────────┐
            │  Socket.IO    │───▶ Dashboard real-time
            └───────────────┘
```

---

## 7. Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# PostgreSQL
POSTGRESQL_HOST=localhost
POSTGRESQL_PORT=5432
POSTGRESQL_DATABASE=vehicle_tracking
POSTGRESQL_USER=postgres
POSTGRESQL_PASSWORD=secret

# VictoriaMetrics
VICTORIAMETRICS_URL=http://localhost:8428
VICTORIALOGS_URL=http://localhost:9428

# MQTT (EMQX)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=backend
MQTT_PASSWORD=secret

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Sentry (optional)
SENTRY_DSN=https://xxx@sentry.io/xxx

# CORS
CORS_ORIGIN=http://localhost:3002
```

---

## 8. Dependencies

```json
{
  "dependencies": {
    "express": "^4.19.2",
    "socket.io": "^4.8.1",
    "mqtt": "^5.14.1",
    "pg": "^8.16.3",
    "zod": "^3.23.8",
    "bcryptjs": "^2.4.3",
    "helmet": "^8.1.0",
    "compression": "^1.8.1",
    "express-rate-limit": "^8.2.1",
    "prom-client": "^15.1.3",
    "@sentry/node": "^10.34.0",
    "dotenv": "^16.4.5",
    "uuid": "^13.0.0",
    "exceljs": "^4.4.0",
    "multer": "^1.4.5-lts.1",
    "swagger-ui-express": "^5.0.1"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "tsx": "^4.11.0",
    "vitest": "^1.6.0",
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.9",
    "@types/pg": "^8.16.0",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.13.1"
  }
}
```

---

## 9. Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint \"src/**/*.ts\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "verify": "npm run lint && npm run typecheck && npm run test",
    "mqtt-bridge": "tsx src/mqtt-bridge/index.ts"
  }
}
```
