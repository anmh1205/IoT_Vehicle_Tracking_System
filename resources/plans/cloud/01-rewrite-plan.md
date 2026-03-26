# Káº¿ Hoáº¡ch Viáº¿t Láº¡i IoT Vehicle Tracking System

> Káº¿ hoáº¡ch chi tiáº¿t Ä‘á»ƒ viáº¿t láº¡i há»‡ thá»‘ng tá»« Ä‘áº§u, táº­n dá»¥ng code cÃ³ thá»ƒ tÃ¡i sá»­ dá»¥ng

---

## 1. ÄÆ°á»ng Dáº«n Quan Trá»ng

```
ðŸ“ E:\anmh1205\IoT_Vehicle_Tracking_System\
â”‚
â”œâ”€â”€ ðŸ“ IoT_Vehicle_Tracking_System/           â† SUBFOLDER (ROOT FOR SERVICES)
â”‚   â”œâ”€â”€ ðŸ“ Tracking_Backend/                  â† Express + TypeScript
â”‚   â”œâ”€â”€ ðŸ“ Tracking_Frontend/                 â† Next.js (update)
â”‚   â”œâ”€â”€ ðŸ“ Tracking_MqttBridge/               â† Standalone MQTT Bridge
â”‚   â”œâ”€â”€ ðŸ“ Tracking_PostgreSQL/               â† PostgreSQL Infrastructure
â”‚   â”œâ”€â”€ ðŸ“ Tracking_EMQX/                     â† MQTT Broker Infrastructure
â”‚   â”œâ”€â”€ ðŸ“ Tracking_VictoriaMetrics/          â† Time-series DB
â”‚   â”œâ”€â”€ ðŸ“ Tracking_VictoriaLogs/             â† Logging
â”‚   â””â”€â”€ ðŸ“ Tracking_Grafana/                  â† Visualization
â”‚
â”œâ”€â”€ ðŸ“ SystemDesign/                          â† Documentation
â”‚   â”œâ”€â”€ coding-plan/                           â† HÆ°á»›ng dáº«n implement
â”‚   â””â”€â”€ iot-vehicle-tracking-report/           â† System design docs
â”‚
â””â”€â”€ ðŸ“ IVM26/                                 â† Reference project
    â””â”€â”€ E:\anmh1205\IVM26\                     â† IVM26 patterns
```

---

## 2. Tá»•ng Quan Viáº¿t Láº¡i

### 2.1 LÃ½ Do Viáº¿t Láº¡i

| Váº¥n Ä‘á» code cÅ© | Giáº£i phÃ¡p má»›i |
|----------------|---------------|
| NestJS (khÃ¡c IVM26 pattern) | Express + Domain-Driven Design |
| InfluxDB (chá»‰ cÃ³ stub, khÃ´ng implement) | VictoriaMetrics (full implementation) |
| KhÃ´ng cÃ³ logging infrastructure | VictoriaLogs |
| KhÃ´ng cÃ³ observability | Prometheus + Grafana |
| MQTT khÃ´ng tÃ¡ch riÃªng | Standalone MQTT Bridge |
| Telemetry chá»‰ cÃ³ mock data | Full implementation |

### 2.2 Pháº¡m Vi

| Component | Action | Tá»· lá»‡ tÃ¡i sá»­ dá»¥ng | Ghi chÃº |
|-----------|--------|-------------------|---------|
| **Backend** | Viáº¿t láº¡i 100% | 0% reuse (tham kháº£o logic) | NestJS â†’ Express |
| **MQTT Bridge** | Viáº¿t má»›i 100% | 0% reuse | Standalone service táº¡i `mqtt-bridge/` |
| **Frontend** | Viáº¿t láº¡i ~80% | ~20% reuse (UI components) | Xem chi tiáº¿t á»Ÿ Section 3.1 |
| **Infrastructure** | Viáº¿t láº¡i 100% | 0% reuse | VictoriaMetrics thay InfluxDB |

> âš ï¸ **LÆ°u Ã½ quan trá»ng vá» Frontend:**
> - UI Components (shadcn/ui): âœ… Copy 100% - Hoáº¡t Ä‘á»™ng tá»‘t (~20% tá»•ng frontend)
> - Pages/Features: âš ï¸ Cáº§n viáº¿t láº¡i ~80% - Nhiá»u tÃ­nh nÄƒng lÃ  TODO/skeleton
> - Chi tiáº¿t bugs vÃ  fixes: Xem `32-frontend-implementation.md`

---

## 3. Code CÅ© CÃ³ Thá»ƒ TÃ¡i Sá»­ Dá»¥ng

### 3.1 Frontend UI Components (COPY TRá»°C TIáº¾P)

**Nguá»“n:** `iot-vehicle-tracking-system-backup/frontend/src/components/ui/`

