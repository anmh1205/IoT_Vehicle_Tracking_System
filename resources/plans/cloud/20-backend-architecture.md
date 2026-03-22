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
│  │  Database → VictoriaMetrics → VictoriaLogs → Logger │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Cấu Trúc Thư Mục (IVM26 Pattern)

```
Tracking_Backend/src/
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
│   │   ├── firmware.validator.ts
│   │   ├── driver.validator.ts
│   │   └── validation-error.validator.ts
│   └── openapi/
│       └── spec.ts                       # OpenAPI 3.0.3 spec object
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
│   ├── driver/                            # Driver Management
│   │   ├── services/
│   │   │   ├── driver-crud.service.ts     # CRUD operations
│   │   │   └── driver-list.service.ts     # Paginated listing
│   │   ├── repositories/
│   │   │   └── driver.repository.ts
│   │   └── types/
│   │       └── driver.types.ts
│   ├── fuel-analytics/                    # Fuel consumption analytics
│   │   ├── services/
│   │   │   └── fuel-analytics.service.ts
│   │   ├── repositories/
│   │   │   └── fuel-analytics.repository.ts
│   │   └── types/
│   │       └── fuel-analytics.types.ts
│   ├── validation-error/                  # IoT payload validation errors
│   │   ├── services/
│   │   │   └── validation-error.service.ts
│   │   ├── repositories/
│   │   │   └── validation-error.repository.ts
│   │   └── types/
│   │       └── validation-error.types.ts
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
│   │   # ═══════════════════════════════════════════════════════════
│   │   # VEHICLE TRACKING DOMAINS (Extension)
│   │   # ═══════════════════════════════════════════════════════════
│   │
│   ├── vehicle/                        # Vehicle Management
│   │   ├── services/
│   │   │   ├── vehicle-list.service.ts
│   │   │   ├── vehicle-crud.service.ts
│   │   │   └── vehicle-assignment.service.ts
│   │   ├── repositories/
│   │   │   └── vehicle.repository.ts
│   │   └── types/
│   │       └── vehicle.types.ts
│   │
│   ├── customer/                       # Customer Management
│   │   ├── services/
│   │   │   ├── customer-list.service.ts
│   │   │   └── customer-crud.service.ts
│   │   ├── repositories/
│   │   │   └── customer.repository.ts
│   │   └── types/
│   │       └── customer.types.ts
│   │
│   ├── trip/                           # Trip Tracking
│   │   ├── services/
│   │   │   ├── trip-list.service.ts
│   │   │   ├── trip-crud.service.ts
│   │   │   ├── trip-tracking.service.ts
│   │   │   └── trip-history.service.ts
│   │   ├── repositories/
│   │   │   └── trip.repository.ts
│   │   └── types/
│   │       └── trip.types.ts
│   │
│   ├── alert/                          # Alert Management
│   │   ├── services/
│   │   │   ├── alert-list.service.ts
│   │   │   ├── alert-crud.service.ts
│   │   │   ├── alert-trigger.service.ts
│   │   │   └── alert-notification.service.ts
│   │   ├── repositories/
│   │   │   └── alert.repository.ts
│   │   └── types/
│   │       └── alert.types.ts
│   │
│   ├── geofence/                       # Geofence Management
│   │   ├── services/
│   │   │   ├── geofence-list.service.ts
│   │   │   ├── geofence-crud.service.ts
│   │   │   ├── geofence-check.service.ts
│   │   │   └── geofence-assignment.service.ts
│   │   ├── repositories/
│   │   │   └── geofence.repository.ts
│   │   └── types/
│   │       └── geofence.types.ts
│   │
│   ├── maintenance/                    # Maintenance Scheduling
│   │   ├── services/
│   │   │   ├── maintenance-list.service.ts
│   │   │   ├── maintenance-crud.service.ts
│   │   │   └── maintenance-reminder.service.ts
│   │   ├── repositories/
│   │   │   └── maintenance.repository.ts
│   │   └── types/
│   │       └── maintenance.types.ts
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
│   ├── auth.ts                     # Session-based authentication
│   ├── cors.ts                     # CORS configuration
│   ├── security.ts                 # Helmet security
│   ├── compression.ts              # Response compression
│   ├── rate-limit.middleware.ts    # Rate limiting
│   ├── metrics.ts                  # Prometheus metrics
│   ├── request-id.middleware.ts   # Request correlation ID
│   ├── cache.ts                    # Static asset caching
│   └── error-handler.middleware.ts # Global error handler
│
├── realtime/                       # WebSocket Server
│   ├── socket-server.util.ts       # Socket.IO setup
│   ├── socket-auth.middleware.ts   # WS authentication
│   ├── event-bus.util.ts           # Internal pub/sub (backend-only events)
│   ├── mqtt-event-listener.ts      # Subscribe EMQX internal topics → Socket.IO
│   └── types.ts                    # Socket types
│
│   # NOTE: MQTT Bridge is a STANDALONE service at Tracking_MqttBridge/
│   # See 22-backend-mqtt-bridge.md for its architecture
│   # It communicates with Backend via EMQX internal topics
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

| Service                      | Chức năng                       |
| ---------------------------- | ------------------------------- |
| `auth-session.service`       | Login, logout, validate token   |
| `auth-password.service`      | Change password, reset password |
| `user-management.service`    | CRUD users (admin)              |
| `user-device-access.service` | Device access control per user  |

### 3.2 Device Domain

| Service                    | Chức năng                      |
| -------------------------- | ------------------------------ |
| `device-list.service`      | List devices with filtering    |
| `device-details.service`   | Device detail with stats       |
| `device-crud.service`      | Create, update, delete devices |
| `device-sessions.service`  | Session history                |
| `device-runtime.service`   | Runtime analytics              |
| `device-ingestion.service` | Process incoming data          |

### 3.3 IoT Domain

| Service                       | Chức năng                    |
| ----------------------------- | ---------------------------- |
| `iot-data-processing.service` | Process sensor data          |
| `iot-device-status.service`   | Device online/offline status |
| `session-tracking.service`    | Session start/end tracking   |
| `heartbeat-tracking.service`  | Heartbeat monitoring         |
| `unified-device-data.service` | Unified data retrieval       |

### 3.4 Dashboard Domain

| Service                   | Chức năng              |
| ------------------------- | ---------------------- |
| `dashboard-stats.service` | Statistics aggregation |
| `activity-log.service`    | Activity feed          |
| `alerts.service`          | Alert management       |

### 3.5 Firmware Domain

| Service                       | Chức năng                   |
| ----------------------------- | --------------------------- |
| `firmware-list.service`       | List firmware versions      |
| `firmware-upload.service`     | Upload firmware files       |
| `firmware-activate.service`   | Activate/deactivate version |
| `firmware-assignment.service` | Assign to devices           |
| `firmware-delete.service`     | Safe deletion               |

---

## 4. Middleware Chain (IVM26 Pattern)

> ⚠️ **Pattern từ IVM26:** Thứ tự middleware quan trọng cho security và performance

```typescript
// index.ts - Middleware order (IVM26 Pattern)

