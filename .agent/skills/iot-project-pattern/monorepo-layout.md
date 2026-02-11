# Monorepo Layout

> "Flat at root, isolated per service. If you need `cd ../../..` to find a service, the structure is wrong."

---

## 1. The Flat Monorepo Principle

Every service lives at the **root level** of the repository. No nesting. No `src/services/` wrapper. Each service is a self-contained unit with its own package.json, Dockerfile, and docker-compose.yml.

### Correct Layout

```
IoT_Project_Root/              # Git root
│
├── {Prefix}_Backend/          # API server
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── docker-compose.uat.yml
│   └── .env.example
│
├── {Prefix}_Frontend/         # Web application
│   ├── src/
│   ├── package.json
│   ├── next.config.ts
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .env.example
│
├── {Prefix}_MqttBridge/       # MQTT bridge service
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── {Prefix}_PostgreSQL/       # Database
│   ├── init/                  # SQL init scripts
│   ├── docker-compose.yml
│   └── .env.example
│
├── {Prefix}_EMQX/             # MQTT broker
│   ├── etc/                   # Broker config
│   └── docker-compose.yml
│
├── {Prefix}_VictoriaMetrics/  # Time-series DB
│   └── docker-compose.yml
│
├── {Prefix}_VictoriaLogs/     # Log storage
│   └── docker-compose.yml
│
├── {Prefix}_Grafana/          # Monitoring
│   ├── dashboards/
│   └── docker-compose.yml
│
├── {Prefix}_NPM/              # Reverse proxy
│   └── docker-compose.yml
│
├── {Prefix}_Data/             # Runtime data (gitignored)
│
├── shared-types/              # Shared TypeScript types
│   ├── src/
│   └── tsconfig.json
│
├── SystemDesign/              # Documentation
│   └── coding-plan/
│
├── CLAUDE.md                  # AI agent instructions
├── .gitignore
└── README.md
```

---

## 2. Per-Service Isolation

### What Each Service Owns

| Resource | Location | Shared? |
|----------|----------|---------|
| Source code | `{Prefix}_Service/src/` | NO |
| Dependencies | `{Prefix}_Service/package.json` | NO |
| TypeScript config | `{Prefix}_Service/tsconfig.json` | NO (can extend shared) |
| Docker build | `{Prefix}_Service/Dockerfile` | NO |
| Docker compose | `{Prefix}_Service/docker-compose.yml` | NO |
| Environment | `{Prefix}_Service/.env` | NO |
| Tests | `{Prefix}_Service/src/**/*.test.ts` | NO |

### What Is Shared

| Resource | Location | How |
|----------|----------|-----|
| TypeScript types | `shared-types/` | tsconfig paths alias |
| Docker network | `{prefix}-network` | External network |
| Documentation | `SystemDesign/` | Reference only |
| AI instructions | `CLAUDE.md` | Read-only context |

---

## 3. shared-types/ Strategy

### Decision Tree: How to Share Types

```
Do multiple services need the same TypeScript types?
│
├── YES → How many services?
│   │
│   ├── 2 services (e.g., Backend + Frontend)
│   │   └── shared-types/ with tsconfig paths
│   │       └── Simple, no build step, no npm publish
│   │
│   ├── 3+ services
│   │   └── shared-types/ with tsconfig paths
│   │       └── Still simple, still no npm publish
│   │
│   └── External consumers (other repos)?
│       └── npm workspace or publishable package
│           └── Only when truly needed
│
└── NO → Keep types local to each service
    └── Duplication is OK for 1-2 types
```

### tsconfig Paths Setup

```
# In {Prefix}_Backend/tsconfig.json:
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared-types/src/*"]
    }
  }
}

# In {Prefix}_Frontend/tsconfig.json:
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared-types/src/*"]
    }
  }
}
```

### What Goes in shared-types/

```
shared-types/src/
├── device.types.ts        # Device, DeviceStatus
├── telemetry.types.ts     # TelemetryPayload, GPSData
├── mqtt.types.ts          # Topic names, message formats
├── api.types.ts           # Shared API response envelope
└── index.ts               # Barrel export
```

### What Does NOT Go in shared-types/

| Belongs In | NOT In shared-types/ |
|------------|---------------------|
| Backend service layer types | `{Prefix}_Backend/src/domain/` |
| Frontend component props | `{Prefix}_Frontend/src/features/` |
| Database row types | `{Prefix}_Backend/src/domain/` |
| React hook return types | `{Prefix}_Frontend/src/hooks/` |

---

## 4. Docker Network Strategy

### External Network Pattern

```
# Create once (manually or in bootstrap script):
docker network create {prefix}-network

# Each docker-compose.yml references it:
networks:
  {prefix}-network:
    external: true
```

### Why External Network?

```
External network:
├── Services can start/stop independently
├── No dependency on a "master" compose file
├── Services discover each other by container name
└── Survives individual service restarts

Internal network (default):
├── Tied to one docker-compose lifecycle
├── All services must be in same compose file
└── NOT what we want for per-service isolation
```

---

## 5. Docker Compose Variants

### Per-Service Compose Files

```
{Prefix}_Backend/
├── docker-compose.yml         # Development (hot-reload, debug ports)
└── docker-compose.uat.yml     # UAT/staging (production-like)
```

### Decision: When to Add docker-compose.uat.yml

```
Does this service deploy to UAT/staging?
│
├── YES (application services)
│   └── Create docker-compose.uat.yml
│       └── Backend, Frontend, MqttBridge
│
└── NO (infrastructure, same in all envs)
    └── Single docker-compose.yml is enough
        └── PostgreSQL, EMQX, VictoriaMetrics
```

---

## 6. The {Prefix}_Data/ Directory

### Purpose

Runtime persistent data that Docker volumes mount to. Always gitignored.

```
{Prefix}_Data/
├── postgresql/          # PostgreSQL data files
├── emqx/                # EMQX persistent data
├── victoriametrics/     # Time-series data
├── victorialogs/        # Log data
├── grafana/             # Dashboard state
└── npm/                 # Nginx Proxy Manager data
```

### .gitignore Entry

```
{Prefix}_Data/
```

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| `src/services/backend/` | Nested, path hell | `{Prefix}_Backend/` at root |
| Single `package.json` at root | Tight coupling, version conflicts | Per-service `package.json` |
| Single `docker-compose.yml` | Monolithic, can't restart independently | Per-service compose |
| `common/` or `lib/` at root | Unclear ownership | `shared-types/` with clear scope |
| npm workspaces for everything | Over-engineering for most IoT projects | tsconfig paths are simpler |
| Putting docs inside a service | Docs belong to the project, not a service | `SystemDesign/` at root |
| No CLAUDE.md | AI agents have no context | Always create CLAUDE.md first |

---

> **Rule:** `ls` at the project root should show every service, every infra component, and every shared resource -- nothing hidden in subdirectories.
