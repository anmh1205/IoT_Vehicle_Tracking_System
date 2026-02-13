# 70 — Implemented Features Registry (Session: 2026-02-11)

> **Mục đích:** Ghi lại TẤT CẢ features đã implement, files đã tạo/sửa, và hướng dẫn để reproduce từ đầu.
> **Cập nhật lần cuối:** 2026-02-11

---

## Tổng Quan

8 features đã được implement song song bởi multi-agent team trên branch `feature/coding`:

| # | Feature | Agent | Status | Files |
|---|---------|-------|--------|-------|
| 1 | WebSocket/Realtime Server | team-lead | ✅ Done | 6 new + 1 modified |
| 2 | Docker Compose (per-service) | docker-agent | ✅ Done | 8 new + 1 modified |
| 3 | Swagger API Docs | swagger-agent | ✅ Done | 1 new + 1 modified |
| 4 | publishEvent wiring | events-agent | ✅ Done | 3 modified |
| 5 | Validation Errors domain | validation-agent | ✅ Done | 6 new + 1 modified |
| 6 | Driver Management | driver-agent | ✅ Done | 10 new + 1 modified |
| 7 | Fuel Analytics | fuel-agent | ✅ Done | 12 new + 1 modified |
| 8 | ExcelJS Export | export-agent | ✅ Done | 2 new + 2 modified |

**Verification Results:**
- Backend `tsc --noEmit` → 0 errors ✅
- Frontend `tsc --noEmit` → 0 errors ✅
- Vitest unit tests → 35/35 passed ✅
- Backend dev server startup → OK (DB + VictoriaMetrics connected) ✅
- Docker build Backend → OK ✅
- Docker build Frontend → OK ✅

---

## Feature 1: WebSocket/Realtime Server (Socket.IO)

### Mô tả
Event Bus pattern với Node.js EventEmitter cho decoupled pub/sub giữa backend services và Socket.IO. 5 namespaces, session-based auth, device room handlers.

### Files tạo mới

```
Tracking_Backend/src/infrastructure/realtime/
├── types.ts                    # TypedSocket, TypedIOServer, NamespaceKey, RealtimeSocketData
├── event-bus.util.ts           # RealtimeEventMap (12 events), publishEvent, subscribeEvent, onceEvent
├── health.ts                   # Connection tracking, Prometheus gauge integration
├── socket-auth.middleware.ts   # Token extraction (auth → query → Bearer header), SHA-256 validation
├── socket-server.util.ts       # registerRealtime(), 5 namespaces, device room handlers, 13 event bridges
└── index.ts                    # Barrel exports
```

### Files modified

```
Tracking_Backend/src/index.ts
  + import { registerRealtime, closeSocketServer, getRealtimeHealthSnapshot }
  + import swaggerUi, { spec }
  + app.get('/ws-health', ...) endpoint
  + app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec))
  + registerRealtime(server) after server.listen()
  + closeSocketServer() in graceful shutdown
```

### Architecture

```
5 Namespaces: /dashboard, /devices, /notifications, /exports, /firmware
All require session-based auth (socketAuthMiddleware)

Event Bus (12 internal events):
  device.status.changed      → /devices emit device:status
  device.position.updated    → /devices emit device:position
  device.session.started     → /devices emit device:session_start
  device.session.ended       → /devices emit device:session_end
  command.acknowledged       → /devices room-scoped emit command:ack
  dashboard.stats.updated    → /dashboard emit stats:update
  dashboard.alert.created    → /dashboard + /notifications emit alert:new
  dashboard.activity.created → /dashboard emit activity:new
  geofence.entered           → /notifications emit geofence:enter
  geofence.exited            → /notifications emit geofence:exit
  export.completed           → /exports emit export:ready
  firmware.assignment.updated → /firmware emit firmware:assignment

Socket.IO Config:
  path: /ws
  transports: ['websocket', 'polling']
  pingTimeout: 60_000
  pingInterval: 25_000
  connectTimeout: 45_000
```

### Reproduce Steps