// =============================================================================
// 1. SENTRY (Must be first - captures all errors)
// =============================================================================
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './config/sentry';
initSentry();
app.use(sentryRequestHandler);

// =============================================================================
// 2. SECURITY HEADERS (Helmet)
// =============================================================================
app.use(helmetMiddleware);

// =============================================================================
// 3. COMPRESSION (gzip/brotli)
// =============================================================================
app.use(compressionMiddleware);

// =============================================================================
// 4. CORS
// =============================================================================
app.use(corsMiddleware);

// =============================================================================
// 5. PROMETHEUS METRICS
// =============================================================================
app.use(httpMetricsMiddleware);

// =============================================================================
// 6. KEEP-ALIVE HEADERS (For IoT devices - persistent connections)
// =============================================================================
app.use((_req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=65, max=1000');
  res.setHeader('Cache-Control', 'no-cache');
  next();
});

// =============================================================================
// 7. BODY PARSING
// =============================================================================
app.use(express.json({ limit: '100kb' }));  // Default limit (route-specific overrides for firmware upload)
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// =============================================================================
// 8. REQUEST TIMEOUT (30 seconds)
// =============================================================================
app.use((req, res, next) => {
  const timeout = 30000;
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ error: { code: 'REQUEST_TIMEOUT' } });
    }
  }, timeout);

  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));
  next();
});

