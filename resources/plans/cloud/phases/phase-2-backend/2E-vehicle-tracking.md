# Sub-Phase 2E: Vehicle Tracking Core

> **Context:** ~5KB | **Max Files:** 20 | **Est. Time:** 2 sessions

## Summary
Implement Vehicle Tracking domains: Vehicle management, Customer management, Trip tracking, Alert system, Geofence management, và Maintenance scheduling.

## Tasks
| ID     | Description                     | Files                                                                |
| ------ | ------------------------------- | -------------------------------------------------------------------- |
| BE-040 | Vehicle controller + routes     | `api/controllers/vehicle.controller.ts`, `vehicle.routes.ts`         |
| BE-041 | Vehicle services                | `domain/vehicle/services/*.service.ts`                               |
| BE-042 | Customer controller + routes    | `api/controllers/customer.controller.ts`, `customer.routes.ts`       |
| BE-043 | Customer services               | `domain/customer/services/*.service.ts`                              |
| BE-044 | Trip controller + routes        | `api/controllers/trip.controller.ts`, `trip.routes.ts`               |
| BE-045 | Trip services                   | `domain/trip/services/*.service.ts`                                  |
| BE-046 | Alert controller + routes       | `api/controllers/alert.controller.ts`, `alert.routes.ts`             |
| BE-047 | Alert services                  | `domain/alert/services/*.service.ts`                                 |
| BE-048 | Geofence controller + routes    | `api/controllers/geofence.controller.ts`, `geofence.routes.ts`       |
| BE-049 | Geofence services               | `domain/geofence/services/*.service.ts`                              |
| BE-050 | Maintenance controller + routes | `api/controllers/maintenance.controller.ts`, `maintenance.routes.ts` |
| BE-051 | Maintenance services            | `domain/maintenance/services/*.service.ts`                           |

## DB Schema (từ Phase 1A)
```sql
-- Vehicle Tracking Tables:
vehicles (id, vehicle_id, plate_number, device_id, customer_id, status, ...)
customers (id, customer_code, name, email, phone, status, ...)
trips (id, trip_code, vehicle_id, device_id, driver_name, status, coordinates, ...)
alerts (id, vehicle_id, device_id, alert_type, severity, status, ...)
geofences (id, name, geofence_type, coordinates, trigger_on, ...)
geofence_vehicles (geofence_id, vehicle_id)
maintenance (id, vehicle_id, maintenance_type, scheduled_date, status, ...)
```

## Vehicle API Contract
| Endpoint                       | Method | Response                          |
| ------------------------------ | ------ | --------------------------------- |
| `GET /api/v1/vehicles`         | GET    | `{ data: Vehicle[], pagination }` |
| `POST /api/v1/vehicles`        | POST   | `{ data: Vehicle }`               |
| `GET /api/v1/vehicles/:id`     | GET    | `{ data: VehicleDetail }`         |
| `PUT /api/v1/vehicles/:id`     | PUT    | `{ data: Vehicle }`               |
| `DELETE /api/v1/vehicles/:id`  | DELETE | `{ success: true }`               |
| `POST /api/v1/vehicles/import` | POST   | `{ imported, failed, errors }`    |

## Customer API Contract
| Endpoint                       | Method | Response                           |
| ------------------------------ | ------ | ---------------------------------- |
| `GET /api/v1/customers`        | GET    | `{ data: Customer[], pagination }` |
| `POST /api/v1/customers`       | POST   | `{ data: Customer }`               |
| `GET /api/v1/customers/:id`    | GET    | `{ data: CustomerDetail }`         |
| `PUT /api/v1/customers/:id`    | PUT    | `{ data: Customer }`               |
| `DELETE /api/v1/customers/:id` | DELETE | `{ success: true }`                |

## Trip API Contract
| Endpoint                          | Method | Response                         |
| --------------------------------- | ------ | -------------------------------- |
| `GET /api/v1/trips`               | GET    | `{ data: Trip[], pagination }`   |
| `POST /api/v1/trips`              | POST   | `{ data: Trip }`                 |
| `GET /api/v1/trips/:id`           | GET    | `{ data: TripDetail }`           |
| `GET /api/v1/trips/:id/telemetry` | GET    | `{ tripId, points[], events[] }` |
| `PUT /api/v1/trips/:id/start`     | PUT    | Start trip                       |
| `PUT /api/v1/trips/:id/end`       | PUT    | End trip                         |

## Alert API Contract
| Endpoint                             | Method | Response                        |
| ------------------------------------ | ------ | ------------------------------- |
| `GET /api/v1/alerts`                 | GET    | `{ data: Alert[], pagination }` |
| `GET /api/v1/alerts/:id`             | GET    | `{ data: AlertDetail }`         |
| `PUT /api/v1/alerts/:id/acknowledge` | PUT    | Acknowledge alert               |
| `PUT /api/v1/alerts/:id/resolve`     | PUT    | Resolve alert                   |

## Geofence API Contract
| Endpoint                              | Method | Response                           |
| ------------------------------------- | ------ | ---------------------------------- |
| `GET /api/v1/geofences`               | GET    | `{ data: Geofence[], pagination }` |
| `POST /api/v1/geofences`              | POST   | `{ data: Geofence }`               |
| `PUT /api/v1/geofences/:id`           | PUT    | `{ data: Geofence }`               |
| `DELETE /api/v1/geofences/:id`        | DELETE | `{ success: true }`                |
| `POST /api/v1/geofences/:id/vehicles` | POST   | Assign vehicles                    |

## Response Types (cho Frontend)
```typescript
interface Vehicle {
  id: number;
  vehicleId: string;
  plateNumber: string;
  deviceId: string | null;
  customerId: number | null;
  vehicleType: string;
  brand: string;
  model: string;
  status: 'active' | 'inactive' | 'maintenance' | 'retired';
  iconType: string;
  colorHex: string;
  lastLocation?: { lat: number; lon: number; ts: string } | null;
}

interface Alert {
  id: number;
  vehicleId: string;
  deviceId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  title: string;
  message: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

interface Geofence {
  id: number;
  name: string;
  geofenceType: 'circle' | 'polygon' | 'rectangle';
  centerLatitude?: number;
  centerLongitude?: number;
  radiusMeters?: number;
  coordinates?: { lat: number; lng: number }[] | null;
  triggerOn: 'enter' | 'exit' | 'both';
  isActive: boolean;
  color: string;
}
```

## Dependencies
- ✅ Phase 1 done (DB vehicle tracking tables)
- ✅ Phase 2A-2D done (base backend infrastructure)
- ➡️ Phase 4-5 (Frontend) sẽ dùng APIs này

## Verification
- [ ] `npx tsc --noEmit 2>&1 | head -20` — no errors
- [ ] CRUD operations work for all domains
- [ ] Relationships maintained (vehicle → device, customer)
- [ ] Alert lifecycle: active → acknowledged → resolved

## Full Spec Reference
- [20-backend-architecture.md#vehicle-tracking](./../../20-backend-architecture.md) — Vehicle domains
- [10-database-postgresql.md#section-8](./../../10-database-postgresql.md) — Vehicle tables