```bash
# 1. Tạo thư mục
mkdir -p Tracking_Backend/src/infrastructure/realtime

# 2. Tạo files theo thứ tự:
#    types.ts → event-bus.util.ts → health.ts → socket-auth.middleware.ts → socket-server.util.ts → index.ts

# 3. Modify src/index.ts:
#    - Add imports for realtime, swagger-ui-express, spec
#    - Add /ws-health endpoint, /api-docs mount
#    - Add registerRealtime(server), closeSocketServer() in shutdown

# 4. Dependencies (already in package.json):
#    socket.io@^4.8.1, swagger-ui-express@^5.0.1
```

---

## Feature 2: Docker Compose (Per-Service)

### Mô tả
Multi-stage Dockerfiles cho Backend và Frontend. Per-service docker-compose.yml (dev) và docker-compose.uat.yml (production). Non-root users.

### Files tạo mới

```
Tracking_Backend/
├── Dockerfile                  # Multi-stage: node:20-alpine, builder → runner, non-root (backend:1001)
├── docker-compose.yml          # Dev: port 3000, 512M memory, tracking-network external
├── docker-compose.uat.yml      # Production: log rotation, NODE_ENV=production
├── .dockerignore               # node_modules, dist, .env, *.test.ts
└── .gitignore                  # node_modules, dist, .env, coverage

Tracking_Frontend/
├── Dockerfile                  # Multi-stage: Next.js standalone output, non-root (nextjs:1001)
├── docker-compose.yml          # Dev: port 3002
├── docker-compose.uat.yml      # Production settings
└── .dockerignore               # node_modules, .next, .env
```

### Files modified

```
Tracking_Frontend/next.config.ts
  + output: 'standalone'        # Required for Docker multi-stage build
```

### Key Patterns

```dockerfile
# Backend Dockerfile key commands:
FROM node:20-alpine AS builder
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src ./src
RUN npx tsc -p tsconfig.build.json

FROM node:20-alpine AS runner
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 backend
USER backend
CMD ["node", "-r", "tsconfig-paths/register", "dist/index.js"]

# Frontend Dockerfile key commands:
FROM node:20-alpine AS builder
RUN npm ci && npm run build

FROM node:20-alpine AS runner
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER nextjs
CMD ["node", "server.js"]
```

### Reproduce Steps

```bash
# Backend
cd Tracking_Backend
docker build -t tracking-backend:test .
docker-compose up -d

# Frontend (requires output: 'standalone' in next.config.ts)
cd Tracking_Frontend
docker build -t tracking-frontend:test .
docker-compose up -d
```

---

## Feature 3: Swagger API Docs (OpenAPI 3.0.3)

### Mô tả
OpenAPI 3.0.3 specification covering ~90 endpoints, 19 tags. Mounted at `/api-docs`.

### Files tạo mới

```
Tracking_Backend/src/api/openapi/spec.ts
  # OpenAPI 3.0.3 spec object
  # Helper functions: ok(), crud(), jsonBody(), idParam(), paginationParams()
  # 19 tag groups: Auth, Users, Devices, Vehicles, Customers, Trips, Alerts, etc.
  # SecurityScheme: bearerAuth (Bearer token)
```

### Dependencies

```json
"swagger-ui-express": "^5.0.1"
```

### Reproduce Steps

```bash
# 1. Create src/api/openapi/spec.ts with OpenAPI 3.0.3 object
# 2. In src/index.ts:
import swaggerUi from 'swagger-ui-express';
import { spec } from '@/api/openapi/spec';
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
```

---

## Feature 4: publishEvent Wiring

### Mô tả
Kết nối Event Bus (Feature 1) với các service nghiệp vụ. Khi service tạo/cập nhật data, tự động publish event để Socket.IO broadcast tới frontend.

### Files modified

```
Tracking_Backend/src/domain/iot/services/iot-ingestion.service.ts
  + import { publishEvent } from '@/infrastructure/realtime'
  + publishEvent('device.status.changed', { device_id, status, ... })
  + publishEvent('device.position.updated', { device_id, lat, lon, speed, ... })
  + publishEvent('device.session.started', { device_id, session_id, ... })

Tracking_Backend/src/domain/alert/services/alert-crud.service.ts
  + import { publishEvent } from '@/infrastructure/realtime'
  + publishEvent('dashboard.alert.created', { id, vehicle_id: Number(alert.vehicle_id), ... })
  + publishEvent('dashboard.activity.created', { id, type: 'alert', message, timestamp })

Tracking_Backend/src/domain/firmware/services/firmware-deploy.service.ts
  + import { publishEvent } from '@/infrastructure/realtime'
  + publishEvent('firmware.assignment.updated', { firmware_id, device_ids, status })
```

