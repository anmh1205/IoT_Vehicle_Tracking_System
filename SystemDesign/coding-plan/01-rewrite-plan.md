# Kế Hoạch Viết Lại IoT Vehicle Tracking System

> Kế hoạch chi tiết để viết lại hệ thống từ đầu, tận dụng code có thể tái sử dụng

---

## 1. Đường Dẫn Quan Trọng

```
📁 E:\anmh1205\IoT_Vehicle_Tracking_System\
│
├── 📁 IoT_Vehicle_Tracking_System/           ← SUBFOLDER (ROOT FOR SERVICES)
│   ├── 📁 Tracking_Backend/                  ← Express + TypeScript
│   ├── 📁 Tracking_Frontend/                 ← Next.js (update)
│   ├── 📁 Tracking_MqttBridge/               ← Standalone MQTT Bridge
│   ├── 📁 Tracking_PostgreSQL/               ← PostgreSQL Infrastructure
│   ├── 📁 Tracking_EMQX/                     ← MQTT Broker Infrastructure
│   ├── 📁 Tracking_VictoriaMetrics/          ← Time-series DB
│   ├── 📁 Tracking_VictoriaLogs/             ← Logging
│   └── 📁 Tracking_Grafana/                  ← Visualization
│
├── 📁 SystemDesign/                          ← Documentation
│   ├── coding-plan/                           ← Hướng dẫn implement
│   └── iot-vehicle-tracking-report/           ← System design docs
│
└── 📁 IVM26/                                 ← Reference project
    └── E:\anmh1205\IVM26\                     ← IVM26 patterns
```

---

## 2. Tổng Quan Viết Lại

### 2.1 Lý Do Viết Lại

| Vấn đề code cũ | Giải pháp mới |
|----------------|---------------|
| NestJS (khác IVM26 pattern) | Express + Domain-Driven Design |
| InfluxDB (chỉ có stub, không implement) | VictoriaMetrics (full implementation) |
| Không có logging infrastructure | VictoriaLogs |
| Không có observability | Prometheus + Grafana |
| MQTT không tách riêng | Standalone MQTT Bridge |
| Telemetry chỉ có mock data | Full implementation |

### 2.2 Phạm Vi

| Component | Action | Tỷ lệ tái sử dụng | Ghi chú |
|-----------|--------|-------------------|---------|
| **Backend** | Viết lại 100% | 0% reuse (tham khảo logic) | NestJS → Express |
| **MQTT Bridge** | Viết mới 100% | 0% reuse | Standalone service tại `mqtt-bridge/` |
| **Frontend** | Viết lại ~80% | ~20% reuse (UI components) | Xem chi tiết ở Section 3.1 |
| **Infrastructure** | Viết lại 100% | 0% reuse | VictoriaMetrics thay InfluxDB |

> ⚠️ **Lưu ý quan trọng về Frontend:**
> - UI Components (shadcn/ui): ✅ Copy 100% - Hoạt động tốt (~20% tổng frontend)
> - Pages/Features: ⚠️ Cần viết lại ~80% - Nhiều tính năng là TODO/skeleton
> - Chi tiết bugs và fixes: Xem `32-frontend-implementation.md`

---

## 3. Code Cũ Có Thể Tái Sử Dụng

### 3.1 Frontend UI Components (COPY TRỰC TIẾP)

**Nguồn:** `iot-vehicle-tracking-system-backup/frontend/src/components/ui/`

```
✅ COPY NGUYÊN VẸN (19 files):
├── button.tsx
├── card.tsx
├── input.tsx
├── label.tsx
├── select.tsx
├── textarea.tsx
├── dialog.tsx
├── sheet.tsx
├── dropdown-menu.tsx
├── tooltip.tsx
├── table.tsx
├── badge.tsx
├── switch.tsx
├── avatar.tsx
├── skeleton.tsx
├── separator.tsx
├── scroll-area.tsx
├── collapsible.tsx
├── toaster.tsx
└── sidebar.tsx (shadcn sidebar component)
```

**Command copy:**
```bash
# Copy UI components
cp -r "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-backup\frontend\src\components\ui" \
      "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system\frontend\src\components\ui"
```

### 3.2 Map Components (COPY VÀ UPDATE)

**Nguồn:** `iot-vehicle-tracking-system-backup/frontend/src/components/map/`

```
⚡ COPY VÀ UPDATE TYPES:
├── vehicle-map.tsx       → Update props interface
└── vehicle-trail-map.tsx → Update props interface
```

### 3.3 Icons (COPY TRỰC TIẾP)

**Nguồn:** `iot-vehicle-tracking-system-backup/frontend/src/components/icons.tsx`

```bash
cp "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-backup\frontend\src\components\icons.tsx" \
   "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system\frontend\src\components\"
```

### 3.4 Database Schema (CHUYỂN ĐỔI)