```
âœ… COPY NGUYÃŠN Váº¸N (19 files):
â”œâ”€â”€ button.tsx
â”œâ”€â”€ card.tsx
â”œâ”€â”€ input.tsx
â”œâ”€â”€ label.tsx
â”œâ”€â”€ select.tsx
â”œâ”€â”€ textarea.tsx
â”œâ”€â”€ dialog.tsx
â”œâ”€â”€ sheet.tsx
â”œâ”€â”€ dropdown-menu.tsx
â”œâ”€â”€ tooltip.tsx
â”œâ”€â”€ table.tsx
â”œâ”€â”€ badge.tsx
â”œâ”€â”€ switch.tsx
â”œâ”€â”€ avatar.tsx
â”œâ”€â”€ skeleton.tsx
â”œâ”€â”€ separator.tsx
â”œâ”€â”€ scroll-area.tsx
â”œâ”€â”€ collapsible.tsx
â”œâ”€â”€ toaster.tsx
â””â”€â”€ sidebar.tsx (shadcn sidebar component)
```

**Command copy:**
```bash
# Copy UI components
cp -r "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-backup\frontend\src\components\ui" \
      "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\frontend\src\components\ui"
```

### 3.2 Map Components (COPY VÃ€ UPDATE)

**Nguá»“n:** `iot-vehicle-tracking-system-backup/frontend/src/components/map/`

```
âš¡ COPY VÃ€ UPDATE TYPES:
â”œâ”€â”€ vehicle-map.tsx       â†’ Update props interface
â””â”€â”€ vehicle-trail-map.tsx â†’ Update props interface
```

### 3.3 Icons (COPY TRá»°C TIáº¾P)

**Nguá»“n:** `iot-vehicle-tracking-system-backup/frontend/src/components/icons.tsx`

```bash
cp "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-backup\frontend\src\components\icons.tsx" \
   "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-cloud\frontend\src\components\"
```

### 3.4 Database Schema (CHUYá»‚N Äá»”I)

**Nguá»“n:** `iot-vehicle-tracking-system-backup/backend/src/modules/*/entities/*.entity.ts`

| Entity cÅ© | File nguá»“n | Chuyá»ƒn thÃ nh |
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

### 3.5 Business Logic (THAM KHáº¢O PATTERNS)

**Nguá»“n:** `iot-vehicle-tracking-system-backup/backend/src/modules/*/`

| Service cÅ© | Patterns cáº§n tham kháº£o |
|------------|------------------------|
| `auth.service.ts` | JWT generation, password hashing, refresh token |
| `vehicles.service.ts` | CRUD pattern, pagination, search, duplicate check |
| `devices.service.ts` | CRUD pattern |
| `customers.service.ts` | CRUD pattern |
| `trips.service.ts` | CRUD pattern, date range queries |
| `alerts.service.ts` | CRUD pattern, status management |
| `dashboard.service.ts` | Aggregation queries, statistics |

### 3.6 DTOs & Validation (THAM KHáº¢O)

**Nguá»“n:** `iot-vehicle-tracking-system-backup/backend/src/modules/*/dto/*.dto.ts`

| DTO cÅ© (class-validator) | Chuyá»ƒn thÃ nh (Zod) |
|--------------------------|---------------------|
| `auth.dto.ts` | `api/validators/auth.validator.ts` |
| `vehicle.dto.ts` | `api/validators/vehicle.validator.ts` |
| `device.dto.ts` | `api/validators/device.validator.ts` |
| `customer.dto.ts` | `api/validators/customer.validator.ts` |
| `trip.dto.ts` | `api/validators/trip.validator.ts` |
| `alert.dto.ts` | `api/validators/alert.validator.ts` |

---

## 4. Cáº¥u TrÃºc Project Má»›i

### 4.1 Folder Structure