### Lưu ý quan trọng

```typescript
// Alert vehicle_id là string | null trong DB, nhưng EventMap expects number | undefined
// Fix: Number(alert.vehicle_id) conversion
publishEvent('dashboard.alert.created', {
  vehicle_id: alert.vehicle_id ? Number(alert.vehicle_id) : undefined,
  // ...
});
```

---

## Feature 5: Validation Errors Domain

### Mô tả
Domain mới để ghi nhận và truy vấn lỗi validation từ IoT payloads. 5 validation types, paginated listing.

### Files tạo mới

```
Tracking_PostgreSQL/init/10-validation-errors.sql
  # CREATE TYPE validation_type_enum
  # CREATE TABLE validation_errors (id, correlation_id, device_id, validation_type, field_name, ...)
  # 3 indexes: device_id, validation_type, server_timestamp DESC

Tracking_Backend/src/domain/validation-error/
├── types/validation-error.types.ts       # ValidationError, ValidationErrorPublic, CreateInput, ListQuery
├── repositories/validation-error.repository.ts  # insert(), findByDeviceId(), findById()
└── services/validation-error.service.ts  # recordValidationError(), getValidationErrors()

Tracking_Backend/src/api/
├── validators/validation-error.validator.ts   # Zod schemas
├── controllers/validation-error.controller.ts # create, list
└── routes/validation-error.routes.ts          # POST /, GET /
```

### API Contract

```
POST /api/v1/validation-errors    # Record new validation error
GET  /api/v1/validation-errors    # List errors (?deviceId=&validationType=&page=&limit=)
```

### SQL Schema

```sql
CREATE TYPE validation_type_enum AS ENUM ('json_parse', 'missing_field', 'out_of_range', 'timestamp_anomaly', 'schema');

CREATE TABLE validation_errors (
    id SERIAL PRIMARY KEY,
    correlation_id VARCHAR(64),
    device_id VARCHAR(64),
    validation_type validation_type_enum NOT NULL,
    field_name VARCHAR(100),
    expected_value TEXT,
    actual_value TEXT,
    payload_hash VARCHAR(64),
    payload_sample JSONB,
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Feature 6: Driver Management

### Mô tả
Full CRUD cho driver (tài xế) với listing, search, pagination. Frontend page với DataTable.

### Files tạo mới

```
Tracking_PostgreSQL/init/11-drivers.sql
  # CREATE TYPE driver_status AS ENUM ('active', 'inactive', 'suspended')
  # CREATE TABLE drivers (id, driver_code, full_name, phone, email, license_*, date_of_birth, ...)
  # Indexes, updated_at trigger

Tracking_Backend/src/domain/driver/
├── types/driver.types.ts                  # Driver, DriverPublic, CreateDriverInput, UpdateDriverInput, DriverListQuery
├── repositories/driver.repository.ts      # findAll(), findById(), findByCode(), create(), update(), remove()
└── services/
    ├── driver-crud.service.ts             # getDriverById, createDriver, updateDriver, deleteDriver
    └── driver-list.service.ts             # listDrivers (paginated, filterable, sortable)

Tracking_Backend/src/api/
├── validators/driver.validator.ts          # Zod schemas (create, update, listQuery)
├── controllers/driver.controller.ts        # listDrivers, getDriver, createDriver, updateDriver, deleteDriver
└── routes/driver.routes.ts                 # CRUD routes, requireAuth

Tracking_Frontend/src/
├── app/dashboard/drivers/page.tsx          # Driver listing page
├── features/drivers/types/index.ts         # Frontend driver types
├── features/drivers/components/
│   ├── driver-columns.tsx                  # DataTable column definitions
│   └── driver-form.tsx                     # Create/edit driver form
└── lib/api/drivers.ts                      # API client functions
```

### API Contract

```
GET    /api/v1/drivers          # List (?page=&limit=&status=&search=&sortBy=&sortOrder=)
GET    /api/v1/drivers/:id      # Get by ID
POST   /api/v1/drivers          # Create (unique driver_code check)
PUT    /api/v1/drivers/:id      # Update (partial)
DELETE /api/v1/drivers/:id      # Delete
```

### Lưu ý: Service split pattern

```
driver-crud.service.ts  → CRUD operations (create, read, update, delete)
driver-list.service.ts  → Listing with pagination, search, filter, sort