**Nguồn:** `iot-vehicle-tracking-system-backup/backend/src/modules/*/entities/*.entity.ts`

| Entity cũ | File nguồn | Chuyển thành |
|-----------|------------|--------------|
| User | `auth/entities/user.entity.ts` | `Tracking_PostgreSQL/init/01-users.sql` |
| Vehicle | `vehicles/entities/vehicle.entity.ts` | `Tracking_PostgreSQL/init/02-vehicles.sql` |
| Device | `devices/entities/device.entity.ts` | `Tracking_PostgreSQL/init/03-devices.sql` |
| Customer | `customers/entities/customer.entity.ts` | `Tracking_PostgreSQL/init/04-customers.sql` |
| Trip | `trips/entities/trip.entity.ts` | `Tracking_PostgreSQL/init/05-trips.sql` |
| Alert | `alerts/entities/alert.entity.ts` | `Tracking_PostgreSQL/init/06-alerts.sql` |
| Violation | `violations/entities/violation.entity.ts` | `Tracking_PostgreSQL/init/07-violations.sql` |
| Geofence | `geofences/entities/geofence.entity.ts` | `Tracking_PostgreSQL/init/08-geofences.sql` |
| Maintenance | `maintenance/entities/maintenance.entity.ts` | `Tracking_PostgreSQL/init/09-maintenance.sql` |

### 3.5 Business Logic (THAM KHẢO PATTERNS)

**Nguồn:** `iot-vehicle-tracking-system-backup/backend/src/modules/*/`

| Service cũ | Patterns cần tham khảo |
|------------|------------------------|
| `auth.service.ts` | JWT generation, password hashing, refresh token |
| `vehicles.service.ts` | CRUD pattern, pagination, search, duplicate check |
| `devices.service.ts` | CRUD pattern |
| `customers.service.ts` | CRUD pattern |
| `trips.service.ts` | CRUD pattern, date range queries |
| `alerts.service.ts` | CRUD pattern, status management |
| `dashboard.service.ts` | Aggregation queries, statistics |

### 3.6 DTOs & Validation (THAM KHẢO)

**Nguồn:** `iot-vehicle-tracking-system-backup/backend/src/modules/*/dto/*.dto.ts`

| DTO cũ (class-validator) | Chuyển thành (Zod) |
|--------------------------|---------------------|
| `auth.dto.ts` | `api/validators/auth.validator.ts` |
| `vehicle.dto.ts` | `api/validators/vehicle.validator.ts` |
| `device.dto.ts` | `api/validators/device.validator.ts` |
| `customer.dto.ts` | `api/validators/customer.validator.ts` |
| `trip.dto.ts` | `api/validators/trip.validator.ts` |
| `alert.dto.ts` | `api/validators/alert.validator.ts` |

---

## 4. Cấu Trúc Project Mới

### 4.1 Folder Structure