```
E:\anmh1205\IoT_Vehicle_Tracking_System\
â”‚
â”œâ”€â”€ IoT_Vehicle_Tracking_System\              # Root Subfolder
â”‚   â”‚
â”‚   â”œâ”€â”€ Tracking_Backend/                     # Express + TypeScript
â”‚   â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”‚   â”œâ”€â”€ index.ts                      # Entry point
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ api/                          # API Layer
â”‚   â”‚   â”‚   â”œâ”€â”€ controllers/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ auth.controller.ts
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ vehicle.controller.ts
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ device.controller.ts
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ ...
â”‚   â”‚   â”‚   â”œâ”€â”€ routes/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ index.ts
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ auth.routes.ts
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ vehicle.routes.ts
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ ...
â”‚   â”‚   â”‚   â”œâ”€â”€ validators/               # Zod schemas
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ auth.validator.ts
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ vehicle.validator.ts
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ ...
â”‚   â”‚   â”‚   â””â”€â”€ openapi/
â”‚   â”‚   â”‚       â””â”€â”€ swagger.ts
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ domain/                       # Business Logic (DDD)
â”‚   â”‚   â”‚   â”œâ”€â”€ auth/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ auth-session.service.ts
â”‚   â”‚   â”‚   â”‚   â”‚   â””â”€â”€ auth-password.service.ts
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ repositories/
â”‚   â”‚   â”‚   â”‚   â”‚   â””â”€â”€ user.repository.ts
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ types/
â”‚   â”‚   â”‚   â”‚       â””â”€â”€ auth.types.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ vehicle/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ repositories/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ types/
â”‚   â”‚   â”‚   â”œâ”€â”€ device/
â”‚   â”‚   â”‚   â”œâ”€â”€ customer/
â”‚   â”‚   â”‚   â”œâ”€â”€ trip/
â”‚   â”‚   â”‚   â”œâ”€â”€ alert/
â”‚   â”‚   â”‚   â”œâ”€â”€ violation/
â”‚   â”‚   â”‚   â”œâ”€â”€ geofence/
â”‚   â”‚   â”‚   â”œâ”€â”€ maintenance/
â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard/
â”‚   â”‚   â”‚   â””â”€â”€ notification/
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ infrastructure/               # External Services
â”‚   â”‚   â”‚   â”œâ”€â”€ database/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ pool.ts               # PostgreSQL connection
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ queries.ts            # Query helpers
â”‚   â”‚   â”‚   â”œâ”€â”€ victoriametrics/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ client.ts             # Write client
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ query.ts              # PromQL queries
â”‚   â”‚   â”‚   â”œâ”€â”€ victorialogs/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ client.ts             # Log client
â”‚   â”‚   â”‚   â”œâ”€â”€ metrics/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ registry.ts           # Prometheus registry
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ app-metrics.ts        # Application metrics
â”‚   â”‚   â”‚   â””â”€â”€ logger/
â”‚   â”‚   â”‚       â””â”€â”€ winston.ts
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ middleware/
â”‚   â”‚   â”‚   â”œâ”€â”€ auth.middleware.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ cors.middleware.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ security.middleware.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ rate-limit.middleware.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ metrics.middleware.ts
â”‚   â”‚   â”‚   â””â”€â”€ error-handler.middleware.ts
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ realtime/                     # Socket.IO
â”‚   â”‚   â”‚   â”œâ”€â”€ socket-server.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ socket-auth.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ event-bus.ts
â”‚   â”‚   â”‚   â””â”€â”€ types.ts
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ config/
â”‚   â”‚   â”‚   â”œâ”€â”€ env.ts
â”‚   â”‚   â”‚   â””â”€â”€ sentry.ts
â”‚   â”‚   â”‚
â”‚   â”‚   â””â”€â”€ shared/
â”‚   â”‚       â”œâ”€â”€ constants/
â”‚   â”‚       â”œâ”€â”€ utils/
â”‚   â”‚       â””â”€â”€ types/
â”‚   â”‚
â”‚   â”œâ”€â”€ package.json
â”‚   â”œâ”€â”€ tsconfig.json
â”‚   â””â”€â”€ Dockerfile
â”‚
â”œâ”€â”€ mqtt-bridge/                          # Standalone MQTT Bridge
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ index.ts                      # Entry point
â”‚   â”‚   â”œâ”€â”€ mqtt.client.ts                # MQTT connection
â”‚   â”‚   â”œâ”€â”€ handlers/
â”‚   â”‚   â”‚   â”œâ”€â”€ telemetry.handler.ts      # GPS, OBD2 data
â”‚   â”‚   â”‚   â””â”€â”€ command.handler.ts        # Device commands
â”‚   â”‚   â”œâ”€â”€ batch/
â”‚   â”‚   â”‚   â””â”€â”€ database-batch.service.ts # Batch insert
â”‚   â”‚   â”œâ”€â”€ cache/
â”‚   â”‚   â”‚   â”œâ”€â”€ device-state.cache.ts
â”‚   â”‚   â”‚   â””â”€â”€ session-stats.cache.ts
â”‚   â”‚   â”œâ”€â”€ infrastructure/
â”‚   â”‚   â”‚   â”œâ”€â”€ victoriametrics.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ victorialogs.ts
â”‚   â”‚   â”‚   â””â”€â”€ postgres.ts
â”‚   â”‚   â””â”€â”€ validators/
â”‚   â”‚       â””â”€â”€ payload.validator.ts
â”‚   â”‚
â”‚   â”œâ”€â”€ package.json
â”‚   â””â”€â”€ Dockerfile
â”‚
â”œâ”€â”€ frontend/                             # Next.js 16 (Feature-Sliced Architecture)
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ app/                          # App Router (routing only)
â”‚   â”‚   â”‚   â”œâ”€â”€ layout.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ login/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â”‚   â””â”€â”€ dashboard/
â”‚   â”‚   â”‚       â”œâ”€â”€ layout.tsx
â”‚   â”‚   â”‚       â”œâ”€â”€ page.tsx              # Overview
â”‚   â”‚   â”‚       â”œâ”€â”€ map/
â”‚   â”‚   â”‚       â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â”‚       â”œâ”€â”€ vehicles/
â”‚   â”‚   â”‚       â”‚   â”œâ”€â”€ page.tsx
â”‚   â”‚   â”‚       â”‚   â””â”€â”€ [id]/
â”‚   â”‚   â”‚       â”‚       â””â”€â”€ page.tsx
â”‚   â”‚   â”‚       â”œâ”€â”€ devices/
â”‚   â”‚   â”‚       â”‚   â”œâ”€â”€ page.tsx
â”‚   â”‚   â”‚       â”‚   â””â”€â”€ [id]/
â”‚   â”‚   â”‚       â”‚       â””â”€â”€ page.tsx
â”‚   â”‚   â”‚       â”œâ”€â”€ customers/
â”‚   â”‚   â”‚       â”‚   â”œâ”€â”€ page.tsx
â”‚   â”‚   â”‚       â”‚   â””â”€â”€ [id]/
â”‚   â”‚   â”‚       â”‚       â””â”€â”€ page.tsx
â”‚   â”‚   â”‚       â”œâ”€â”€ trips/
â”‚   â”‚   â”‚       â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â”‚       â”œâ”€â”€ alerts/
â”‚   â”‚   â”‚       â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â”‚       â”œâ”€â”€ violations/
â”‚   â”‚   â”‚       â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â”‚       â”œâ”€â”€ geofences/
â”‚   â”‚   â”‚       â”‚   â”œâ”€â”€ page.tsx
â”‚   â”‚   â”‚       â”‚   â””â”€â”€ [id]/
â”‚   â”‚   â”‚       â”‚       â””â”€â”€ page.tsx
â”‚   â”‚   â”‚       â”œâ”€â”€ maintenance/
â”‚   â”‚   â”‚       â”‚   â”œâ”€â”€ page.tsx
â”‚   â”‚   â”‚       â”‚   â””â”€â”€ [id]/
â”‚   â”‚   â”‚       â”‚       â””â”€â”€ page.tsx
â”‚   â”‚   â”‚       â””â”€â”€ settings/
â”‚   â”‚   â”‚           â””â”€â”€ page.tsx
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ components/                   # Shared components
â”‚   â”‚   â”‚   â”œâ”€â”€ ui/                       # âœ… Copy tá»« backup (shadcn/ui)
â”‚   â”‚   â”‚   â”œâ”€â”€ common/                   # Common UI elements
â”‚   â”‚   â”‚   â”œâ”€â”€ forms/                    # Form components
â”‚   â”‚   â”‚   â”œâ”€â”€ layout/                   # Layout components
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ app-sidebar.tsx
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ header.tsx
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ page-container.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ providers/                # React context providers
â”‚   â”‚   â”‚   â”œâ”€â”€ error/                    # Error boundaries
â”‚   â”‚   â”‚   â””â”€â”€ icons.tsx                 # âœ… Copy tá»« backup
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ features/                     # â­ Feature modules (IVM26 pattern)
â”‚   â”‚   â”‚   â”œâ”€â”€ auth/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ components/
â”‚   â”‚   â”‚   â”‚       â”œâ”€â”€ login-form.tsx
â”‚   â”‚   â”‚   â”‚       â””â”€â”€ auth-guard.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ vehicles/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ vehicle-list.tsx
â”‚   â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ vehicle-card.tsx
â”‚   â”‚   â”‚   â”‚   â”‚   â””â”€â”€ vehicle-detail-modal/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”‚   â”‚   â”‚   â””â”€â”€ use-vehicle-filters.ts
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ types/
â”‚   â”‚   â”‚   â”‚   â”‚   â””â”€â”€ vehicle.types.ts
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ utils/
â”‚   â”‚   â”‚   â”œâ”€â”€ devices/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ types/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ utils/
â”‚   â”‚   â”‚   â”œâ”€â”€ customers/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ types/
â”‚   â”‚   â”‚   â”œâ”€â”€ trips/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ types/
â”‚   â”‚   â”‚   â”œâ”€â”€ alerts/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ types/
â”‚   â”‚   â”‚   â”œâ”€â”€ violations/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ types/
â”‚   â”‚   â”‚   â”œâ”€â”€ geofences/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ types/
â”‚   â”‚   â”‚   â”œâ”€â”€ maintenance/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ types/
â”‚   â”‚   â”‚   â”œâ”€â”€ map/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ components/           # âš¡ Move tá»« backup/components/map
â”‚   â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ vehicle-map.tsx
â”‚   â”‚   â”‚   â”‚   â”‚   â””â”€â”€ vehicle-trail-map.tsx
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”‚   â”‚   â”‚   â””â”€â”€ use-map-tracking.ts
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ constants/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ types/
â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ stats-cards.tsx
â”‚   â”‚   â”‚   â”‚   â”‚   â””â”€â”€ activity-feed.tsx
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ hooks/
â”‚   â”‚   â”‚   â””â”€â”€ settings/
â”‚   â”‚   â”‚       â””â”€â”€ components/
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ hooks/                        # Global hooks
â”‚   â”‚   â”‚   â”œâ”€â”€ queries/                  # React Query fetch hooks
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ use-vehicles-query.ts
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ use-devices-query.ts
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ use-alerts-query.ts
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ index.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ mutations/                # React Query mutation hooks
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ use-create-vehicle.ts
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ use-update-vehicle.ts
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ index.ts
â”‚   â”‚   â”‚   â””â”€â”€ realtime/                 # WebSocket/real-time hooks
â”‚   â”‚   â”‚       â”œâ”€â”€ use-socket.ts
â”‚   â”‚   â”‚       â”œâ”€â”€ use-device-telemetry.ts
â”‚   â”‚   â”‚       â””â”€â”€ use-alerts-stream.ts
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ lib/                          # Core utilities
â”‚   â”‚   â”‚   â”œâ”€â”€ api/                      # API client
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ client.ts             # HTTP client setup
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ endpoints.ts          # API endpoint definitions
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ interceptors.ts       # Request/response interceptors
â”‚   â”‚   â”‚   â”œâ”€â”€ realtime/                 # Real-time connections
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ socket-client.ts      # Socket.IO client
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ event-handlers.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ store/                    # Zustand stores
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ auth.store.ts
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ ui.store.ts
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ notifications.store.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ constants/                # Global constants
â”‚   â”‚   â”‚   â””â”€â”€ utils/                    # Utility functions
â”‚   â”‚   â”‚       â”œâ”€â”€ date.ts
â”‚   â”‚   â”‚       â”œâ”€â”€ format.ts
â”‚   â”‚   â”‚       â””â”€â”€ validation.ts
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ types/                        # Global TypeScript types
â”‚   â”‚   â”‚   â”œâ”€â”€ api.types.ts              # API response types
â”‚   â”‚   â”‚   â”œâ”€â”€ common.types.ts           # Common types
â”‚   â”‚   â”‚   â””â”€â”€ index.ts
â”‚   â”‚   â”‚
â”‚   â”‚   â””â”€â”€ config/                       # Configuration
â”‚   â”‚       â”œâ”€â”€ site.ts                   # Site metadata
â”‚   â”‚       â””â”€â”€ navigation.ts             # Navigation config
â”‚   â”‚
â”‚   â”œâ”€â”€ e2e/                              # Playwright E2E tests
â”‚   â”œâ”€â”€ package.json
â”‚   â””â”€â”€ Dockerfile
â”‚
â”œâ”€â”€ docker/
â”‚   â”œâ”€â”€ postgres/
â”‚   â”‚   â””â”€â”€ init/
â”‚   â”‚       â”œâ”€â”€ 00-extensions.sql
â”‚   â”‚       â”œâ”€â”€ 01-users.sql
â”‚   â”‚       â”œâ”€â”€ 02-vehicles.sql
â”‚   â”‚       â”œâ”€â”€ 03-devices.sql
â”‚   â”‚       â”œâ”€â”€ 04-customers.sql
â”‚   â”‚       â”œâ”€â”€ 05-trips.sql
â”‚   â”‚       â”œâ”€â”€ 06-alerts.sql
â”‚   â”‚       â”œâ”€â”€ 07-violations.sql
â”‚   â”‚       â”œâ”€â”€ 08-geofences.sql
â”‚   â”‚       â”œâ”€â”€ 09-maintenance.sql
â”‚   â”‚       â””â”€â”€ 10-seed-data.sql
â”‚   â”œâ”€â”€ prometheus/
â”‚   â”‚   â”œâ”€â”€ prometheus.yml
â”‚   â”‚   â””â”€â”€ alerts.yml
â”‚   â”œâ”€â”€ grafana/
â”‚   â”‚   â””â”€â”€ provisioning/
â”‚   â”‚       â”œâ”€â”€ datasources/
â”‚   â”‚       â””â”€â”€ dashboards/
â”‚   â””â”€â”€ nginx/
â”‚       â””â”€â”€ nginx.conf
â”‚
â”œâ”€â”€ docker-compose.yml
â”œâ”€â”€ docker-compose.dev.yml
â”œâ”€â”€ .env.example
â””â”€â”€ package.json                          # Root scripts
```

