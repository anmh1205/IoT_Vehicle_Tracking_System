# Domain Modeling

> "Domains come from business entities, not from technical layers. If your folder is named `controllers/`, you are organizing by layer. If it is named `vehicle/`, you are organizing by domain."

---

## 1. From Business Requirements to Domains

### The Process

```
Step 1: List business entities
│   "We track vehicles with GPS, manage drivers, set geofences, trigger alerts"
│
Step 2: Cluster related entities
│   ├── Vehicle + VehicleType + VehicleAssignment → vehicle domain
│   ├── Driver + DriverLicense + DriverAssignment → driver domain
│   ├── Geofence + GeofenceRule → geofence domain
│   ├── Alert + AlertRule + AlertHistory → alert domain
│   └── GPSReading + OBD2Reading + Telemetry → iot domain
│
Step 3: Map to folder structure
│   src/domain/
│   ├── vehicle/
│   ├── driver/
│   ├── geofence/
│   ├── alert/
│   └── iot/
│
Step 4: Define each domain's internals
    src/domain/vehicle/
    ├── services/         # Business logic
    ├── repositories/     # Data access
    └── types/            # Domain-specific types
```

---

## 2. Core Domains (Present in Every IoT Project)

These domains exist regardless of what you are monitoring or tracking.

| Domain | Responsibility | Entities |
|--------|---------------|----------|
| **auth** | Authentication, sessions, permissions | User, Session, Role |
| **device** | Device registration, status, lifecycle | Device, DeviceType, DeviceConfig |
| **iot** | Telemetry ingestion, real-time data | TelemetryPayload, SensorReading |
| **firmware** | OTA updates, version management | Firmware, FirmwareVersion, DeployJob |
| **dashboard** | Aggregated stats, system overview | DashboardStats, SystemHealth |

### Why These Are Universal

```
Every IoT system needs:
├── auth      → Someone logs in to manage the system
├── device    → Physical devices are registered and tracked
├── iot       → Devices send data that must be ingested
├── firmware  → Devices need software updates
└── dashboard → Operators need a system overview
```

---

## 3. Domain-Specific Domains (Vary Per Project)

These emerge from the specific business problem.

### Vehicle Tracking Project

| Domain | Responsibility |
|--------|---------------|
| `vehicle` | Vehicle CRUD, types, assignments |
| `driver` | Driver management, license tracking |
| `trip` | Trip recording, route history |
| `geofence` | Geographic boundaries, entry/exit events |
| `alert` | Alert rules, notifications, history |
| `fuel-analytics` | Fuel consumption analysis |
| `export` | Data export (CSV, PDF reports) |
| `customer` | Multi-tenant customer management |

### Industrial Vibration Monitoring (IVM26)

| Domain | Responsibility |
|--------|---------------|
| `machine` | Machine registration, types |
| `sensor` | Sensor placement, calibration |
| `vibration` | Vibration data analysis, FFT |
| `alert` | Threshold alerts, anomaly detection |
| `maintenance` | Maintenance schedules, work orders |
| `report` | Analysis reports, trend charts |

### Smart Agriculture

| Domain | Responsibility |
|--------|---------------|
| `field` | Field/plot management |
| `crop` | Crop types, growth stages |
| `irrigation` | Irrigation control, scheduling |
| `weather` | Weather data integration |
| `alert` | Soil moisture, temperature alerts |
| `harvest` | Harvest tracking, yield analysis |

---

## 4. Decision Trees

### When to Create a New Domain

```
You have a new feature requirement:
│
├── Does it introduce a new business entity?
│   ├── YES → Does this entity have its own CRUD?
│   │   ├── YES → New domain
│   │   │   └── "Driver management" → driver/ domain
│   │   └── NO → Does it have complex business logic?
│   │       ├── YES → New domain
│   │       │   └── "Fuel analytics" → fuel-analytics/ domain
│   │       └── NO → Add to closest existing domain
│   │           └── "Vehicle color" → vehicle/ domain
│   └── NO → It operates on existing entities
│       ├── Is the logic complex enough to warrant separation?
│       │   ├── YES → New domain
│       │   │   └── "Export system" → export/ domain
│       │   └── NO → Add to existing domain
│       │       └── "Format vehicle name" → vehicle/ domain
│       └── Does it cross multiple domains?
│           ├── YES → New domain (orchestrator)
│           │   └── "Dashboard stats" → dashboard/ domain
│           └── NO → Add to the single domain it belongs to
```

### Which Domains Does a Feature Touch?

```
Feature: "Alert when vehicle exits geofence"
│
├── Who defines the boundary?
│   └── geofence domain (GeofenceRule)
│
├── Who detects the exit?
│   └── iot domain (processes telemetry, checks position)
│
├── Who creates the alert?
│   └── alert domain (AlertRule, AlertHistory)
│
├── Who notifies the user?
│   └── alert domain (notification service)
│
└── Result: 3 domains collaborate
    ├── geofence → provides boundary data
    ├── iot → detects position vs boundary
    └── alert → triggers and records alert
```

---

## 5. Domain Internal Structure

### Standard Domain Layout

```
src/domain/{domain-name}/
├── services/              # Business logic (the core)
│   ├── {domain}-crud.service.ts      # CRUD operations
│   ├── {domain}-query.service.ts     # Complex queries
│   └── {domain}-{action}.service.ts  # Specific business actions
│
├── repositories/          # Data access layer
│   └── {domain}.repository.ts        # SQL queries, ORM calls
│
└── types/                 # Domain-specific types
    └── {domain}.types.ts              # Interfaces, enums
```

### Service Layer Rules

| Rule | Description |
|------|-------------|
| **One service per concern** | `vehicle-crud.service.ts` not `vehicle.service.ts` with 500 lines |
| **Services call repositories** | Never write SQL in a service |
| **Services call other services** | Cross-domain communication via service imports |
| **No HTTP in services** | Services are framework-agnostic |

### Repository Layer Rules

| Rule | Description |
|------|-------------|
| **One repository per domain** | Unless the domain has multiple data sources |
| **Raw SQL or ORM** | Consistent within the project |
| **Return domain types** | Not database row types |
| **No business logic** | Only data access |

---

## 6. Domain Communication

### How Domains Talk to Each Other

```
Direct import (simple, synchronous):
│
├── alert.service imports geofence.service
│   └── To check if position is inside a geofence
│
├── dashboard.service imports vehicle.service
│   └── To count active vehicles
│
└── When to use: Same process, synchronous logic

Event-based (decoupled, asynchronous):
│
├── iot.service emits "telemetry.received"
│   └── alert.service listens and checks thresholds
│
├── device.service emits "device.offline"
│   └── alert.service creates offline alert
│
└── When to use: Decoupled reactions, multiple listeners
```

### Decision: Import vs Event

```
Does domain A need a response from domain B?
│
├── YES → Direct import
│   └── dashboard needs vehicle count → import vehicle.service
│
└── NO → Event-based
    └── telemetry arrived, alert might trigger → emit event
```

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| `src/controllers/`, `src/models/`, `src/services/` | Technical layers, not domains | `src/domain/{name}/services/` |
| God domain with everything | No separation of concerns | Split by business entity |
| `utils/` domain | Not a business concept | Put utilities in the domain that uses them |
| Circular domain imports | Architecture smell | Introduce event-based communication |
| Domain knows about HTTP | Leaky abstraction | Keep services framework-agnostic |
| One service file per domain | Grows to 1000+ lines | Split by concern: crud, query, action |

---

> **Rule:** If you cannot describe a domain without using technical words (controller, model, middleware), it is not a real domain. Domains speak the language of the business.