```
E:\anmh1205\IoT_Vehicle_Tracking_System\
│
├── IoT_Vehicle_Tracking_System\              # Root Subfolder
│   │
│   ├── Tracking_Backend/                     # Express + TypeScript
│   │   ├── src/
│   │   │   ├── index.ts                      # Entry point
│   │   │
│   │   ├── api/                          # API Layer
│   │   │   ├── controllers/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── vehicle.controller.ts
│   │   │   │   ├── device.controller.ts
│   │   │   │   └── ...
│   │   │   ├── routes/
│   │   │   │   ├── index.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── vehicle.routes.ts
│   │   │   │   └── ...
│   │   │   ├── validators/               # Zod schemas
│   │   │   │   ├── auth.validator.ts
│   │   │   │   ├── vehicle.validator.ts
│   │   │   │   └── ...
│   │   │   └── openapi/
│   │   │       └── swagger.ts
│   │   │
│   │   ├── domain/                       # Business Logic (DDD)
│   │   │   ├── auth/
│   │   │   │   ├── services/
│   │   │   │   │   ├── auth-session.service.ts
│   │   │   │   │   └── auth-password.service.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   └── user.repository.ts
│   │   │   │   └── types/
│   │   │   │       └── auth.types.ts
│   │   │   ├── vehicle/
│   │   │   │   ├── services/
│   │   │   │   ├── repositories/
│   │   │   │   └── types/
│   │   │   ├── device/
│   │   │   ├── customer/
│   │   │   ├── trip/
│   │   │   ├── alert/
│   │   │   ├── violation/
│   │   │   ├── geofence/
│   │   │   ├── maintenance/
│   │   │   ├── dashboard/
│   │   │   └── notification/
│   │   │
│   │   ├── infrastructure/               # External Services
│   │   │   ├── database/
│   │   │   │   ├── pool.ts               # PostgreSQL connection
│   │   │   │   └── queries.ts            # Query helpers
│   │   │   ├── victoriametrics/
│   │   │   │   ├── client.ts             # Write client
│   │   │   │   └── query.ts              # PromQL queries
│   │   │   ├── victorialogs/
│   │   │   │   └── client.ts             # Log client
│   │   │   ├── metrics/
│   │   │   │   ├── registry.ts           # Prometheus registry
│   │   │   │   └── app-metrics.ts        # Application metrics
│   │   │   └── logger/
│   │   │       └── winston.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── cors.middleware.ts
│   │   │   ├── security.middleware.ts
│   │   │   ├── rate-limit.middleware.ts
│   │   │   ├── metrics.middleware.ts
│   │   │   └── error-handler.middleware.ts
│   │   │
│   │   ├── realtime/                     # Socket.IO
│   │   │   ├── socket-server.ts
│   │   │   ├── socket-auth.ts
│   │   │   ├── event-bus.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   └── sentry.ts
│   │   │
│   │   └── shared/
│   │       ├── constants/
│   │       ├── utils/
│   │       └── types/
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── mqtt-bridge/                          # Standalone MQTT Bridge
│   ├── src/
│   │   ├── index.ts                      # Entry point
│   │   ├── mqtt.client.ts                # MQTT connection
│   │   ├── handlers/
│   │   │   ├── telemetry.handler.ts      # GPS, OBD2 data
│   │   │   └── command.handler.ts        # Device commands
│   │   ├── batch/
│   │   │   └── database-batch.service.ts # Batch insert
│   │   ├── cache/
│   │   │   ├── device-state.cache.ts
│   │   │   └── session-stats.cache.ts
│   │   ├── infrastructure/
│   │   │   ├── victoriametrics.ts
│   │   │   ├── victorialogs.ts
│   │   │   └── postgres.ts
│   │   └── validators/
│   │       └── payload.validator.ts
│   │
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                             # Next.js 16 (Feature-Sliced Architecture)
│   ├── src/
│   │   ├── app/                          # App Router (routing only)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx              # Overview
│   │   │       ├── map/
│   │   │       │   └── page.tsx
│   │   │       ├── vehicles/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx
│   │   │       ├── devices/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx
│   │   │       ├── customers/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx
│   │   │       ├── trips/
│   │   │       │   └── page.tsx
│   │   │       ├── alerts/
│   │   │       │   └── page.tsx
│   │   │       ├── violations/
│   │   │       │   └── page.tsx
│   │   │       ├── geofences/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx
│   │   │       ├── maintenance/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx
│   │   │       └── settings/
│   │   │           └── page.tsx
│   │   │
│   │   ├── components/                   # Shared components
│   │   │   ├── ui/                       # ✅ Copy từ backup (shadcn/ui)
│   │   │   ├── common/                   # Common UI elements
│   │   │   ├── forms/                    # Form components
│   │   │   ├── layout/                   # Layout components
│   │   │   │   ├── app-sidebar.tsx
│   │   │   │   ├── header.tsx
│   │   │   │   └── page-container.tsx
│   │   │   ├── providers/                # React context providers
│   │   │   ├── error/                    # Error boundaries
│   │   │   └── icons.tsx                 # ✅ Copy từ backup
│   │   │
│   │   ├── features/                     # ⭐ Feature modules (IVM26 pattern)
│   │   │   ├── auth/
│   │   │   │   └── components/
│   │   │   │       ├── login-form.tsx
│   │   │   │       └── auth-guard.tsx
│   │   │   ├── vehicles/
│   │   │   │   ├── components/
│   │   │   │   │   ├── vehicle-list.tsx
│   │   │   │   │   ├── vehicle-card.tsx
│   │   │   │   │   └── vehicle-detail-modal/
│   │   │   │   ├── hooks/
│   │   │   │   │   └── use-vehicle-filters.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── vehicle.types.ts
│   │   │   │   └── utils/
│   │   │   ├── devices/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── types/
│   │   │   │   └── utils/
│   │   │   ├── customers/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   └── types/
│   │   │   ├── trips/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   └── types/
│   │   │   ├── alerts/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   └── types/
│   │   │   ├── violations/
│   │   │   │   ├── components/
│   │   │   │   └── types/
│   │   │   ├── geofences/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   └── types/
│   │   │   ├── maintenance/
│   │   │   │   ├── components/
│   │   │   │   └── types/
│   │   │   ├── map/
│   │   │   │   ├── components/           # ⚡ Move từ backup/components/map
│   │   │   │   │   ├── vehicle-map.tsx
│   │   │   │   │   └── vehicle-trail-map.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── use-map-tracking.ts
│   │   │   │   ├── constants/
│   │   │   │   └── types/
│   │   │   ├── dashboard/
│   │   │   │   ├── components/
│   │   │   │   │   ├── stats-cards.tsx
│   │   │   │   │   └── activity-feed.tsx
│   │   │   │   └── hooks/
│   │   │   └── settings/
│   │   │       └── components/
│   │   │
│   │   ├── hooks/                        # Global hooks
│   │   │   ├── queries/                  # React Query fetch hooks
│   │   │   │   ├── use-vehicles-query.ts
│   │   │   │   ├── use-devices-query.ts
│   │   │   │   ├── use-alerts-query.ts
│   │   │   │   └── index.ts
│   │   │   ├── mutations/                # React Query mutation hooks
│   │   │   │   ├── use-create-vehicle.ts
│   │   │   │   ├── use-update-vehicle.ts
│   │   │   │   └── index.ts
│   │   │   └── realtime/                 # WebSocket/real-time hooks
│   │   │       ├── use-socket.ts
│   │   │       ├── use-device-telemetry.ts
│   │   │       └── use-alerts-stream.ts
│   │   │
│   │   ├── lib/                          # Core utilities
│   │   │   ├── api/                      # API client
│   │   │   │   ├── client.ts             # HTTP client setup
│   │   │   │   ├── endpoints.ts          # API endpoint definitions
│   │   │   │   └── interceptors.ts       # Request/response interceptors
│   │   │   ├── realtime/                 # Real-time connections
│   │   │   │   ├── socket-client.ts      # Socket.IO client
│   │   │   │   └── event-handlers.ts
│   │   │   ├── store/                    # Zustand stores
│   │   │   │   ├── auth.store.ts
│   │   │   │   ├── ui.store.ts
│   │   │   │   └── notifications.store.ts
│   │   │   ├── constants/                # Global constants
│   │   │   └── utils/                    # Utility functions
│   │   │       ├── date.ts
│   │   │       ├── format.ts
│   │   │       └── validation.ts
│   │   │
│   │   ├── types/                        # Global TypeScript types
│   │   │   ├── api.types.ts              # API response types
│   │   │   ├── common.types.ts           # Common types
│   │   │   └── index.ts
│   │   │
│   │   └── config/                       # Configuration
│   │       ├── site.ts                   # Site metadata
│   │       └── navigation.ts             # Navigation config
│   │
│   ├── e2e/                              # Playwright E2E tests
│   ├── package.json
│   └── Dockerfile
│
├── docker/
│   ├── postgres/
│   │   └── init/
│   │       ├── 00-extensions.sql
│   │       ├── 01-users.sql
│   │       ├── 02-vehicles.sql
│   │       ├── 03-devices.sql
│   │       ├── 04-customers.sql
│   │       ├── 05-trips.sql
│   │       ├── 06-alerts.sql
│   │       ├── 07-violations.sql
│   │       ├── 08-geofences.sql
│   │       ├── 09-maintenance.sql
│   │       └── 10-seed-data.sql
│   ├── prometheus/
│   │   ├── prometheus.yml
│   │   └── alerts.yml
│   ├── grafana/
│   │   └── provisioning/
│   │       ├── datasources/
│   │       └── dashboards/
│   └── nginx/
│       └── nginx.conf
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
└── package.json                          # Root scripts
```