---

## 5. Phases Chi Tiáº¿t

### Phase 1: Project Setup & Infrastructure (Tuáº§n 1)

#### 1.1 Táº¡o cáº¥u trÃºc thÆ° má»¥c

```bash
# VÃ o thÆ° má»¥c gá»‘c
cd "E:\anmh1205\IoT_Vehicle_Tracking_System"

# Táº¡o subfolder chÃ­nh
mkdir -p IoT_Vehicle_Tracking_System
cd IoT_Vehicle_Tracking_System

# Táº¡o cáº¥u trÃºc backend
mkdir -p Tracking_Backend/src/{api/{controllers,routes,validators,openapi},domain/{auth,vehicle,device,customer,trip,alert,violation,geofence,maintenance,dashboard,notification}/{services,repositories,types},infrastructure/{database,victoriametrics,victorialogs,metrics,logger},middleware,realtime,config,shared/{constants,utils,types}}

# Táº¡o cáº¥u trÃºc mqtt-bridge
mkdir -p Tracking_MqttBridge/src/{handlers,batch,cache,infrastructure,validators}

# Táº¡o cáº¥u trÃºc frontend
mkdir -p Tracking_Frontend/src/{app/{login,dashboard/{map,vehicles,devices,customers,trips,alerts,violations,geofences,maintenance,settings}},components/{ui,layout,map},hooks,lib/{api,store,utils},types}

# Táº¡o cáº¥u trÃºc docker infra
mkdir -p Tracking_PostgreSQL/init
mkdir -p Tracking_EMQX/etc
mkdir -p Tracking_VictoriaMetrics/data
mkdir -p Tracking_VictoriaLogs/data
mkdir -p Tracking_Grafana/provisioning/{datasources,dashboards}
```