// =============================================================================
// 9. REQUEST LOGGING
// =============================================================================
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// =============================================================================
// 10. REQUEST ID (Correlation ID for distributed tracing)
// =============================================================================
app.use(requestIdMiddleware); // generates UUID, attaches to req.correlationId

// =============================================================================
// HEALTH CHECK (before auth middleware, before routes)
// =============================================================================
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/ready', async (_req, res) => {
  const dbOk = await checkPostgres();
  const mqttOk = checkMqttConnection();
  res.status(dbOk && mqttOk ? 200 : 503).json({ database: dbOk, mqtt: mqttOk });
});

// =============================================================================
// ROUTES (with selective rate limiting)
// =============================================================================
app.use('/api/v1/auth', authRateLimit, authRoutes);        // Strict rate limit
app.use('/api/v1/devices', deviceRoutes);                  // Normal rate limit
app.use('/api/v1/iot', iotRoutes);                         // No rate limit (high frequency)
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/firmware', firmwareRoutes);
app.use('/api/v1/exports', exportRoutes);
app.use('/api/v1/system-admin', systemAdminRoutes);

// Vehicle Tracking Extension Routes
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/trips', tripRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/geofences', geofenceRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);

// =============================================================================
// ERROR HANDLING (Must be last)
// =============================================================================
app.use(sentryErrorHandler);  // Sentry MUST be first error handler
app.use(errorHandler);        // Custom error handler SECOND
```

---

## 4.1 Error Handling Pattern (IVM26)

```typescript
// shared/utils/errors.util.ts
export type ApiError = Error & {
  status: number;
  details?: Record<string, unknown>;
};

export const createApiError = (
  status: number,
  message: string,
  details?: Record<string, unknown>
): ApiError => {
  const error = new Error(message) as ApiError;
  error.name = 'ApiError';
  error.status = status;
  error.details = details;
  return error;
};

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof Error &&
  (error as ApiError).name === 'ApiError' &&
  typeof (error as ApiError).status === 'number';

// Factory functions for common errors
export const createValidationError = (message: string, details?: unknown) =>
  createApiError(400, message, { code: 'VALIDATION_ERROR', details });

export const createUnauthorizedError = (message: string) =>
  createApiError(401, message, { code: 'UNAUTHORIZED' });

export const createForbiddenError = (message: string) =>
  createApiError(403, message, { code: 'FORBIDDEN' });

export const createNotFoundError = (message: string) =>
  createApiError(404, message, { code: 'NOT_FOUND' });

export const createConflictError = (message: string) =>
  createApiError(409, message, { code: 'CONFLICT' });
```

```typescript
// middleware/error-handler.middleware.ts
app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  // Handle known API errors
  if (isApiError(error)) {
    logger.warn(`API error (${error.status}): ${error.message}`);
    return sendError(res, error, req.originalUrl);
  }

  // Handle unexpected errors
  logger.error('Unhandled error:', error);
  const internalErr = createApiError(500, 'Internal server error', {
    code: 'INTERNAL_SERVER_ERROR',
    path: req.originalUrl
  });
  return sendError(res, internalErr, req.originalUrl);
});
```

---

## 4.2 Response Utilities (IVM26)

```typescript
// shared/utils/response.util.ts
export const sendOk = (res: Response, data: unknown) => {
  res.status(200).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
};