Controller imports:
import * as driverCrudService from '@/domain/driver/services/driver-crud.service';
import * as driverListService from '@/domain/driver/services/driver-list.service';
```

---

## Feature 7: Fuel Analytics

### Mô tả
Analytics service tính toán fuel consumption từ trips data. Summary, by-vehicle breakdown, và trends theo time interval.

### Files tạo mới

```
Tracking_Backend/src/domain/fuel-analytics/
├── types/fuel-analytics.types.ts              # FuelSummary, VehicleFuelData, FuelTrend, FuelInterval, FuelDateRange
├── repositories/fuel-analytics.repository.ts  # getSummary(), getByVehicle(), getTrends() (SQL aggregations)
└── services/fuel-analytics.service.ts         # getFuelSummary, getFuelByVehicle, getFuelTrends

Tracking_Backend/src/api/
├── controllers/fuel-analytics.controller.ts    # summary, byVehicle, trends
└── routes/fuel-analytics.routes.ts             # GET /summary, /by-vehicle, /trends

Tracking_Frontend/src/
├── app/dashboard/fuel/page.tsx
├── features/fuel-analytics/types/index.ts
├── features/fuel-analytics/hooks/use-fuel-analytics.ts
└── features/fuel-analytics/components/
    ├── fuel-analytics-page.tsx                 # Main page component
    ├── fuel-summary-cards.tsx                  # Summary stats cards
    ├── fuel-by-vehicle-chart.tsx               # Bar chart by vehicle
    ├── fuel-trends-chart.tsx                   # Line chart over time
    └── fuel-date-filter.tsx                    # Date range + interval picker
```

### API Contract

```
GET /api/v1/fuel-analytics/summary       # ?from=&to=&fuelPrice= (default 25000 VND/L)
GET /api/v1/fuel-analytics/by-vehicle    # ?from=&to=
GET /api/v1/fuel-analytics/trends        # ?from=&to=&interval=day|week|month
```

### Key Business Logic

```typescript
// Default fuel price: 25,000 VND/L
// Average consumption formula: (totalFuelUsed / totalDistance) * 100 = L/100km
// Date range defaults to last 30 days
// Trends use generate_series + DATE_TRUNC for gap-filling
```

### Navigation

```
Tracking_Frontend/src/config/nav-config.ts
  + { title: 'Fuel Analytics', url: '/dashboard/fuel', icon: Fuel }
```

---

## Feature 8: ExcelJS Export Enhancement

### Mô tả
Thêm ExcelJS library để tạo file .xlsx thực sự (thay vì CSV). Hỗ trợ 5 export types, styled headers, auto-width columns.

### Files tạo mới

```
Tracking_Backend/src/domain/export/services/
├── export-file.service.ts       # generateExportFile() → Buffer (.xlsx)
│                                 # Supports: devices, vehicles, trips, alerts, maintenance
│                                 # Styled headers: bold, blue #2563EB fill, white text
└── export-processing.service.ts  # processExport() → fire-and-forget async
                                  # Calls generateExportFile → publishEvent('export.completed')
```

### Files modified

```
Tracking_Backend/src/domain/export/services/export-job.service.ts
  + import { processExport } from './export-processing.service'
  + void processExport(job)  # Fire-and-forget after job creation

Tracking_Backend/src/api/controllers/export.controller.ts
  + Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  + Content-Disposition: attachment; filename=export-{type}-{timestamp}.xlsx
  + res.download() with xlsx buffer
```

### Dependencies

```json
"exceljs": "^4.4.0"
```

---

## Unit Tests (Vitest)

### Files tạo mới

```
Tracking_Backend/vitest.config.ts
  # Vitest config with @/* path alias resolution

Tracking_Backend/src/domain/driver/services/
├── driver-crud.service.test.ts    # 10 tests: getById, create, update, delete
└── driver-list.service.test.ts    # 6 tests: pagination, sorting, sanitization