#### 1.2 Copy Frontend UI Components tá»« backup

```bash
# Copy UI components (giá»¯ nguyÃªn)
cp -r "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-backup\frontend\src\components\ui\*" \
      "E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\Tracking_Frontend\src\components\ui\"

# Copy map components
cp -r "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-backup\frontend\src\components\map\*" \
      "E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\Tracking_Frontend\src\components\map\"

# Copy icons
cp "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-backup\frontend\src\components\icons.tsx" \
   "E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\Tracking_Frontend\src\components\"

# Copy providers (sáº½ update sau)
cp "E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-backup\frontend\src\components\providers.tsx" \
   "E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\Tracking_Frontend\src\components\"
```

#### 1.3 Chuyá»ƒn Ä‘á»•i Entities sang SQL Migrations

**Äá»c tá»«:** `iot-vehicle-tracking-system-backup/backend/src/modules/*/entities/*.entity.ts`

**VÃ­ dá»¥ chuyá»ƒn Ä‘á»•i Vehicle Entity:**

```typescript
// NGUá»’N: iot-vehicle-tracking-system-backup/backend/src/modules/vehicles/entities/vehicle.entity.ts
// Äá»ŒC FILE NÃ€Y VÃ€ CHUYá»‚N THÃ€NH SQL:

export const createVehicleEntityShape = () => ({
    id: 0,
    vehicleId: '',
    // ...
});
```

