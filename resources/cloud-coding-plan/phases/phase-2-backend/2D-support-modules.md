# Sub-Phase 2D: Support Modules

> **Context:** ~4KB | **Max Files:** 12 | **Est. Time:** 1 session

## Summary
Implement support modules: Dashboard stats, Firmware management, Export jobs, và System admin APIs.

## Tasks
| ID     | Description                   | Files                                                            |
| ------ | ----------------------------- | ---------------------------------------------------------------- |
| BE-030 | Dashboard controller + routes | `api/controllers/dashboard.controller.ts`, `dashboard.routes.ts` |
| BE-031 | Dashboard stats service       | `domain/dashboard/services/dashboard-stats.service.ts`           |
| BE-032 | Activity log service          | `domain/dashboard/services/activity-log.service.ts`              |
| BE-033 | Firmware controller + routes  | `api/controllers/firmware.controller.ts`, `firmware.routes.ts`   |
| BE-034 | Firmware services             | `domain/firmware/services/*.service.ts`                          |
| BE-035 | Export controller + routes    | `api/controllers/export.controller.ts`, `export.routes.ts`       |
| BE-036 | Export services               | `domain/export/services/*.service.ts`                            |
| BE-037 | System admin controller       | `api/controllers/system-admin.controller.ts`                     |
| BE-038 | Audit service + repository    | `domain/audit/services/audit.service.ts`                         |
| BE-039 | Driver controller + routes    | `api/controllers/driver.controller.ts`, `driver.routes.ts`       |
| BE-040 | Driver services (CRUD+List)   | `domain/driver/services/driver-crud.service.ts`, `driver-list.service.ts` |
| BE-041 | Driver repository + types     | `domain/driver/repositories/driver.repository.ts`, `types/driver.types.ts` |
| BE-042 | Fuel analytics controller     | `api/controllers/fuel-analytics.controller.ts`, `fuel-analytics.routes.ts` |
| BE-043 | Fuel analytics service+repo   | `domain/fuel-analytics/services/*.ts`, `repositories/*.ts`       |
| BE-044 | Validation error domain       | `domain/validation-error/services/*.ts`, `repositories/*.ts`     |
| BE-045 | Validation error API          | `api/controllers/validation-error.controller.ts`, `routes/*.ts`  |
| BE-046 | Swagger OpenAPI spec          | `api/openapi/spec.ts` (OpenAPI 3.0.3, ~90 endpoints, 19 tags)   |
| BE-047 | ExcelJS export service        | `domain/export/services/export-file.service.ts`                  |
| BE-048 | WebSocket/Realtime server     | `infrastructure/realtime/*.ts` (6 files, Event Bus pattern)      |
| BE-049 | publishEvent wiring           | Modify: `iot-ingestion`, `alert-crud`, `firmware-deploy`         |
| BE-050 | Docker per-service            | `Dockerfile`, `docker-compose.yml`, `.dockerignore` per service  |

## Dashboard API Contract
| Endpoint                         | Method | Response                                                |
| -------------------------------- | ------ | ------------------------------------------------------- |
| `GET /api/v1/dashboard/stats`    | GET    | `{ totalDevices, activeDevices, totalRuntime, alerts }` |
| `GET /api/v1/dashboard/activity` | GET    | `{ events: Event[], pagination }`                       |
| `GET /api/v1/dashboard/alerts`   | GET    | `{ alerts: Alert[], pagination }`                       |

## Firmware API Contract
| Endpoint                            | Method | Description                     |
| ----------------------------------- | ------ | ------------------------------- |
| `GET /api/v1/firmware`              | GET    | List firmware versions          |
| `POST /api/v1/firmware`             | POST   | Upload new firmware (multipart) |
| `GET /api/v1/firmware/:id`          | GET    | Firmware details                |
| `DELETE /api/v1/firmware/:id`       | DELETE | Delete firmware                 |
| `PUT /api/v1/firmware/:id/activate` | PUT    | Activate/deactivate             |
| `POST /api/v1/firmware/:id/assign`  | POST   | Assign to devices               |

## Export API Contract
| Endpoint                           | Method | Description       |
| ---------------------------------- | ------ | ----------------- |
| `GET /api/v1/exports`              | GET    | List export jobs  |
| `POST /api/v1/exports`             | POST   | Create export job |
| `GET /api/v1/exports/:id`          | GET    | Job status        |
| `GET /api/v1/exports/:id/download` | GET    | Download file     |

## System Admin API Contract (Admin Only)
| Endpoint                                | Method | Description           |
| --------------------------------------- | ------ | --------------------- |
| `GET /api/v1/system-admin/metrics`      | GET    | VictoriaMetrics query |
| `GET /api/v1/system-admin/logs`         | GET    | VictoriaLogs query    |
| `GET /api/v1/system-admin/audit/:table` | GET    | Query audit tables    |
| `GET /api/v1/system-admin/health`       | GET    | System health check   |

## Dashboard Response Types
```typescript
interface DashboardStats {
  totalDevices: number;
  activeDevices: number;       // current_status = 'running'
  offlineDevices: number;      // current_status = 'disconnected'
  totalRuntimeToday: number;   // seconds
  totalRuntimeWeek: number;
  alertsCount: number;
}

interface ActivityEvent {
  id: number;
  eventType: string;
  deviceId: string;
  message: string;
  severity: string;
  timestamp: string;
}
```

## Dependencies
- ✅ Phase 2A-2C done (auth, device, IoT modules)
- ➡️ Phase 4 (Frontend) sẽ dùng APIs này

## Verification
- [ ] Dashboard stats: `GET /api/v1/dashboard/stats` returns stats
- [ ] Firmware upload: multipart upload works
- [ ] Export job: async job creation + progress tracking
- [ ] Admin routes: 403 for non-admin users

## Full Spec Reference
- [20-backend-architecture.md#section-3.4-3.5](./../../20-backend-architecture.md) — Dashboard, Firmware domains