Tracking_Backend/src/domain/fuel-analytics/services/
└── fuel-analytics.service.test.ts # 15 tests: summary, byVehicle, trends, error paths
```

### Test Summary

```
Test Files:  4 passed (4)  [3 new + 1 existing auth.validator]
     Tests:  35 passed (35) [31 new + 4 existing]
  Duration:  ~800ms
```

### Test Patterns

```typescript
// vi.mock() at module level
// vi.mocked() for type-safe returns
// Factory functions: makeDriver(), makeSummary(), makeTrend()
// AAA pattern: Arrange → Act → Assert
// Both happy path + error path coverage
```

---

## Routes Registration

### Tracking_Backend/src/api/routes/index.ts

3 new routes added (lines 51-53):

```typescript
import validationErrorRoutes from '@/api/routes/validation-error.routes';
import fuelAnalyticsRoutes from '@/api/routes/fuel-analytics.routes';
import driverRoutes from '@/api/routes/driver.routes';

router.use('/validation-errors', validationErrorRoutes);
router.use('/fuel-analytics', fuelAnalyticsRoutes);
router.use('/drivers', driverRoutes);
```

---

## Dependencies Added

```json
// Tracking_Backend/package.json
{
  "dependencies": {
    "exceljs": "^4.4.0",          // Excel export
    "swagger-ui-express": "^5.0.1" // API docs UI
    // socket.io@^4.8.1 already existed
  }
}
```

---

## Database Migrations Required

Khi chạy từ đầu, cần thêm 2 SQL files vào `Tracking_PostgreSQL/init/`:

```
10-validation-errors.sql   # validation_type_enum + validation_errors table
11-drivers.sql             # driver_status enum + drivers table + trigger
```

> Thứ tự chạy: 00 → 01 → ... → 09 → 10 → 11 (theo alphabet/numeric order)

---

## Reproduce Guide (Chạy lại từ đầu)

### Prerequisites
- Node.js 20+
- Docker Desktop
- PostgreSQL running (port 5432)
- VictoriaMetrics running (port 8428)

### Step-by-step

```bash
# 1. Clone repo, checkout feature/coding branch
git clone <repo> && cd IoT_Vehicle_Tracking_System
git checkout feature/coding

# 2. Start infrastructure
cd Tracking_PostgreSQL && docker-compose up -d && cd ..
cd Tracking_EMQX && docker-compose up -d && cd ..
cd Tracking_VictoriaMetrics && docker-compose up -d && cd ..
cd Tracking_VictoriaLogs && docker-compose up -d && cd ..

# 3. Backend
cd Tracking_Backend
npm install
npm run typecheck    # Should be 0 errors
npm run test         # Should be 35/35 passed
npm run dev          # Starts on port 3000

# 4. Frontend
cd ../Tracking_Frontend
npm install
npm run dev          # Starts on port 3002

# 5. Verify
curl http://localhost:3000/health          # Should return { status: "ok" }
curl http://localhost:3000/ws-health       # WebSocket health
open http://localhost:3000/api-docs        # Swagger UI
open http://localhost:3002                 # Frontend

# 6. Docker build (optional)
cd Tracking_Backend && docker build -t tracking-backend . && cd ..
cd Tracking_Frontend && docker build -t tracking-frontend . && cd ..
```

### Agent Team Orchestration (để reproduce bằng AI agents)

```
# Spawn 8 agents song song:
Agent 1 (team-lead):     WebSocket Server → infrastructure/realtime/ (6 files)
Agent 2 (docker-agent):  Docker Compose → Dockerfile, docker-compose.yml, .dockerignore (8 files)
Agent 3 (swagger-agent): Swagger API Docs → api/openapi/spec.ts (1 file)
Agent 4 (events-agent):  publishEvent wiring → modify 3 service files
Agent 5 (validation-agent): Validation Errors → domain/validation-error/ + SQL (6 files)
Agent 6 (driver-agent):  Driver Management → domain/driver/ + frontend (10 files)
Agent 7 (fuel-agent):    Fuel Analytics → domain/fuel-analytics/ + frontend (12 files)
Agent 8 (export-agent):  ExcelJS Export → domain/export/ (2 new + 2 modified)
```