export const sendCreated = (res: Response, data: unknown) => {
  res.status(201).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
};

export const sendError = (res: Response, error: ApiError, path: string) => {
  res.status(error.status).json({
    success: false,
    error: {
      code: error.details?.code || 'ERROR',
      message: error.message,
      status: error.status,
      path,
      details: error.details
    },
    timestamp: new Date().toISOString()
  });
};
```

---

## 4.3 Async Handler Wrapper (IVM26)

```typescript
// shared/utils/async-handler.util.ts
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage in routes:
router.get('/users', asyncHandler(async (req, res) => {
  const users = await userService.getUsers();
  sendOk(res, { users });
}));
```

---

## 4.4 Graceful Shutdown (IVM26)

```typescript
// index.ts - Production-ready shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  // 1. Flush Sentry events
  await flushSentry(2000);

  // 2. Stop accepting new connections
  server.close(() => logger.info('HTTP server closed'));

  // 3. Close WebSocket server
  await closeSocketServer();

  // 4. Shutdown MQTT bridge
  await shutdownMqttBridge();

  // 5. Close database connections
  await closePool();

  logger.info('Graceful shutdown complete');
  process.exit(0);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection:', reason);
  captureException(reason);
});
```

---

## 5. Socket.IO Namespaces

| Namespace        | Auth             | Description                  |
| ---------------- | ---------------- | ---------------------------- |
| `/dashboard`     | Required         | Dashboard updates            |
| `/devices`       | Required         | Device status changes        |
| `/firmware`      | Required         | Firmware assignments         |
| `/exports`       | Required         | Export job progress          |
| `/notifications` | Required         | Push notifications           |
| `/mobile`        | Required         | Mobile app events            |
| `/iot`           | **Device Token** | IoT device data (restricted) |

---

## 6. MQTT Bridge ↔ Backend Communication

> ⚠️ **Kiến trúc:** MQTT Bridge publish events qua **EMQX internal topics** (không dùng EventBus in-process).
> Backend subscribe các topics này và đẩy tới Frontend qua Socket.IO.

```
MQTT Topic: v1/{device_id}/rawdata