```sql
-- ÄÃCH: Tracking_PostgreSQL/init/02-vehicles.sql

CREATE TYPE vehicle_status AS ENUM ('active', 'inactive', 'maintenance', 'retired');
-- ... (nhÆ° cÅ©)

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
    image: victoriametrics/victoria-logs:v1.3.1-victorialogs
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

### Phase 2: Backend Core (Tuáº§n 2-3)

#### 2.1 Thá»© tá»± implement domains

| # | Domain | File tham kháº£o tá»« backup | Priority |
|---|--------|--------------------------|----------|
| 1 | `auth` | `modules/auth/auth.service.ts` | ðŸ”´ Critical |
| 2 | `vehicle` | `modules/vehicles/vehicles.service.ts` | ðŸ”´ Critical |
| 3 | `device` | `modules/devices/devices.service.ts` | ðŸ”´ Critical |
| 4 | `customer` | `modules/customers/customers.service.ts` | ðŸŸ¡ High |
| 5 | `trip` | `modules/trips/trips.service.ts` | ðŸŸ¡ High |
| 6 | `alert` | `modules/alerts/alerts.service.ts` | ðŸŸ¡ High |
| 7 | `violation` | `modules/violations/violations.service.ts` | ðŸŸ¢ Medium |
| 8 | `geofence` | `modules/geofences/geofences.service.ts` | ðŸŸ¢ Medium |
| 9 | `maintenance` | `modules/maintenance/maintenance.service.ts` | ðŸŸ¢ Medium |
| 10 | `dashboard` | `modules/dashboard/dashboard.service.ts` | ðŸŸ¢ Medium |
| 11 | `notification` | `modules/notifications/notifications.service.ts` | ðŸŸ¢ Medium |

#### 2.2 HÆ°á»›ng dáº«n chuyá»ƒn Ä‘á»•i Service

**Äá»c code cÅ©:**
```
iot-vehicle-tracking-system-backup/backend/src/modules/vehicles/vehicles.service.ts
```

**Chuyá»ƒn Ä‘á»•i patterns:**

| NestJS (cÅ©) | Express (má»›i) |
|-------------|---------------|
| `@Injectable()` | Plain class |
| `@InjectRepository(Vehicle)` | Constructor injection |
| `this.vehicleRepository.findOne()` | `pool.query()` |
| `class-validator` DTOs | Zod schemas |
| NestJS exceptions | Custom error classes |

**VÃ­ dá»¥ chuyá»ƒn Ä‘á»•i:**

```typescript
// CÅ¨: iot-vehicle-tracking-system-backup/backend/src/modules/vehicles/vehicles.service.ts
@Injectable()
export const createVehiclesService = (
    vehicleRepository: Repository<Vehicle>
) => {
    const create = async (createVehicleDto: CreateVehicleDto): Promise<Vehicle> => {
        const existing = await vehicleRepository.findOne({
            where: [
                { vehicleId: createVehicleDto.vehicleId },
                { plateNumber: createVehicleDto.plateNumber },
            ],
        });

        if (existing) {
            throw new ConflictException('Vehicle already exists');
        }

        const vehicle = vehicleRepository.create(createVehicleDto);
        return vehicleRepository.save(vehicle);
    };

    return { create };
};
```

```typescript
// Má»šI: Tracking_Backend/src/domain/vehicle/services/vehicle.service.ts
import { VehicleRepository } from '../repositories/vehicle.repository';
import { CreateVehicleInput } from '../types/vehicle.types';
import { ConflictError } from '../../../shared/errors';

export const createVehicleService = (vehicleRepo: VehicleRepository) => {
    const create = async (input: CreateVehicleInput) => {
        // THAM KHáº¢O LOGIC Tá»ª CODE CÅ¨
        const existing = await vehicleRepo.findByVehicleIdOrPlate(
            input.vehicleId,
            input.plateNumber
        );

        if (existing) {
            throw new ConflictError('Vehicle already exists');
        }

        return vehicleRepo.create(input);
    };

    return { create };
};
```

```typescript
// Má»šI: Tracking_Backend/src/domain/vehicle/repositories/vehicle.repository.ts
import { pool } from '../../../infrastructure/database/pool';
import { CreateVehicleInput, Vehicle } from '../types/vehicle.types';