---

## 5. Phases Chi Tiết

### Phase 1: Project Setup & Infrastructure (Tuần 1)

#### 1.1 Tạo cấu trúc thư mục

```bash
# Vào thư mục gốc
cd "E:\anmh1205\IoT_Vehicle_Tracking_System"

# Tạo subfolder chính
mkdir -p IoT_Vehicle_Tracking_System
cd IoT_Vehicle_Tracking_System

# Tạo cấu trúc backend
mkdir -p Tracking_Backend/src/{api/{controllers,routes,validators,openapi},domain/{auth,vehicle,device,customer,trip,alert,violation,geofence,maintenance,dashboard,notification}/{services,repositories,types},infrastructure/{database,victoriametrics,victorialogs,metrics,logger},middleware,realtime,config,shared/{constants,utils,types}}

# Tạo cấu trúc mqtt-bridge
mkdir -p Tracking_MqttBridge/src/{handlers,batch,cache,infrastructure,validators}

# Tạo cấu trúc frontend
mkdir -p Tracking_Frontend/src/{app/{login,dashboard/{map,vehicles,devices,customers,trips,alerts,violations,geofences,maintenance,settings}},components/{ui,layout,map},hooks,lib/{api,store,utils},types}

# Tạo cấu trúc docker infra
mkdir -p Tracking_PostgreSQL/init
mkdir -p Tracking_EMQX/etc
mkdir -p Tracking_VictoriaMetrics/data
mkdir -p Tracking_VictoriaLogs/data
mkdir -p Tracking_Grafana/provisioning/{datasources,dashboards}
```

#### 1.2 Copy Frontend UI Components từ backup