Flow:
┌─────────────┐     ┌─────────┐     ┌─────────────┐
│ ESP32/STM32 │────▶│  EMQX   │────▶│ MQTT Bridge │
└─────────────┘     └─────────┘     └──────┬──────┘
                         ▲                 │
                         │          ┌──────┼──────────────────────┐
                         │          │      │                      │
                         │          ▼      ▼                      ▼
                         │  ┌────────────┐ ┌───────────────┐ ┌───────────────┐
                         │  │ PostgreSQL │ │VictoriaMetrics│ │ VictoriaLogs  │
                         │  │(status,ses)│ │ (time-series) │ │   (events)    │
                         │  └────────────┘ └───────────────┘ └───────────────┘
                         │
            internal/events/device/*
            (publish via EMQX)
                         │
                  ┌──────┴──────┐
                  │   Backend   │
                  │ (subscriber)│
                  └──────┬──────┘
                         │
                         ▼
                  ┌───────────────┐
                  │  Socket.IO    │───▶ Dashboard real-time
                  └───────────────┘
```

### 6.1 Event Bus Pattern (Node.js EventEmitter)

> **Pattern:** Services gọi `publishEvent()` → Event Bus (EventEmitter) → Socket.IO broadcast.
> KHÔNG dùng MQTT internal topics. Realtime nằm trong `infrastructure/realtime/`.

```typescript
// infrastructure/realtime/event-bus.util.ts
import { EventEmitter } from 'events';

// Typed event map — 12 events
interface RealtimeEventMap {
  'device.status.changed': { device_id: string; status: string; last_seen_at: string };
  'device.position.updated': { device_id: string; lat: number; lon: number; speed: number };
  'device.session.started': { device_id: string; session_id: number };
  'device.session.ended': { device_id: string; session_id: number };
  'command.acknowledged': { device_id: string; command_id: string; status: string };
  'dashboard.stats.updated': { onlineDevices: number; totalAlerts: number };
  'dashboard.alert.created': { id: number; alert_type: string; severity: string; title: string };
  'dashboard.activity.created': { id: number; type: string; message: string; timestamp: string };
  'geofence.entered': { device_id: string; geofence_id: number };
  'geofence.exited': { device_id: string; geofence_id: number };
  'export.completed': { export_id: number; download_url: string };
  'firmware.assignment.updated': { firmware_id: number; device_ids: number[]; status: string };
}

const bus = new EventEmitter();
export const publishEvent = <K extends keyof RealtimeEventMap>(event: K, payload: RealtimeEventMap[K]) => {
  bus.emit(event, payload);
};
export const subscribeEvent = <K extends keyof RealtimeEventMap>(event: K, handler: (payload: RealtimeEventMap[K]) => void) => {
  bus.on(event, handler);
};
```

```typescript
// infrastructure/realtime/socket-server.util.ts
// Event bridges: internal event → Socket.IO namespace + event name
const registerEventBridges = (server: TypedIOServer): void => {
  subscribeEvent('device.status.changed', (payload) => {
    server.of('/devices').emit('device:status', payload);
  });
  subscribeEvent('dashboard.alert.created', (payload) => {
    server.of('/dashboard').emit('alert:new', payload);
    server.of('/notifications').emit('alert:new', payload); // dual-emit
  });
  // ... 13 bridges total (see 24-websocket-events.md Section 8.3)
};
```

```typescript
// Gọi từ domain services:
import { publishEvent } from '@/infrastructure/realtime';

// iot-ingestion.service.ts
publishEvent('device.status.changed', { device_id, status, last_seen_at });
publishEvent('device.position.updated', { device_id, lat, lon, speed, heading });

// alert-crud.service.ts
publishEvent('dashboard.alert.created', { id, vehicle_id: Number(alert.vehicle_id), ... });

// firmware-deploy.service.ts
publishEvent('firmware.assignment.updated', { firmware_id, device_ids, status });
```

---

## 7. Environment Variables (IVM26 Pattern)

> ⚠️ **Pattern từ IVM26:** Type-safe, validated, centralized config với fallback values

```typescript
// config/env.ts - Centralized Environment Configuration
import 'dotenv/config';

type EnvRecord = Record<string, string | undefined>;
const rawEnv: EnvRecord = process.env;

const fromEnv = (key: string): string | undefined => rawEnv[key];

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Validates required env vars (throws in production, warns in dev)
const requireEnv = (key: string, value: string | undefined): string => {
  if (!value) {
    const isProd = fromEnv('NODE_ENV') === 'production';
    if (isProd) {
      throw new Error(`❌ CRITICAL: Environment variable "${key}" is not set!`);
    } else {
      console.warn(`⚠️  WARNING: Environment variable "${key}" is not set.`);
    }
  }
  return value ?? '';
};

// =============================================================================
// APPLICATION CONFIG
// =============================================================================
export const appConfig = {
  nodeEnv: fromEnv('NODE_ENV') ?? 'development',
  port: toInt(fromEnv('PORT'), 3000),
};

// =============================================================================
// DATABASE CONFIG
// =============================================================================
export const dbConfig = {
  host: fromEnv('POSTGRESQL_HOST') ?? 'localhost',
  port: toInt(fromEnv('POSTGRESQL_PORT'), 5432),
  user: fromEnv('POSTGRESQL_USER') ?? 'postgres',
  password: requireEnv('POSTGRESQL_PASSWORD', fromEnv('POSTGRESQL_PASSWORD')),
  database: fromEnv('POSTGRESQL_DATABASE') ?? 'vehicle_tracking',
  connectionLimit: toInt(fromEnv('DB_POOL_SIZE'), 50),
};

// =============================================================================
// MQTT CONFIG (MQTTS Support)
// =============================================================================
export const mqttConfig = {
  host: fromEnv('MQTT_HOST') ?? 'emqx',
  port: toInt(fromEnv('MQTT_PORT'), 1883),
  tlsPort: toInt(fromEnv('MQTT_TLS_PORT'), 8883),
  useTls: fromEnv('MQTT_USE_TLS') === 'true',
  username: fromEnv('MQTT_USERNAME') ?? 'mqtt_bridge',
  password: requireEnv('MQTT_PASSWORD', fromEnv('MQTT_PASSWORD')),
  rejectUnauthorized: fromEnv('MQTT_REJECT_UNAUTHORIZED') !== 'false',
};

// =============================================================================
// VICTORIAMETRICS CONFIG
// =============================================================================
export const victoriaMetricsConfig = {
  url: fromEnv('VICTORIAMETRICS_URL') ?? 'http://localhost:8428',
  remoteWritePath: '/api/v1/import/prometheus',
  queryPath: '/api/v1/query',
};

export const victoriaLogsConfig = {
  url: fromEnv('VICTORIALOGS_URL') ?? 'http://localhost:9428',
};

// =============================================================================
// SESSION CONFIG (Database-backed tokens, NOT JWT)
// =============================================================================
export const sessionConfig = {
  secret: requireEnv('SESSION_SECRET', fromEnv('SESSION_SECRET')),
  maxLifetimeHours: toInt(fromEnv('SESSION_MAX_LIFETIME_HOURS'), 24),
  slidingWindowHours: toInt(fromEnv('SESSION_EXTENSION_HOURS'), 4),
};

// =============================================================================
// CORS CONFIG
// =============================================================================
export const corsConfig = {
  origin: fromEnv('CORS_ORIGIN') ?? 'http://localhost:3002',
};

// =============================================================================
// SENTRY CONFIG (Optional)
// =============================================================================
export const sentryConfig = {
  dsn: fromEnv('SENTRY_DSN') ?? '',
  enabled: !!fromEnv('SENTRY_DSN'),
};
```

### .env.example

```bash
# =============================================================================
# SERVER
# =============================================================================
PORT=3000
NODE_ENV=development

# =============================================================================
# POSTGRESQL
# =============================================================================
POSTGRESQL_HOST=localhost
POSTGRESQL_PORT=5432
POSTGRESQL_DATABASE=vehicle_tracking
POSTGRESQL_USER=postgres
POSTGRESQL_PASSWORD=           # REQUIRED - no default
DB_POOL_SIZE=50

# =============================================================================
# VICTORIAMETRICS & VICTORIALOGS
# =============================================================================
VICTORIAMETRICS_URL=http://localhost:8428
VICTORIALOGS_URL=http://localhost:9428

# =============================================================================
# MQTT (EMQX) - Supports MQTT and MQTTS
# =============================================================================
MQTT_HOST=emqx
MQTT_PORT=1883
MQTT_TLS_PORT=8883
MQTT_USE_TLS=false
MQTT_REJECT_UNAUTHORIZED=false
MQTT_USERNAME=mqtt_bridge
MQTT_PASSWORD=                 # REQUIRED - no default

# =============================================================================
# SESSION AUTH (Database-backed tokens, NOT JWT)
# =============================================================================
SESSION_SECRET=                # REQUIRED - min 32 chars, no default
SESSION_MAX_LIFETIME_HOURS=24
SESSION_EXTENSION_HOURS=4

# =============================================================================
# SENTRY (Optional)
# =============================================================================
SENTRY_DSN=

# =============================================================================
# CORS
# =============================================================================
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
    "verify": "npm run lint && npm run typecheck && npm run test"
  }
}
```