export const createVehicleRepository = () => {
    const findByVehicleIdOrPlate = async (vehicleId: string, plateNumber?: string): Promise<Vehicle | null> => {
        const result = await pool.query(
            `SELECT * FROM vehicles
             WHERE vehicle_id = $1 OR ($2 IS NOT NULL AND plate_number = $2)
             LIMIT 1`,
            [vehicleId, plateNumber]
        );
        return result.rows[0] || null;
    };

    const create = async (input: CreateVehicleInput): Promise<Vehicle> => {
        const result = await pool.query(
            `INSERT INTO vehicles (vehicle_id, plate_number, brand, model, year, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [input.vehicleId, input.plateNumber, input.brand, input.model, input.year, 'active']
        );
        return result.rows[0];
    };

    return {
        findByVehicleIdOrPlate,
        create,
    };
};
```

---

### Phase 3: MQTT Bridge & Telemetry (Tuáº§n 4)

#### 3.1 MQTT Bridge (Má»šI HOÃ€N TOÃ€N)

Code cÅ© **KHÃ”NG CÃ“** MQTT implementation Ä‘Ãºng. Cáº§n viáº¿t má»›i 100%.

**Tham kháº£o:** `E:\anmh1205\IVM26\IVM26_Backend\backend_v1\src\mqtt-bridge\`

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

### Phase 4: Frontend Updates (Tuáº§n 5)

#### 4.1 Files cáº§n COPY tá»« backup

```bash
# UI Components (copy nguyÃªn)
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

#### 4.2 Files cáº§n VIáº¾T Láº I

| File | LÃ½ do |
|------|-------|
| `lib/api/client.ts` | API client má»›i cho Express backend |
| `types/*.ts` | Sync vá»›i backend types má»›i |
| `hooks/use-*.ts` | TanStack Query hooks má»›i |
| `lib/store/auth.store.ts` | Update auth flow |

#### 4.3 Files cáº§n REFACTOR

| File | Thay Ä‘á»•i |
|------|----------|
| `components/layout/app-sidebar.tsx` | Giá»¯ logic, update imports |
| `app/dashboard/*/page.tsx` | Giá»¯ UI, update API calls |

#### 4.4 Files cáº§n XÃ“A

```bash
# XÃ³a duplicate sidebars
rm iot-vehicle-tracking-system-backup/frontend/src/components/layout/sidebar.tsx
rm iot-vehicle-tracking-system-backup/frontend/src/components/layout/simple-sidebar.tsx
# Chá»‰ giá»¯ app-sidebar.tsx
```

---

### Phase 5: Real-time & Socket.IO (Tuáº§n 6)

**Tham kháº£o:**
- `iot-vehicle-tracking-system-backup/backend/src/gateway/realtime.gateway.ts`
- `E:\anmh1205\IVM26\IVM26_Backend\backend_v1\src\realtime\`

---

### Phase 6: Testing & Polish (Tuáº§n 7-8)

---

## 6. Checklist Tá»•ng Há»£p

### Phase 1: Setup âœ…
- [ ] Táº¡o cáº¥u trÃºc thÆ° má»¥c má»›i (FLAT structure)
- [ ] Copy UI components tá»« backup
- [ ] Copy icons tá»« backup
- [ ] Chuyá»ƒn Ä‘á»•i entities â†’ SQL migrations
- [ ] Táº¡o docker-compose.yml
- [ ] Táº¡o package.json cho Tracking_Backend, Tracking_MqttBridge, Tracking_Frontend
- [ ] Test `docker-compose up` cÃ¡c service háº¡ táº§ng

### Phase 2: Backend Core
- [ ] Implement infrastructure/database (pool, queries)
- [ ] Implement middleware (auth, cors, rate-limit, security)
- [ ] Implement domain/auth (THAM KHáº¢O: `backup/modules/auth/auth.service.ts`)
- [ ] Implement domain/vehicle (THAM KHáº¢O: `backup/modules/vehicles/vehicles.service.ts`)
- [ ] Implement domain/device (THAM KHáº¢O: `backup/modules/devices/devices.service.ts`)
- [ ] Implement domain/customer
- [ ] Implement domain/trip
- [ ] Implement domain/alert
- [ ] Implement domain/violation
- [ ] Implement domain/geofence
- [ ] Implement domain/maintenance
- [ ] Implement domain/dashboard
- [ ] Setup API routes
- [ ] Test endpoints vá»›i Postman

### Phase 3: MQTT Bridge & Telemetry
- [ ] Implement mqtt-bridge/mqtt.client.ts
- [ ] Implement handlers/telemetry.handler.ts
- [ ] Implement infrastructure/victoriametrics
- [ ] Implement infrastructure/victorialogs
- [ ] Test MQTT â†’ VictoriaMetrics pipeline

### Phase 4: Frontend Updates
- [ ] Viáº¿t láº¡i lib/api/client.ts
- [ ] Viáº¿t láº¡i types/ (sync vá»›i backend)
- [ ] Viáº¿t láº¡i hooks/
- [ ] Refactor layout/app-sidebar.tsx
- [ ] XÃ³a duplicate sidebars
- [ ] Update táº¥t cáº£ pages

### Phase 5: Real-time & Socket.IO
- [ ] Implement backend/realtime/socket-server.ts
- [ ] Implement backend/realtime/event-bus.ts
- [ ] Viáº¿t hooks/use-realtime.ts
- [ ] Test real-time updates

### Phase 6: Testing & Polish
- [ ] Unit tests (target 80%)
- [ ] E2E tests vá»›i Playwright
- [ ] Security audit
- [ ] Documentation

---

## 7. Quick Reference

### ÄÆ°á»ng dáº«n quan trá»ng

| Má»¥c Ä‘Ã­ch | ÄÆ°á»ng dáº«n |
|----------|-----------|
| Code cÅ© (tham kháº£o) | `E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-backup\` |
| Project Root | `E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\` |
| Project Backend | `E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\Tracking_Backend\` |
| Project Frontend | `E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\Tracking_Frontend\` |
| Project MQTT Bridge | `E:\anmh1205\IoT_Vehicle_Tracking_System\IoT_Vehicle_Tracking_System\Tracking_MqttBridge\` |
| IVM26 Reference | `E:\anmh1205\IVM26\` |
| System Design | `E:\anmh1205\IoT_Vehicle_Tracking_System\SystemDesign\` |
| Coding Plan | `SystemDesign\coding-plan\` |

### Files quan trá»ng tá»« backup cáº§n Ä‘á»c

| File | Ná»™i dung cáº§n láº¥y |
|------|------------------|
| `backup/backend/src/modules/auth/auth.service.ts` | JWT logic, password hashing |
| `backup/backend/src/modules/vehicles/vehicles.service.ts` | CRUD, pagination, search |
| `backup/backend/src/modules/*/entities/*.entity.ts` | Database schema |
| `backup/backend/src/modules/*/dto/*.dto.ts` | Validation rules |
| `backup/frontend/src/components/ui/*` | UI components (copy nguyÃªn) |

### Tech Stack má»›i

| Layer | Technology |
|-------|------------|
| Backend | Express + TypeScript + Zod |
| Database | PostgreSQL (pg) + VictoriaMetrics + VictoriaLogs |
| MQTT | mqtt 5.x (standalone bridge) |
| Real-time | Socket.IO 4.x |
| Frontend | Next.js 16 + React 19 + Tailwind 4 |
| Testing | Vitest (backend) + Playwright (E2E) |

---

## âš ï¸ Frontend Implementation Rules (Báº®T BUá»˜C)

> **ThÃªm 2026-02-10** â€” Sau khi audit frontend, phÃ¡t hiá»‡n agents khÃ´ng tuÃ¢n thá»§ template IVM26. CÃ¡c rules sau lÃ  Báº®T BUá»˜C.

### Rule F1: IVM26 Template Compliance
- Frontend PHáº¢I follow UI pattern tá»« IVM26 reference (`next-shadcn-dashboard-starter`)
- Reference path: `E:\anmh1205\IVM26\` hoáº·c backup: `iot-vehicle-tracking-system-backup/frontend/`
- Layout: `SidebarProvider` + `AppSidebar` + `SidebarInset` (shadcn/ui sidebar)
- Page wrapper: `PageContainer` vá»›i `ScrollArea`, `pageTitle`, `pageDescription`
- Header: `SiteHeader` vá»›i `SidebarTrigger` + `Breadcrumbs` + `ThemeToggle` + `UserNav`

### Rule F2: shadcn/ui Component Mandate
- DÃ¹ng shadcn/ui components EXCLUSIVELY â€” KHÃ”NG hand-roll:
  - âŒ Custom Dropdown â†’ âœ… `Select` hoáº·c `DropdownMenu` tá»« shadcn/ui
  - âŒ Custom Pagination â†’ âœ… `DataTable` vá»›i built-in pagination
  - âŒ Custom Modal â†’ âœ… `Dialog` hoáº·c `Sheet` tá»« shadcn/ui
  - âŒ Custom Skeleton â†’ âœ… `Skeleton` tá»« shadcn/ui
  - âŒ Custom Table â†’ âœ… `DataTable` wrapper (TanStack Table + shadcn/ui Table)
- Forms: `react-hook-form` + `zod` + shadcn/ui `Form` component

### Rule F3: Zero Placeholder Policy
- TUYá»†T Äá»I KHÃ”NG Ä‘Æ°á»£c viáº¿t trong code:
  - "Coming Soon" / "Sáº¯p ra máº¯t"
  - "future update" / "cáº­p nháº­t trong tÆ°Æ¡ng lai"
  - "will be available" / "sáº½ cÃ³ trong phiÃªn báº£n sau"
  - "TODO" / "FIXME" (trong production code)
  - Dashed-border empty state thay cho real functionality
- Náº¿u API chÆ°a cÃ³ â†’ váº«n PHáº¢I build Ä‘áº§y Ä‘á»§ UI + API service + hook, ghi chÃº vÃ o `.tracking/`

### Rule F4: Complete Feature Specification
- Má»—i feature trong plan PHáº¢I cÃ³:
  1. Exact component tree (khÃ´ng mÃ´ táº£ trá»«u tÆ°á»£ng)
  2. Exact DataTable columns (tÃªn cá»™t, field, sortable, render)
  3. Exact form fields (tÃªn, type, validation rule, required)
  4. Exact API hooks (query key, endpoint, mutations)
  5. Exact Zod schema
  6. Exact error/loading/empty states