```bash
# Copy UI components (giữ nguyên)
cp -r "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-backup\frontend\src\components\ui\*" \
      "E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\Tracking_Frontend\src\components\ui\"

# Copy map components
cp -r "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-backup\frontend\src\components\map\*" \
      "E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\Tracking_Frontend\src\components\map\"

# Copy icons
cp "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-backup\frontend\src\components\icons.tsx" \
   "E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\Tracking_Frontend\src\components\"

# Copy providers (sẽ update sau)
cp "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-backup\frontend\src\components\providers.tsx" \
   "E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\Tracking_Frontend\src\components\"
```

#### 1.3 Chuyển đổi Entities sang SQL Migrations

**Đọc từ:** `iot-vehicle-tracking-system-backup/backend/src/modules/*/entities/*.entity.ts`

**Ví dụ chuyển đổi Vehicle Entity:**

```typescript
// NGUỒN: iot-vehicle-tracking-system-backup/backend/src/modules/vehicles/entities/vehicle.entity.ts
// ĐỌC FILE NÀY VÀ CHUYỂN THÀNH SQL:

@Entity('vehicles')
export class Vehicle {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'vehicle_id', unique: true, length: 50 })
    vehicleId: string;
    // ...
}
```

```sql
-- ĐÍCH: Tracking_PostgreSQL/init/02-vehicles.sql

CREATE TYPE vehicle_status AS ENUM ('active', 'inactive', 'maintenance', 'retired');
-- ... (như cũ)

CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) UNIQUE NOT NULL,
    -- ...
);
```

#### 1.4 Package.json Files

**Backend package.json:**
```json
{
  "name": "vehicle-tracking-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/index.js",
    "lint": "eslint \"src/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "verify": "npm run lint && npm run typecheck && npm run test"
  },
  "dependencies": {
    "express": "^4.19.2",
    "socket.io": "^4.8.1",
    "pg": "^8.16.3",
    "zod": "^3.23.8",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "helmet": "^8.1.0",
    "cors": "^2.8.5",
    "compression": "^1.8.1",
    "express-rate-limit": "^8.2.1",
    "prom-client": "^15.1.3",
    "winston": "^3.11.0",
    "@sentry/node": "^10.34.0",
    "dotenv": "^16.4.5",
    "uuid": "^13.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "tsx": "^4.11.0",
    "vitest": "^1.6.0",
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.9",
    "@types/pg": "^8.16.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/cors": "^2.8.17",
    "@types/compression": "^1.7.5",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.13.1",
    "@typescript-eslint/parser": "^7.13.1"
  }
}
```

#### 1.5 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: tracking-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secret}
      POSTGRES_DB: ${POSTGRES_DB:-vehicle_tracking}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./Tracking_PostgreSQL/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - tracking-network

  victoriametrics:
    image: victoriametrics/victoria-metrics:v1.96.0
    container_name: tracking-victoriametrics
    command:
      - "-retentionPeriod=30d"
      - "-storageDataPath=/storage"
      - "-httpListenAddr=:8428"
    volumes:
      - vm-data:/storage
    ports:
      - "8428:8428"
    networks:
      - tracking-network

  victorialogs:
    image: victoriametrics/victoria-logs:v1.0.0
    container_name: tracking-victorialogs
    command:
      - "-retentionPeriod=7d"
      - "-storageDataPath=/storage"
      - "-httpListenAddr=:9428"
    volumes:
      - vl-data:/storage
    ports:
      - "9428:9428"
    networks:
      - tracking-network

  emqx:
    image: emqx/emqx:5.3.0
    container_name: tracking-emqx
    ports:
      - "1883:1883"
      - "8083:8083"
      - "18083:18083"
    volumes:
      - emqx-data:/opt/emqx/data
    networks:
      - tracking-network

  backend:
    build:
      context: ./Tracking_Backend
      dockerfile: Dockerfile
    container_name: tracking-backend
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: 3000
      POSTGRESQL_HOST: postgres
      POSTGRESQL_PORT: 5432
      POSTGRESQL_DATABASE: ${POSTGRES_DB:-vehicle_tracking}
      POSTGRESQL_USER: ${POSTGRES_USER:-postgres}
      POSTGRESQL_PASSWORD: ${POSTGRES_PASSWORD:-secret}
      VICTORIAMETRICS_URL: http://victoriametrics:8428
      VICTORIALOGS_URL: http://victorialogs:9428
      JWT_SECRET: ${JWT_SECRET:-your-secret-key}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:3002}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - tracking-network

  mqtt-bridge:
    build:
      context: ./Tracking_MqttBridge
      dockerfile: Dockerfile
    container_name: tracking-mqtt-bridge
    environment:
      POSTGRESQL_HOST: postgres
      POSTGRESQL_PORT: 5432
      POSTGRESQL_DATABASE: ${POSTGRES_DB:-vehicle_tracking}
      POSTGRESQL_USER: ${POSTGRES_USER:-postgres}
      POSTGRESQL_PASSWORD: ${POSTGRES_PASSWORD:-secret}
      VICTORIAMETRICS_URL: http://victoriametrics:8428
      VICTORIALOGS_URL: http://victorialogs:9428
      MQTT_BROKER_URL: mqtt://emqx:1883
    depends_on:
      - postgres
      - victoriametrics
      - emqx
    networks:
      - tracking-network

  frontend:
    build:
      context: ./Tracking_Frontend
      dockerfile: Dockerfile
    container_name: tracking-frontend
    environment:
      NEXT_PUBLIC_API_URL: ${API_URL:-http://localhost:3000/api/v1}
      NEXT_PUBLIC_WS_URL: ${WS_URL:-http://localhost:3000}
    ports:
      - "3002:3000"
    depends_on:
      - backend
    networks:
      - tracking-network

  grafana:
    image: grafana/grafana:10.2.0
    container_name: tracking-grafana
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_USER:-admin}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin}
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./Tracking_Grafana/provisioning:/etc/grafana/provisioning
    networks:
      - tracking-network

