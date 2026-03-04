# Naming Convention

> "If you can derive the folder name from the prefix, the convention is working."

---

## 1. The {Prefix}_ Pattern

Every IoT project starts with a **prefix** -- a short, unique identifier that namespaces all services, folders, and Docker resources.

### Prefix Selection Decision Tree

```
Choosing a prefix:
│
├── Is it short? (3-12 chars)
│   ├── YES → Continue
│   └── NO → Shorten it
│       └── "VehicleTracking" → "Tracking"
│       └── "IndustrialVibrationMonitoring26" → "IVM26"
│
├── Is it unique within the org?
│   ├── YES → Continue
│   └── NO → Add version/qualifier
│       └── "Tracking" → "Tracking2" or "FleetTrack"
│
├── Is it descriptive?
│   ├── YES → Use it
│   └── NO → Reconsider
│       └── "App1" → bad. "SmartHome" → good.
│
└── Final format: PascalCase, no spaces, no special chars
    └── "Tracking", "IVM26", "SmartHome", "AquaMonitor"
```

### Proven Prefixes (Real Projects)

| Project | Prefix | Rationale |
|---------|--------|-----------|
| IoT Vehicle Tracking System | `Tracking` | Short, describes the core action |
| Industrial Vibration Monitoring | `IVM26` | Acronym + version, team-internal |
| Smart Agriculture Monitor | `AgriMon` | Domain + function |

---

## 2. Service Naming Rules

### Application Services

```
{Prefix}_Backend          # API server (Express, Fastify, FastAPI)
{Prefix}_Frontend         # Web app (Next.js, React)
{Prefix}_Mobile           # Mobile app (Flutter, React Native)
{Prefix}_MqttBridge       # MQTT-to-backend bridge service
{Prefix}_Worker           # Background job processor (if needed)
{Prefix}_Gateway          # API gateway (if needed)
```

### Infrastructure Services

```
{Prefix}_PostgreSQL       # Relational database
{Prefix}_EMQX             # MQTT broker
{Prefix}_VictoriaMetrics  # Time-series database
{Prefix}_VictoriaLogs     # Log storage
{Prefix}_Grafana          # Monitoring dashboards
{Prefix}_NPM              # Nginx Proxy Manager (reverse proxy)
{Prefix}_Redis            # Cache / session store (if needed)
```

### Data and Config

```
{Prefix}_Data/            # Runtime persistent data (gitignored)
shared-types/             # Shared TypeScript types (NO prefix)
SystemDesign/             # Documentation (NO prefix)
```

---

## 3. Docker Naming

### Network

```
{prefix}-network          # lowercase, hyphenated
│
├── Tracking   → tracking-network
├── IVM26      → ivm26-network
└── SmartHome  → smarthome-network
```

### Container Names

```
{prefix}-{service}        # lowercase, hyphenated
│
├── tracking-backend
├── tracking-frontend
├── tracking-postgresql
└── tracking-emqx
```

### Volume Names

```
{prefix}-{service}-data   # lowercase, hyphenated, suffixed
│
├── tracking-postgresql-data
├── tracking-victoriametrics-data
└── tracking-emqx-data
```

---

## 4. Database Naming

| Element | Convention | Example |
|---------|------------|---------|
| Database name | snake_case, descriptive | `vehicle_tracking` |
| Tables | snake_case, plural | `vehicles`, `alert_rules` |
| Columns | snake_case | `created_at`, `device_id` |
| Indexes | `idx_{table}_{columns}` | `idx_vehicles_customer_id` |
| Foreign keys | `fk_{table}_{ref_table}` | `fk_vehicles_customers` |

---

## 5. Environment Variables

```
{SERVICE}_HOST             # POSTGRESQL_HOST, EMQX_HOST
{SERVICE}_PORT             # POSTGRESQL_PORT, EMQX_PORT
{SERVICE}_URL              # VICTORIAMETRICS_URL, VICTORIALOGS_URL
{SERVICE}_USER             # POSTGRESQL_USER
{SERVICE}_PASSWORD         # POSTGRESQL_PASSWORD
```

### Decision: When to Use URL vs HOST+PORT

```
Service connection:
│
├── Single endpoint (HTTP API)
│   └── Use {SERVICE}_URL
│       └── VICTORIAMETRICS_URL=http://localhost:8428
│
└── Multi-parameter connection (database, broker)
    └── Use {SERVICE}_HOST + {SERVICE}_PORT + credentials
        └── POSTGRESQL_HOST=localhost
        └── POSTGRESQL_PORT=5432
        └── POSTGRESQL_USER=postgres
        └── POSTGRESQL_PASSWORD=secret
```

---

## 6. MQTT Topic Naming

```
{prefix}/devices/{device_id}/telemetry    # Device → Broker
{prefix}/devices/{device_id}/command      # Broker → Device
{prefix}/devices/{device_id}/status       # Online/offline
{prefix}/devices/{device_id}/ota          # Firmware updates

Examples:
├── tracking/devices/DEV001/telemetry
├── ivm26/devices/SENSOR_A1/telemetry
└── smarthome/devices/LIGHT_01/command
```

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| `src/services/backend/` | Nested, not isolated | `{Prefix}_Backend/` at root |
| `docker-compose.yml` at root only | Monolithic, hard to scale | Per-service `docker-compose.yml` |
| `my-app-db` for container name | No convention | `{prefix}-postgresql` |
| `DB_HOST` as env var | Ambiguous which DB | `POSTGRESQL_HOST` |
| Random folder names | Unpredictable | Derive from prefix |
| `CamelCase` Docker network | Docker convention violation | `lowercase-hyphenated` |

---

> **Rule:** If someone reads the folder listing, they should immediately know the project prefix, every service, and what each service does -- without opening a single file.