volumes:
  postgres-data:
  vm-data:
  vl-data:
  emqx-data:
  grafana-data:

networks:
  tracking-network:
    driver: bridge
```

---

### Phase 2: Backend Core (Tuần 2-3)

#### 2.1 Thứ tự implement domains

| # | Domain | File tham khảo từ backup | Priority |
|---|--------|--------------------------|----------|
| 1 | `auth` | `modules/auth/auth.service.ts` | 🔴 Critical |
| 2 | `vehicle` | `modules/vehicles/vehicles.service.ts` | 🔴 Critical |
| 3 | `device` | `modules/devices/devices.service.ts` | 🔴 Critical |
| 4 | `customer` | `modules/customers/customers.service.ts` | 🟡 High |
| 5 | `trip` | `modules/trips/trips.service.ts` | 🟡 High |
| 6 | `alert` | `modules/alerts/alerts.service.ts` | 🟡 High |
| 7 | `violation` | `modules/violations/violations.service.ts` | 🟢 Medium |
| 8 | `geofence` | `modules/geofences/geofences.service.ts` | 🟢 Medium |
| 9 | `maintenance` | `modules/maintenance/maintenance.service.ts` | 🟢 Medium |
| 10 | `dashboard` | `modules/dashboard/dashboard.service.ts` | 🟢 Medium |
| 11 | `notification` | `modules/notifications/notifications.service.ts` | 🟢 Medium |

#### 2.2 Hướng dẫn chuyển đổi Service

**Đọc code cũ:**
```
iot-vehicle-tracking-system-backup/backend/src/modules/vehicles/vehicles.service.ts
```

**Chuyển đổi patterns:**

| NestJS (cũ) | Express (mới) |
|-------------|---------------|
| `@Injectable()` | Plain class |
| `@InjectRepository(Vehicle)` | Constructor injection |
| `this.vehicleRepository.findOne()` | `pool.query()` |
| `class-validator` DTOs | Zod schemas |
| NestJS exceptions | Custom error classes |

**Ví dụ chuyển đổi:**

```typescript
// CŨ: iot-vehicle-tracking-system-backup/backend/src/modules/vehicles/vehicles.service.ts
@Injectable()
export class VehiclesService {
    constructor(
        @InjectRepository(Vehicle)
        private readonly vehicleRepository: Repository<Vehicle>,
    ) {}

    async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
        const existing = await this.vehicleRepository.findOne({
            where: [
                { vehicleId: createVehicleDto.vehicleId },
                { plateNumber: createVehicleDto.plateNumber },
            ],
        });

        if (existing) {
            throw new ConflictException('Vehicle already exists');
        }

        const vehicle = this.vehicleRepository.create(createVehicleDto);
        return this.vehicleRepository.save(vehicle);
    }
}
```

```typescript
// MỚI: Tracking_Backend/src/domain/vehicle/services/vehicle.service.ts
import { VehicleRepository } from '../repositories/vehicle.repository';
import { CreateVehicleInput } from '../types/vehicle.types';
import { ConflictError } from '../../../shared/errors';

export class VehicleService {
    constructor(private vehicleRepo: VehicleRepository) {}

    async create(input: CreateVehicleInput) {
        // THAM KHẢO LOGIC TỪ CODE CŨ
        const existing = await this.vehicleRepo.findByVehicleIdOrPlate(
            input.vehicleId,
            input.plateNumber
        );

        if (existing) {
            throw new ConflictError('Vehicle already exists');
        }

        return this.vehicleRepo.create(input);
    }
}
```

```typescript
// MỚI: Tracking_Backend/src/domain/vehicle/repositories/vehicle.repository.ts
import { pool } from '../../../infrastructure/database/pool';
import { CreateVehicleInput, Vehicle } from '../types/vehicle.types';

export class VehicleRepository {
    async findByVehicleIdOrPlate(vehicleId: string, plateNumber?: string): Promise<Vehicle | null> {
        const result = await pool.query(
            `SELECT * FROM vehicles
             WHERE vehicle_id = $1 OR ($2 IS NOT NULL AND plate_number = $2)
             LIMIT 1`,
            [vehicleId, plateNumber]
        );
        return result.rows[0] || null;
    }

    async create(input: CreateVehicleInput): Promise<Vehicle> {
        const result = await pool.query(
            `INSERT INTO vehicles (vehicle_id, plate_number, brand, model, year, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [input.vehicleId, input.plateNumber, input.brand, input.model, input.year, 'active']
        );
        return result.rows[0];
    }
}
```

---

### Phase 3: MQTT Bridge & Telemetry (Tuần 4)

#### 3.1 MQTT Bridge (MỚI HOÀN TOÀN)

Code cũ **KHÔNG CÓ** MQTT implementation đúng. Cần viết mới 100%.

**Tham khảo:** `E:\anmh1205\IVM26\IVM26_Backend\backend_v1\src\mqtt-bridge\`

```typescript
// mqtt-bridge/src/index.ts
import { MqttClient } from './mqtt.client';
import { TelemetryHandler } from './handlers/telemetry.handler';
import { logger } from './infrastructure/logger';

async function main() {
    logger.info('Starting MQTT Bridge...');

    const telemetryHandler = new TelemetryHandler();
    const mqttClient = new MqttClient();

    // Subscribe to device telemetry
    await mqttClient.subscribe('v1/+/telemetry', telemetryHandler.handle.bind(telemetryHandler));
    await mqttClient.subscribe('v1/+/status', telemetryHandler.handleStatus.bind(telemetryHandler));

    logger.info('MQTT Bridge started successfully');
}

main().catch(err => {
    logger.error('Failed to start MQTT Bridge', err);
    process.exit(1);
});
```

#### 3.2 VictoriaMetrics Client

```typescript
// mqtt-bridge/src/infrastructure/victoriametrics.ts
const VM_URL = process.env.VICTORIAMETRICS_URL || 'http://localhost:8428';

export async function writeMetrics(metrics: string[]): Promise<void> {
    await fetch(`${VM_URL}/api/v1/import/prometheus`, {
        method: 'POST',
        body: metrics.join('\n'),
    });
}

export function buildTelemetryMetrics(deviceId: string, data: TelemetryData): string[] {
    const ts = Date.now();
    return [
        `device_latitude{device_id="${deviceId}"} ${data.latitude} ${ts}`,
        `device_longitude{device_id="${deviceId}"} ${data.longitude} ${ts}`,
        `device_speed{device_id="${deviceId}"} ${data.speed} ${ts}`,
        `device_battery{device_id="${deviceId}"} ${data.battery} ${ts}`,
        `device_satellites{device_id="${deviceId}"} ${data.satellites} ${ts}`,
    ];
}
```

---

### Phase 4: Frontend Updates (Tuần 5)

#### 4.1 Files cần COPY từ backup

```bash
# UI Components (copy nguyên)
cp -r iot-vehicle-tracking-system-backup/frontend/src/components/ui/* \
      IoT_Vehicle_Tracking_System/Tracking_Frontend/src/components/ui/

# Map components (copy, update types sau)
cp -r iot-vehicle-tracking-system-backup/frontend/src/components/map/* \
      IoT_Vehicle_Tracking_System/Tracking_Frontend/src/components/map/

# Icons
cp iot-vehicle-tracking-system-backup/frontend/src/components/icons.tsx \
   IoT_Vehicle_Tracking_System/Tracking_Frontend/src/components/

# Page layouts (copy structure, update imports)
cp iot-vehicle-tracking-system-backup/frontend/src/app/layout.tsx \
   IoT_Vehicle_Tracking_System/Tracking_Frontend/src/app/

cp iot-vehicle-tracking-system-backup/frontend/src/app/dashboard/layout.tsx \
   IoT_Vehicle_Tracking_System/Tracking_Frontend/src/app/dashboard/
```

#### 4.2 Files cần VIẾT LẠI

| File | Lý do |
|------|-------|
| `lib/api/client.ts` | API client mới cho Express backend |
| `types/*.ts` | Sync với backend types mới |
| `hooks/use-*.ts` | TanStack Query hooks mới |
| `lib/store/auth.store.ts` | Update auth flow |

#### 4.3 Files cần REFACTOR

| File | Thay đổi |
|------|----------|
| `components/layout/app-sidebar.tsx` | Giữ logic, update imports |
| `app/dashboard/*/page.tsx` | Giữ UI, update API calls |

#### 4.4 Files cần XÓA

```bash
# Xóa duplicate sidebars
rm iot-vehicle-tracking-system-backup/frontend/src/components/layout/sidebar.tsx
rm iot-vehicle-tracking-system-backup/frontend/src/components/layout/simple-sidebar.tsx
# Chỉ giữ app-sidebar.tsx
```

---

### Phase 5: Real-time & Socket.IO (Tuần 6)

**Tham khảo:**
- `iot-vehicle-tracking-system-backup/backend/src/gateway/realtime.gateway.ts`
- `E:\anmh1205\IVM26\IVM26_Backend\backend_v1\src\realtime\`

---

### Phase 6: Testing & Polish (Tuần 7-8)

---

## 6. Checklist Tổng Hợp

### Phase 1: Setup ✅
- [ ] Tạo cấu trúc thư mục mới (FLAT structure)
- [ ] Copy UI components từ backup
- [ ] Copy icons từ backup
- [ ] Chuyển đổi entities → SQL migrations
- [ ] Tạo docker-compose.yml
- [ ] Tạo package.json cho Tracking_Backend, Tracking_MqttBridge, Tracking_Frontend
- [ ] Test `docker-compose up` các service hạ tầng

### Phase 2: Backend Core
- [ ] Implement infrastructure/database (pool, queries)
- [ ] Implement middleware (auth, cors, rate-limit, security)
- [ ] Implement domain/auth (THAM KHẢO: `backup/modules/auth/auth.service.ts`)
- [ ] Implement domain/vehicle (THAM KHẢO: `backup/modules/vehicles/vehicles.service.ts`)
- [ ] Implement domain/device (THAM KHẢO: `backup/modules/devices/devices.service.ts`)
- [ ] Implement domain/customer
- [ ] Implement domain/trip
- [ ] Implement domain/alert
- [ ] Implement domain/violation
- [ ] Implement domain/geofence
- [ ] Implement domain/maintenance
- [ ] Implement domain/dashboard
- [ ] Setup API routes
- [ ] Test endpoints với Postman

### Phase 3: MQTT Bridge & Telemetry
- [ ] Implement mqtt-bridge/mqtt.client.ts
- [ ] Implement handlers/telemetry.handler.ts
- [ ] Implement infrastructure/victoriametrics
- [ ] Implement infrastructure/victorialogs
- [ ] Test MQTT → VictoriaMetrics pipeline

### Phase 4: Frontend Updates
- [ ] Viết lại lib/api/client.ts
- [ ] Viết lại types/ (sync với backend)
- [ ] Viết lại hooks/
- [ ] Refactor layout/app-sidebar.tsx
- [ ] Xóa duplicate sidebars
- [ ] Update tất cả pages

### Phase 5: Real-time & Socket.IO
- [ ] Implement backend/realtime/socket-server.ts
- [ ] Implement backend/realtime/event-bus.ts
- [ ] Viết hooks/use-realtime.ts
- [ ] Test real-time updates

### Phase 6: Testing & Polish
- [ ] Unit tests (target 80%)
- [ ] E2E tests với Playwright
- [ ] Security audit
- [ ] Documentation

---

## 7. Quick Reference

### Đường dẫn quan trọng

| Mục đích | Đường dẫn |
|----------|-----------|
| Code cũ (tham khảo) | `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-backup\` |
| Project Root | `E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\` |
| Project Backend | `E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\Tracking_Backend\` |
| Project Frontend | `E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\Tracking_Frontend\` |
| Project MQTT Bridge | `E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\Tracking_MqttBridge\` |
| IVM26 Reference | `E:\anmh1205\IVM26\` |
| System Design | `E:\anmh1205\IoT_Vehicle_Tracking_System\SystemDesign\` |
| Coding Plan | `SystemDesign\coding-plan\` |

### Files quan trọng từ backup cần đọc

| File | Nội dung cần lấy |
|------|------------------|
| `backup/backend/src/modules/auth/auth.service.ts` | JWT logic, password hashing |
| `backup/backend/src/modules/vehicles/vehicles.service.ts` | CRUD, pagination, search |
| `backup/backend/src/modules/*/entities/*.entity.ts` | Database schema |
| `backup/backend/src/modules/*/dto/*.dto.ts` | Validation rules |
| `backup/frontend/src/components/ui/*` | UI components (copy nguyên) |

### Tech Stack mới

| Layer | Technology |
|-------|------------|
| Backend | Express + TypeScript + Zod |
| Database | PostgreSQL (pg) + VictoriaMetrics + VictoriaLogs |
| MQTT | mqtt 5.x (standalone bridge) |
| Real-time | Socket.IO 4.x |
| Frontend | Next.js 16 + React 19 + Tailwind 4 |
| Testing | Vitest (backend) + Playwright (E2E) |
